import { useState } from 'preact/hooks';
import { useCarbonStore } from '../store/carbonStore';

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
      source: 'digital',
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
      <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 transition-all duration-300">
        <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 mb-2 font-bold">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary-fixed-dim">
            <span className="material-symbols-outlined text-[20px]">devices</span>
          </span>
          Digital Footprint Auditor
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
          Estimate emissions from network overhead, video calls, and cloud streaming.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Select Digital Activity
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity((e.target as HTMLSelectElement).value)}
              className="w-full rounded bg-surface-container border border-border-subtle px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
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
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Quantity ({DIGITAL_FACTORS.find(a => a.id === selectedActivity)?.unit})
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat((e.target as HTMLInputElement).value) || 0)}
                className="w-full rounded bg-surface-container-lowest border border-border-subtle px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddDigital}
                disabled={quantity <= 0}
                className="w-full py-2 bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary-fixed font-bold text-xs rounded transition-all cursor-pointer"
              >
                Log Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Manual Logging Section */}
      <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 transition-all duration-300">
        <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 mb-2 font-bold">
          <span className="p-1.5 rounded-lg bg-tertiary-container/10 text-tertiary-fixed-dim">
            <span className="material-symbols-outlined text-[20px]">edit_note</span>
          </span>
          Manual Carbon Logger
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
          Quick-log events or choices (meals, commutes) that bypass automated files.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory((e.target as HTMLSelectElement).value)}
                className="w-full rounded bg-surface-container border border-border-subtle px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="Groceries">Groceries</option>
                <option value="Dining Out">Dining Out</option>
                <option value="Transport">Transport</option>
                <option value="Digital Services">Digital Services</option>
                <option value="Retail Operations">Retail Operations</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
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
                className="w-full rounded bg-surface-container-lowest border border-border-subtle px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Description
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Beyond Beef Patty Meal"
                value={customDesc}
                onChange={(e) => setCustomDesc((e.target as HTMLInputElement).value)}
                className="flex-1 rounded bg-surface-container-lowest border border-border-subtle px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customDesc.trim() || customCo2e === '' || customCo2e < 0}
                className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary-fixed font-bold text-xs rounded transition-all cursor-pointer"
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
