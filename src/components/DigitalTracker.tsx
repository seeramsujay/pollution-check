import { useState } from 'preact/hooks';
import { useCarbonStore } from '../store/carbonStore';

// Constants from the blueprint
const DIGITAL_FACTORS = [
  { id: 'mobile-data', name: 'Mobile Network Data', unit: 'gb', intensity: 0.07125, category: 'Digital Services', desc: 'Cellular network data usage (IEA baseline)' },
  { id: 'broadband-data', name: 'Broadband Network Data', unit: 'gb', intensity: 0.0095, category: 'Digital Services', desc: 'Wi-Fi/Ethernet data transfer (CCF baseline)' },
  { id: '4k-stream', name: '4K Video Streaming', unit: 'hours', intensity: 0.16, category: 'Digital Services', desc: 'Active hardware and UHD network streaming' },
  { id: 'hd-conference', name: 'Video Conferencing (HD)', unit: 'hours', intensity: 0.0544, category: 'Digital Services', desc: 'Bidirectional processing and platform host energy' }
];

export function DigitalTracker() {
  const addEvent = useCarbonStore((state) => state.addEvent);
  const [selectedActivity, setSelectedActivity] = useState(DIGITAL_FACTORS[0].id);
  const [quantity, setQuantity] = useState<number>(1);
  
  // Custom manual logging state
  const [customDesc, setCustomDesc] = useState('');
  const [customCo2e, setCustomCo2e] = useState<number | ''>('');
  const [customCategory, setCustomCategory] = useState('Groceries');

  const handleAddDigital = () => {
    const activity = DIGITAL_FACTORS.find(a => a.id === selectedActivity);
    if (!activity || quantity <= 0) return;

    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source: 'digital',
      category: activity.category,
      description: `${activity.name} (${quantity} ${activity.unit})`,
      rawQuantity: quantity,
      rawUnit: activity.unit as any,
      co2eIntensity: activity.intensity,
      metadata: {
        networkType: activity.id.includes('mobile') ? 'cellular' : 'wifi',
        apiRoute: 'digital-tracker'
      }
    });

    setQuantity(1);
  };

  const handleAddCustom = () => {
    if (!customDesc.trim() || customCo2e === '' || customCo2e < 0) return;

    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source: 'digital', // Manual inputs categorized as digital/behavioral telemetry
      category: customCategory,
      description: customDesc,
      rawQuantity: 1,
      rawUnit: 'kg',
      co2eIntensity: Number(customCo2e),
      metadata: {
        apiRoute: 'manual-input'
      }
    });

    setCustomDesc('');
    setCustomCo2e('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Digital Ingestion Section */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl transition-all duration-300">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            💻
          </span>
          Digital Footprint Auditor
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Estimate emissions from network overhead, video calls, and cloud streaming.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Digital Activity
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity((e.target as HTMLSelectElement).value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {DIGITAL_FACTORS.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name} ({act.intensity.toFixed(4)} kg CO2e/{act.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quantity ({DIGITAL_FACTORS.find(a => a.id === selectedActivity)?.unit})
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat((e.target as HTMLInputElement).value) || 0)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddDigital}
                disabled={quantity <= 0}
                className="w-full py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-semibold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Log Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Manual Logging Section */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl transition-all duration-300">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            ✍️
          </span>
          Manual carbon logger
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Quick-log events or choices (meals, commutes) that bypass automated files.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory((e.target as HTMLSelectElement).value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Groceries">Groceries</option>
                <option value="Dining Out">Dining Out</option>
                <option value="Transport">Transport</option>
                <option value="Digital Services">Digital Services</option>
                <option value="Retail Operations">Retail Operations</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                CO2e (kg)
              </label>
              <input
                type="number"
                placeholder="e.g. 2.5"
                min="0"
                step="any"
                value={customCo2e}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setCustomCo2e(val === '' ? '' : parseFloat(val));
                }}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Beyond Beef Patty Meal"
                value={customDesc}
                onChange={(e) => setCustomDesc((e.target as HTMLInputElement).value)}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customDesc.trim() || customCo2e === '' || customCo2e < 0}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-350 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-semibold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
