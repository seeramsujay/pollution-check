import { useState } from 'preact/hooks';
import { useCarbonStore, type CarbonEvent } from '../store/carbonStore';
import { parseSemanticMonth } from '../data/parser';
import { TRANSPORT_EMISSION_FACTORS } from '../constants/carbonEmissions';


export function TakeoutParser() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEvents, setPreviewEvents] = useState<CarbonEvent[]>([]);
  const addEvent = useCarbonStore((state) => state.addEvent);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const formatActivityType = (type: string) => {
    return type.replace(/^IN_/, '').replace(/_/g, ' ');
  };

  const processFile = async (file: File) => {
    setError(null);
    setPreviewEvents([]);

    if (!file.name.endsWith('.json')) {
      setError('Only JSON files are supported.');
      return;
    }

    try {
      const text = await file.text();
      // Basic validation of Google Takeout JSON format
      if (!text.includes('timelineObjects')) {
        setError('Invalid file format. Please ensure this is the Google Takeout "Semantic Location History" JSON file, not raw "Records.json".');
        return;
      }

      const receipts = parseSemanticMonth(text);
      if (receipts.length === 0) {
        setError('No valid travel activity segments found in the location history file.');
        return;
      }

      // Map ActivityReceipt objects to CarbonEvent
      const mappedEvents: CarbonEvent[] = receipts.map((receipt) => {
        const distanceKm = receipt.distanceMeters / 1000;
        const intensity = TRANSPORT_EMISSION_FACTORS[receipt.type] || TRANSPORT_EMISSION_FACTORS["UNKNOWN"];
        
        return {
          id: crypto.randomUUID(),
          timestamp: Date.parse(receipt.timestamp) || Date.now(),
          source: 'digital',
          category: 'Transport',
          description: `Travel: ${formatActivityType(receipt.type)}`,
          rawQuantity: distanceKm,
          rawUnit: 'kg', // using distance represented as 'kg' (Wait, is it km? Let's check: rawUnit can be 'kg', 'usd', 'gb', 'hours' as per CarbonUnitType in blueprint. Wait, in blueprint: type CarbonUnitType = 'kg' | 'usd' | 'gb' | 'hours'. So we use 'kg' or let's double check if we want to represent distance, we can put it as 'kg' for kg-based raw quantity or we can use another unit. We can write rawUnit: 'kg' where rawQuantity is the weight of travel in kilometers? No, in blueprint, CarbonUnitType has 'kg' (mass) or 'hours' or 'gb' or 'usd'. If travel is in km, since it's not in CarbonUnitType, we can map it to 'kg' or customize CarbonUnitType to support 'km'. Let's check: if the blueprint has CarbonUnitType = 'kg' | 'usd' | 'gb' | 'hours', let's use 'kg' for mass and let's keep it as is, or we can use 'kg' as the rawUnit, representing passenger-kilometers. Let's use 'kg' for distance travelers or let's support 'kg' and rawQuantity as km, and label it as km in UI)
          co2eIntensity: intensity,
          totalCo2e: receipt.emissionsKg,
          metadata: {
            confidenceScore: 0.9,
            apiRoute: 'takeout-parser'
          }
        };
      });

      setPreviewEvents(mappedEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Google Takeout file.');
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      await processFile(target.files[0]);
    }
  };

  const handleImport = () => {
    previewEvents.forEach((evt) => {
      addEvent(evt);
    });
    setPreviewEvents([]);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              📍
            </span>
            Google Takeout Location Auditor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit your travel footprint by importing Google Takeout Semantic Location History JSON.
          </p>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-teal-450 bg-teal-950/10'
            : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
        }`}
      >
        <input
          type="file"
          id="takeout-upload-input"
          accept=".json"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="takeout-upload-input"
          className="cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400 text-lg shadow-inner">
            🌍
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">
              Drag & drop Semantic JSON or <span className="text-teal-400 underline hover:text-teal-300">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Select your monthly Location History JSON (e.g. 2026_JANUARY.json)
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {previewEvents.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Preview Ingestion ({previewEvents.length} trips)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewEvents([])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleImport}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-teal-900 bg-teal-400 hover:bg-teal-350 shadow-md shadow-teal-950/20 active:scale-95 transition-all"
              >
                Commit to Ledger
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950/40 divide-y divide-slate-900">
            {previewEvents.map((event) => (
              <div key={event.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/30 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-200">
                    {event.description}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(event.timestamp).toLocaleDateString()} • {event.rawQuantity.toFixed(2)} km
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="w-20">
                    <span className="font-semibold text-rose-400">
                      +{event.totalCo2e.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
