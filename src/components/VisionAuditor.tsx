import { useState } from 'preact/hooks';
import { useCarbonStore } from '../store/carbonStore';
import { compressImage } from '../utils/imageCompressor';
import { VISION_CARBON_DICT } from '../constants/carbonEmissions';

export function VisionAuditor() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const addEvent = useCarbonStore((state) => state.addEvent);

  const handleImageUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const rawFile = target.files[0];
    
    // Create image preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(rawFile);

    setLoading(true);
    setStatus('Compressing receipt image...');
    setParsedItems([]);
    setIsMock(false);

    try {
      // Native Canvas compression: scales down base64 payload
      const base64Compressed = await compressImage(rawFile);
      
      setStatus('Sending base64 payload to Edge Proxy...');
      
      let response;
      try {
        response = await fetch('https://edge-proxy.ecopulse.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagePayload: base64Compressed,
            systemPrompt: 'Return a JSON array of items mapped to food categories.'
          })
        });
      } catch (networkErr) {
        console.warn('Edge Proxy unreachable. Falling back to client-side mock parser.');
      }

      if (response && response.ok) {
        const result = await response.json() as {
          data: Array<{ category: string; item: string; quantity_kg: number }>;
          tokensConsumed: number;
          carbonCostMicroGrams: number;
        };

        setStatus('Edge Proxy response received. Normalizing events...');
        processVisionResults(result.data, result.tokensConsumed, result.carbonCostMicroGrams, false);
      } else {
        setStatus('Edge Proxy offline. Simulating client-side OCR parsing...');
        await runMockSimulation();
      }
    } catch (err) {
      console.error('Error executing visual audit:', err);
      setStatus('Ingestion failed. Executing mock simulation...');
      await runMockSimulation();
    } finally {
      setLoading(false);
    }
  };

  const runMockSimulation = async () => {
    // Simulate OCR processing latency (1.8s)
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const mockData = [
      { category: 'beef', item: 'Organic Ribeye Steak', quantity_kg: 0.35 },
      { category: 'vegetables', item: 'Fresh Broccoli & Tomatoes', quantity_kg: 1.2 },
      { category: 'milk', item: 'Whole Milk 1 Gallon', quantity_kg: 3.8 },
      { category: 'bread', item: 'Sourdough Loaf', quantity_kg: 0.5 }
    ];

    const mockTokens = 850; 
    const mockCarbonUg = 432; 

    processVisionResults(mockData, mockTokens, mockCarbonUg, true);
  };

  const processVisionResults = (
    data: Array<{ category: string; item: string; quantity_kg: number }>,
    tokensConsumed: number,
    carbonCostMicroGrams: number,
    usingMock: boolean
  ) => {
    data.forEach((foodItem) => {
      const intensity = VISION_CARBON_DICT[foodItem.category] || 0.5;
      addEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'vision',
        category: foodItem.category,
        description: foodItem.item,
        rawQuantity: foodItem.quantity_kg,
        rawUnit: 'kg',
        co2eIntensity: intensity,
        metadata: {
          confidenceScore: usingMock ? 0.95 : 0.92,
          tokensConsumed: tokensConsumed
        }
      });
    });

    const aiEmissionsKg = carbonCostMicroGrams / 1e9;
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source: 'digital',
      category: 'Digital Services',
      description: `OpenAI Vision Query [gpt-4o-mini]${usingMock ? ' (Simulated)' : ''}`,
      rawQuantity: tokensConsumed,
      rawUnit: 'hours',
      co2eIntensity: aiEmissionsKg / tokensConsumed,
      metadata: {
        tokensConsumed: tokensConsumed,
        apiRoute: 'gpt-4o-mini-vision'
      }
    });

    setIsMock(usingMock);
    setParsedItems(data);
    setStatus(usingMock ? 'Mock parsing complete!' : 'Edge processing complete!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle bg-surface-elevated">
      
      {/* Left panel: Image capture split */}
      <div className="p-8 flex flex-col justify-between min-h-[400px] relative">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-1.5 rounded bg-primary/10 text-primary-fixed-dim">
              <span className="material-symbols-outlined text-[20px]">camera_enhance</span>
            </span>
            <h3 className="font-headline-md text-headline-md font-bold text-primary">Capture Canvas</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Upload grocery receipts. The app downscales the image client-side to preserve network bandwidth and parses food items.
          </p>
        </div>

        {/* Upload Sandbox */}
        <div className="flex-1 flex flex-col items-center justify-center relative border border-dashed border-outline-variant rounded-xl bg-surface-container/20 p-6 overflow-hidden min-h-[220px]">
          {imagePreview ? (
            <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
              <img src={imagePreview} alt="Receipt preview" className="max-h-[240px] rounded object-contain opacity-70" />
              {loading && (
                <>
                  <div className="animate-scan-line"></div>
                  <div className="absolute inset-0 bg-surface-base/40 flex items-center justify-center">
                    <span className="font-mono-jet text-[12px] bg-surface-container-highest px-3 py-1.5 border border-outline-variant text-primary rounded">
                      Auditing OCR...
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:text-primary mb-3">cloud_upload</span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">Snap Photo or Browse</span>
              <span className="font-label-sm text-[10px] text-on-surface-variant mt-1">Accepts JPEG/PNG up to 12MB</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={loading} className="hidden" />
            </label>
          )}
        </div>

        {status && (
          <div className="mt-4 p-3 bg-surface-container border border-border-subtle rounded flex items-center gap-2 text-xs font-label-sm text-on-surface-variant">
            {loading && <span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full animate-bounce"></span>}
            <span>{status}</span>
          </div>
        )}
      </div>

      {/* Right panel: Monospace parsed items */}
      <div className="p-8 flex flex-col justify-between min-h-[400px]">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">receipt</span>
              Audited Line Items
            </h3>
            {isMock && (
              <span className="font-label-sm text-[10px] bg-tertiary-container/10 border border-tertiary/20 text-tertiary-fixed-dim px-2.5 py-0.5 rounded-full">
                Simulated
              </span>
            )}
          </div>

          {parsedItems.length > 0 ? (
            <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface-container/20">
              <table className="w-full font-mono-jet text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-[11px] text-on-surface-variant border-b border-border-subtle">
                    <th className="p-3">ITEM</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3 text-right">WEIGHT</th>
                    <th className="p-3 text-right">CO₂e</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-xs">
                  {parsedItems.map((item, idx) => {
                    const intensity = VISION_CARBON_DICT[item.category] || 0.5;
                    const co2e = item.quantity_kg * intensity;
                    return (
                      <tr key={idx} className="hover:bg-surface-container/10">
                        <td className="p-3 text-on-surface font-semibold">{item.item}</td>
                        <td className="p-3 text-on-surface-variant">{item.category}</td>
                        <td className="p-3 text-right text-on-surface-variant">{item.quantity_kg.toFixed(2)} kg</td>
                        <td className="p-3 text-right text-error-flash font-bold">+{co2e.toFixed(2)} kg</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 text-on-surface-variant border border-dashed border-border-subtle rounded-xl bg-surface-container/10">
              <span className="material-symbols-outlined text-4xl mb-2">list_alt</span>
              <span className="font-label-md text-label-md">No items parsed yet</span>
              <span className="font-label-sm text-[10px] mt-1">Upload a receipt photo on the left to begin auditing.</span>
            </div>
          )}
        </div>

        {parsedItems.length > 0 && (
          <div className="mt-6 p-4 bg-success-neon/5 border border-success-neon/10 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">Total Added Footprint</span>
              <span className="font-mono-azeret text-[18px] text-success-neon font-bold">
                +{parsedItems.reduce((sum, item) => sum + (item.quantity_kg * (VISION_CARBON_DICT[item.category] || 0.5)), 0).toFixed(2)} kg CO₂e
              </span>
            </div>
            <button 
              onClick={() => {
                setParsedItems([]);
                setImagePreview(null);
                setStatus('Events successfully ledgered.');
              }}
              className="px-5 py-2.5 bg-success-neon text-surface-base font-label-md text-label-md font-bold hover:opacity-90 transition-all rounded cursor-pointer"
            >
              Commit Ledger
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
