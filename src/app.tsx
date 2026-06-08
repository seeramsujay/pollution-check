import { useState } from 'preact/hooks';
import { useCarbonStore } from './store/carbonStore';
import { FinancialParser } from './components/FinancialParser';
import { TakeoutParser } from './components/TakeoutParser';
import { VisionAuditor } from './components/VisionAuditor';
import { DigitalTracker } from './components/DigitalTracker';

export function App() {
  const events = useCarbonStore((state) => state.events);
  const dailyBudget = useCarbonStore((state) => state.dailyBudget);
  const addEvent = useCarbonStore((state) => state.addEvent);
  const removeEvent = useCarbonStore((state) => state.removeEvent);
  const clearStore = useCarbonStore((state) => state.clearStore);
  const getDailyTotal = useCarbonStore((state) => state.getDailyTotal);

  const [activeTab, setActiveTab] = useState<'financial' | 'takeout' | 'vision' | 'digital'>('financial');

  const spentToday = getDailyTotal();
  const remaining = Math.max(0, dailyBudget - spentToday);
  const percentUsed = Math.min(100, (spentToday / dailyBudget) * 100);

  // Group emissions by category for stats
  const categoryBreakdown = events.reduce((acc, evt) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const isToday = new Date(evt.timestamp).setHours(0, 0, 0, 0) === today;
    if (isToday) {
      acc[evt.category] = (acc[evt.category] || 0) + evt.totalCo2e;
    }
    return acc;
  }, {} as Record<string, number>);

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'groceries':
      case 'beef':
      case 'lamb':
      case 'cheese':
      case 'pork':
      case 'poultry':
      case 'rice':
      case 'avocados':
      case 'bread':
      case 'peas':
      case 'milk':
      case 'vegetables':
        return 'emerald';
      case 'dining out':
        return 'amber';
      case 'transport':
      case 'transport (fuel)':
      case 'ride sharing':
      case 'aviation travel':
        return 'blue';
      case 'digital services':
        return 'indigo';
      default:
        return 'slate';
    }
  };

  const loadSampleData = () => {
    clearStore();

    // Trader Joes Transaction
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now() - 3600000 * 1.5,
      source: 'financial',
      category: 'Groceries',
      description: 'Trader Joes Store #541',
      rawQuantity: 25.00,
      rawUnit: 'usd',
      co2eIntensity: 0.35,
      metadata: { merchant: 'traderjoes', mcc: '5411' }
    });

    // Train Travel
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now() - 3600000 * 3,
      source: 'digital',
      category: 'Transport',
      description: 'Travel: IN_TRAIN',
      rawQuantity: 45.0,
      rawUnit: 'kg', // mapping raw km to kg/unit representation
      co2eIntensity: 0.03546,
      metadata: { apiRoute: 'takeout-parser' }
    });

    // Video Streaming
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now() - 3600000 * 5,
      source: 'digital',
      category: 'Digital Services',
      description: '4K Video Streaming (2 hours)',
      rawQuantity: 2,
      rawUnit: 'hours',
      co2eIntensity: 0.16,
      metadata: { apiRoute: 'digital-tracker' }
    });

    // Yesterday's Ribeye steak (won't count in today's 15kg budget but remains in ledger)
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now() - 3600000 * 25,
      source: 'vision',
      category: 'beef',
      description: 'Local Butcher Steak',
      rawQuantity: 0.3,
      rawUnit: 'kg',
      co2eIntensity: 60.0,
      metadata: { confidenceScore: 0.94 }
    });
  };

  const getProgressBarColor = () => {
    if (spentToday < 10) return 'from-emerald-500 to-teal-400';
    if (spentToday <= dailyBudget) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-red-650';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100 m-0">
                EcoPulse
              </h1>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase font-bold m-0">
                Universal Carbon Auditor
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-all"
            >
              📥 Load Sample Data
            </button>
            <button
              onClick={clearStore}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/10 hover:bg-rose-950/20 border border-rose-900/35 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        
        {/* Dashboard Core Gauge */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Metric Status */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500">
                  Daily Carbon Expenditure
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl md:text-5xl font-black transition-colors ${spentToday > dailyBudget ? 'text-rose-450' : 'text-slate-100'}`}>
                    {spentToday.toFixed(2)}
                  </span>
                  <span className="text-slate-400 font-medium">kg CO2e</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getProgressBarColor()} transition-all duration-500 ease-out`}
                    style={{ width: `${percentUsed}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>0 kg</span>
                  <span className="font-semibold text-slate-400">Target Ceiling: {dailyBudget} kg</span>
                </div>
              </div>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">
                  Remaining
                </span>
                <span className={`text-xl font-bold mt-1 block ${remaining === 0 ? 'text-rose-450' : 'text-emerald-400'}`}>
                  {remaining.toFixed(2)} kg
                </span>
              </div>
              <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">
                  Ingested Events
                </span>
                <span className="text-xl font-bold text-slate-200 mt-1 block">
                  {events.length}
                </span>
              </div>
            </div>

          </div>

          {/* Category Mini-Bars */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800/40">
              <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 mb-3">
                Today's Breakdown by Category
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(categoryBreakdown).map(([cat, total]) => {
                  const color = getCategoryColor(cat);
                  return (
                    <div key={cat} className="bg-slate-950/30 border border-slate-900 p-3 rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 truncate max-w-[90px]">{cat}</span>
                        <span className="font-bold text-slate-350">{total.toFixed(2)} kg</span>
                      </div>
                      <div className="h-1 w-full bg-slate-950 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full bg-${color}-400 rounded-full`}
                          style={{ width: `${Math.min(100, (total / dailyBudget) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Tabbed Ingestion Panel */}
        <section className="space-y-4">
          <div className="flex border-b border-slate-900 overflow-x-auto gap-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('financial')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'financial'
                  ? 'border-indigo-400 text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              💳 Financial CSV
            </button>
            <button
              onClick={() => setActiveTab('takeout')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'takeout'
                  ? 'border-teal-400 text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              🌍 Google Takeout
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'vision'
                  ? 'border-rose-400 text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              📸 Vision Auditor
            </button>
            <button
              onClick={() => setActiveTab('digital')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'digital'
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              💻 Digital & Manual
            </button>
          </div>

          <div className="transition-all duration-300">
            {activeTab === 'financial' && <FinancialParser />}
            {activeTab === 'takeout' && <TakeoutParser />}
            {activeTab === 'vision' && <VisionAuditor />}
            {activeTab === 'digital' && <DigitalTracker />}
          </div>
        </section>

        {/* Unified Carbon Ledger */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Environmental Ledger DB
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographically tracked personal carbon events normalized across all ingestion feeds.
              </p>
            </div>
            <span className="text-xs bg-slate-950 px-3 py-1 rounded-full border border-slate-900 text-slate-400">
              {events.length} Total Events
            </span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
              <span className="text-3xl block mb-2">🍃</span>
              <p className="text-sm text-slate-400">No events logged yet.</p>
              <p className="text-xs text-slate-650 mt-1">
                Upload location logs, statements, or click "Load Sample Data" to start.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/30 divide-y divide-slate-900">
              {events.map((evt) => {
                const color = getCategoryColor(evt.category);
                return (
                  <div key={evt.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-900/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-base">
                        {evt.source === 'financial' && '💳'}
                        {evt.source === 'digital' && '📍'}
                        {evt.source === 'vision' && '🍎'}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            {evt.description}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-${color}-500/10 text-${color}-400 border-${color}-500/20`}>
                            {evt.category}
                          </span>
                        </div>
                        <div className="text-slate-550 text-[10px]">
                          {new Date(evt.timestamp).toLocaleString()} • Intensity: {evt.co2eIntensity.toFixed(3)} kg/unit
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-black text-sm text-rose-450">
                        +{evt.totalCo2e.toFixed(3)} kg
                      </span>
                      <button
                        onClick={() => removeEvent(evt.id)}
                        className="p-1 rounded bg-slate-900 hover:bg-rose-950/30 hover:text-rose-400 border border-slate-800 text-slate-500 transition-colors"
                        title="Remove event"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 bg-slate-950/40 text-center">
        <p className="text-[11px] text-slate-600">
          EcoPulse Carbon Auditor • Privacy First • Runs 100% Client-Side.
        </p>
      </footer>
    </div>
  );
}
