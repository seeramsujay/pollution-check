import { useState } from 'preact/hooks';
import { useCarbonStore } from '../store/carbonStore';
import { compressImage } from '../utils/imageCompressor';
import { VISION_CARBON_DICT } from '../constants/carbonEmissions';

export function VisionAuditor() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const addEvent = useCarbonStore((state) => state.addEvent);

  const handleImageUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    setLoading(true);
    setStatus('Compressing receipt image...');
    setParsedItems([]);
    setIsMock(false);

    try {
      const rawFile = target.files[0];
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
        // Fallback directly to Mock Mode if network connection fails (e.g. proxy not deployed yet)
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
        // Fallback to Mock processing if proxy returns error
        setStatus('Edge Proxy error. Executing client-side mock simulation...');
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

    // standard prompt tokens for GPT-4o-mini image processing
    const mockTokens = 850; 
    const mockCarbonUg = 432; // 432 micro-grams of CO2e for AI inference

    processVisionResults(mockData, mockTokens, mockCarbonUg, true);
  };

  const processVisionResults = (
    data: Array<{ category: string; item: string; quantity_kg: number }>,
    tokensConsumed: number,
    carbonCostMicroGrams: number,
    usingMock: boolean
  ) => {
    // 1. Process food items
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

    // 2. Deduct AI Footprint (Convert micro-grams to kg)
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
    setStatus(usingMock ? 'Mock processing complete!' : 'Edge processing complete!');
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              📸
            </span>
            Vision-Based Receipt Auditor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture or upload a grocery receipt. The app compresses the image locally and audits item footprints.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-950/30 hover:bg-slate-950/50 hover:border-rose-950/50 cursor-pointer transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400 text-lg shadow-inner mb-2">
            📷
          </div>
          <span className="text-sm font-semibold text-slate-300">
            {loading ? 'Analyzing Receipt...' : 'Select Receipt or Snap Photo'}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Accepts JPEG, PNG up to 12MB. Compressed to &lt;200KB in browser.
          </span>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            disabled={loading} 
            className="hidden" 
          />
        </label>

        {status && (
          <div className="text-center text-xs text-slate-400 py-1 flex items-center justify-center gap-2">
            {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-rose-500"></div>}
            <span>{status}</span>
          </div>
        )}

        {parsedItems.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Audited Receipt Items {isMock && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-full ml-2">Simulated</span>}
              </h3>
            </div>
            
            <div className="border border-slate-800/80 rounded-xl bg-slate-950/40 divide-y divide-slate-900 max-h-48 overflow-y-auto">
              {parsedItems.map((item, index) => {
                const intensity = VISION_CARBON_DICT[item.category] || 0.5;
                const co2e = item.quantity_kg * intensity;
                return (
                  <div key={index} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-200">{item.item}</span>
                      <span className="text-slate-500 text-[10px]">
                        Category: {item.category} • {item.quantity_kg} kg
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-rose-400">+{co2e.toFixed(2)} kg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
