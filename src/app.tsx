import { useState, useEffect } from 'preact/hooks';
import { useCarbonStore } from './store/carbonStore';
import { FinancialParser } from './components/FinancialParser';
import { TakeoutParser } from './components/TakeoutParser';
import { VisionAuditor } from './components/VisionAuditor';
import { DigitalTracker } from './components/DigitalTracker';
import { Assistant } from './components/Assistant';

export function App() {
  const events = useCarbonStore((state) => state.events);
  const dailyBudget = useCarbonStore((state) => state.dailyBudget);
  const addEvent = useCarbonStore((state) => state.addEvent);
  const clearStore = useCarbonStore((state) => state.clearStore);
  const getDailyTotal = useCarbonStore((state) => state.getDailyTotal);

  const [activeView, setActiveView] = useState<'overview' | 'upload' | 'receipt-parser' | 'history'>('overview');
  const [activeUploader, setActiveUploader] = useState<'none' | 'location' | 'bank' | 'digital'>('none');
  const [darkMode, setDarkMode] = useState(true);

  const spentToday = getDailyTotal();
  const percentUsed = Math.min(100, (spentToday / dailyBudget) * 100);

  // Group emissions by categories
  const getCategorySums = () => {
    let travel = 0;
    let food = 0;
    let finance = 0;
    let other = 0;

    events.forEach(evt => {
      const today = new Date().setHours(0, 0, 0, 0);
      const isToday = new Date(evt.timestamp).setHours(0, 0, 0, 0) === today;
      if (!isToday) return;

      const cat = evt.category.toLowerCase();
      if (['transport', 'transport (fuel)', 'ride sharing', 'aviation travel', 'travel'].includes(cat)) {
        travel += evt.totalCo2e;
      } else if (['groceries', 'dining out', 'beef', 'lamb', 'cheese', 'pork', 'poultry', 'rice', 'avocados', 'bread', 'peas', 'milk', 'vegetables', 'food'].includes(cat)) {
        food += evt.totalCo2e;
      } else if (evt.source === 'financial') {
        finance += evt.totalCo2e;
      } else {
        other += evt.totalCo2e;
      }
    });

    return { travel, food, finance, other };
  };

  const { travel, food, finance, other } = getCategorySums();
  const totalCategoryEmissions = travel + food + finance + other;

  const travelPercent = totalCategoryEmissions > 0 ? Math.round((travel / totalCategoryEmissions) * 100) : 34;
  const foodPercent = totalCategoryEmissions > 0 ? Math.round((food / totalCategoryEmissions) * 100) : 47;
  const financePercent = totalCategoryEmissions > 0 ? Math.round((finance / totalCategoryEmissions) * 100) : 19;

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
      description: 'Travel: Transit Train',
      rawQuantity: 45.0,
      rawUnit: 'kg',
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

    // Organic Ribeye Steak from Receipt scan
    addEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now() - 3600000 * 0.5,
      source: 'vision',
      category: 'beef',
      description: 'Organic Ribeye Steak',
      rawQuantity: 0.35,
      rawUnit: 'kg',
      co2eIntensity: 60.0,
      metadata: { confidenceScore: 0.95 }
    });
  };

  // Micro-interaction for the arc progress dial
  useEffect(() => {
    const arc = document.querySelector('.arc-progress') as SVGPathElement | null;
    if (arc) {
      const circumference = 351.85;
      const offset = circumference - (Math.min(100, percentUsed) / 100) * circumference;
      arc.style.strokeDashoffset = String(offset);
    }
  }, [percentUsed, activeView]);

  return (
    <div className={`min-h-screen bg-surface-base text-on-surface flex flex-col antialiased ${darkMode ? 'dark' : ''}`}>
      {/* Top Navigation Bar */}
      <header className="bg-surface border-b border-border-subtle flex justify-between items-center w-full px-gutter-desktop h-16 fixed top-0 z-50">
        <div 
          onClick={() => setActiveView('overview')}
          className="font-headline-md text-headline-md font-bold text-primary cursor-pointer hover:opacity-95 flex items-center gap-2"
        >
          <span className="text-xl">⚡</span>
          <span>EcoPulse</span>
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <button 
            onClick={() => setActiveView('history')}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
          >
            Sustainability Reports
          </button>
          <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="https://github.com/seeramsujay/pollution-check" target="_blank" rel="noopener noreferrer">
            Methodology
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-primary hover:text-primary-fixed-dim bg-transparent border-none cursor-pointer p-1"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle rounded text-xs text-primary font-label-sm cursor-pointer transition-colors"
            >
              📥 Demo Data
            </button>
            <button
              onClick={clearStore}
              className="px-3 py-1 bg-error-container/10 hover:bg-error-container/20 border border-error/20 rounded text-xs text-error font-label-sm cursor-pointer transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex flex-1 pt-16">
        
        {/* Desktop Left Side Navigation */}
        <aside className="fixed left-0 top-16 bottom-0 flex flex-col py-6 z-40 bg-surface-container border-r border-border-subtle w-[240px] hidden md:flex">
          <div className="px-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-primary-fixed-dim bg-surface-container-high flex items-center justify-center font-bold text-primary">
                EP
              </div>
              <div>
                <div className="font-headline-md text-[14px] font-bold text-primary">EcoPulse Auditor</div>
                <div className="font-label-sm text-[10px] text-on-surface-variant uppercase">Daily Budget</div>
              </div>
            </div>
          </div>
          <div className="flex-1 px-3 space-y-1">
            <button 
              onClick={() => { setActiveView('overview'); setActiveUploader('none'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'overview' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-label-md text-label-md">Overview</span>
            </button>
            <button 
              onClick={() => { setActiveView('upload'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'upload' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">publish</span>
              <span className="font-label-md text-label-md">Ingest & Upload</span>
            </button>
            <button 
              onClick={() => { setActiveView('receipt-parser'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'receipt-parser' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="font-label-md text-label-md">Receipt Auditor</span>
            </button>
            <button 
              onClick={() => { setActiveView('history'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'history' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">history</span>
              <span className="font-label-md text-label-md">Year in Review</span>
            </button>
          </div>
          <div className="px-6 mt-auto">
            <button 
              onClick={() => setActiveView('history')}
              className="w-full py-3 bg-primary text-on-primary-container font-label-md text-label-md rounded hover:opacity-90 transition-all font-bold cursor-pointer"
            >
              Generate Report
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-0 md:ml-[240px] overflow-y-auto bg-surface-base p-gutter-desktop pb-24 md:pb-12">
          <div className="max-w-container-max mx-auto space-y-6">
            
            {/* VIEW 1: OVERVIEW DASHBOARD */}
            {activeView === 'overview' && (
              <>
                {/* Hero Card: Footprint Metric & Circle Gauge */}
                <section className="bg-surface-elevated border border-border-subtle rounded-xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed-dim/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">Total Carbon Footprint (Live)</p>
                      <h1 className="font-mono-azeret text-[40px] md:text-[56px] text-primary-fixed-dim leading-none font-bold">
                        {spentToday.toFixed(2)} kg CO₂e
                      </h1>
                      
                      {spentToday > 0 ? (
                        <div className={`flex items-center gap-2 mt-4 font-bold font-label-md text-label-md ${spentToday <= dailyBudget ? 'text-success-neon' : 'text-error-flash'}`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {spentToday <= dailyBudget ? 'trending_down' : 'trending_up'}
                          </span>
                          <span>
                            {spentToday <= dailyBudget 
                              ? `↓ ${(dailyBudget - spentToday).toFixed(1)} kg under daily cap` 
                              : `↑ ${(spentToday - dailyBudget).toFixed(1)} kg over daily cap!`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-4 text-on-surface-variant font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[20px]">info</span>
                          <span>No carbon events logged today. Load demo data to populate.</span>
                        </div>
                      )}
                    </div>

                    {/* Circle Progress Widget */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle className="text-surface-container-highest" cx="60" cy="60" fill="transparent" r="56" stroke="currentColor" stroke-width="8"></circle>
                        <circle className="text-primary-fixed-dim arc-progress" cx="60" cy="60" fill="transparent" r="56" stroke="currentColor" stroke-dasharray="351.85" stroke-dashoffset="351.85" stroke-width="8" stroke-linecap="round"></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-headline-md text-headline-md text-primary font-bold">{Math.round(percentUsed)}%</span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant">BUDGET</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between font-label-md text-label-md">
                      <span className="text-on-surface-variant">Daily Budget Utilization</span>
                      <span className="text-on-surface">{dailyBudget.toFixed(1)} kg Cap</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden p-[1px]">
                      <div className="h-full budget-gradient rounded-full transition-all duration-500" style={{ width: `${percentUsed}%` }}></div>
                    </div>
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <span>0 kg</span>
                      <span>{ (dailyBudget / 2).toFixed(1) } kg (Ideal)</span>
                      <span>{dailyBudget.toFixed(0)} kg</span>
                    </div>
                  </div>
                </section>

                {/* Bento Grid: Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Travel Card */}
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 hover:border-primary-fixed-dim transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-surface-container rounded-lg text-primary">
                        <span className="material-symbols-outlined">directions_run</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{travelPercent}% of total</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-1 font-bold">Travel</h3>
                    <p className="font-mono-azeret text-[24px] text-primary font-bold">{travel.toFixed(2)} kg</p>
                    <div className="h-1 w-full bg-surface-container-highest rounded-full mt-4">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${travelPercent}%` }}></div>
                    </div>
                  </div>
                  
                  {/* Food Card */}
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 hover:border-primary-fixed-dim transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-surface-container rounded-lg text-tertiary-fixed-dim">
                        <span className="material-symbols-outlined">restaurant</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{foodPercent}% of total</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-1 font-bold">Food</h3>
                    <p className="font-mono-azeret text-[24px] text-tertiary-fixed-dim font-bold">{food.toFixed(2)} kg</p>
                    <div className="h-1 w-full bg-surface-container-highest rounded-full mt-4">
                      <div className="h-full bg-tertiary-fixed-dim rounded-full transition-all duration-500" style={{ width: `${foodPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Finance Card */}
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 hover:border-primary-fixed-dim transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-surface-container rounded-lg text-secondary-fixed-dim">
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{financePercent}% of total</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-1 font-bold">Finance</h3>
                    <p className="font-mono-azeret text-[24px] text-secondary-fixed-dim font-bold">{finance.toFixed(2)} kg</p>
                    <div className="h-1 w-full bg-surface-container-highest rounded-full mt-4">
                      <div className="h-full bg-secondary-fixed-dim rounded-full transition-all duration-500" style={{ width: `${financePercent}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Audit Insight Strip */}
                <div className="bg-surface-container-low border border-success-neon/20 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
                  <div className="bg-success-neon/10 p-2 rounded-full border border-success-neon/10">
                    <span className="material-symbols-outlined text-success-neon">lightbulb</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface text-sm">
                      <span className="font-bold text-success-neon">Audit Insight:</span>{' '}
                      {spentToday > dailyBudget 
                        ? `You are exceeding the global cap by ${(spentToday - dailyBudget).toFixed(2)} kg. Swapping out a single high-impact item using the local assistant below will lower your score.`
                        : `Your current carbon trajectory is 12% lower than the regional baseline. Avoiding high-intensity foods today keeps you in the top tier.`}
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveView('history')}
                    className="font-label-md text-label-md text-success-neon hover:underline cursor-pointer bg-transparent border-none"
                  >
                    View Action Plan
                  </button>
                </div>

                {/* Carbon Velocity Graph (Interactive Bar Chart) */}
                <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 h-64 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline-md text-headline-md font-bold">Carbon Velocity</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-surface-container text-on-surface-variant font-label-sm text-label-sm rounded border border-border-subtle">7 Days</span>
                      <span className="px-3 py-1 bg-primary text-on-primary-fixed font-label-sm text-label-sm rounded">30 Days</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full relative">
                    <div className="absolute inset-0 flex items-end justify-between px-4 pb-2">
                      {/* Simulated Chart Bars with tooltips */}
                      {[
                        { height: 'h-[40%]', label: 'D-9', val: '6.0 kg' },
                        { height: 'h-[60%]', label: 'D-8', val: '9.0 kg' },
                        { height: 'h-[80%]', label: 'D-7', val: '12.0 kg', active: true },
                        { height: 'h-[45%]', label: 'D-6', val: '6.7 kg' },
                        { height: 'h-[30%]', label: 'D-5', val: '4.5 kg' },
                        { height: 'h-[55%]', label: 'D-4', val: '8.2 kg' },
                        { height: 'h-[90%]', label: 'D-3', val: '13.5 kg' },
                        { height: 'h-[40%]', label: 'D-2', val: '6.0 kg' },
                        { height: 'h-[60%]', label: 'D-1', val: '9.0 kg' },
                        { height: `h-[${Math.round(percentUsed)}%]`, label: 'Today', val: `${spentToday.toFixed(1)} kg`, active: true, live: true }
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer mx-1 h-full justify-end">
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-surface-container-highest text-primary border border-outline-variant rounded px-2 py-0.5 text-[10px] font-label-sm pointer-events-none transition-all z-10 whitespace-nowrap shadow-xl">
                            {bar.val}
                          </div>
                          <div 
                            className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${
                              bar.live 
                                ? 'bg-primary-fixed-dim shadow-[0_-4px_12px_rgba(0,219,233,0.2)]'
                                : bar.active 
                                  ? 'bg-primary' 
                                  : 'bg-surface-container-highest hover:bg-primary-fixed-dim'
                            }`}
                            style={{ height: bar.live ? `${percentUsed}%` : bar.height.replace('h-[', '').replace(']', '') }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Context-Aware Assistant Section */}
                <section className="mt-8">
                  <Assistant />
                </section>
              </>
            )}

            {/* VIEW 2: INGEST & UPLOAD */}
            {activeView === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary font-bold">Data Ingest Portal</h2>
                  <p className="font-body-md text-on-surface-variant text-sm mt-1">
                    Select an ingestion feed to parse digital artifacts locally. All calculations run client-side to safeguard your privacy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Location Card */}
                  <div 
                    onClick={() => setActiveUploader(activeUploader === 'location' ? 'none' : 'location')}
                    className={`upload-dashed group transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] rounded-xl bg-surface-container/20 border border-transparent ${
                      activeUploader === 'location' ? 'border-primary-fixed-dim bg-primary/5' : 'hover:bg-surface-container/30'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-6 border border-border-subtle group-hover:border-primary-fixed-dim transition-colors">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">location_on</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-2 font-bold">Location History</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 px-4">
                      Import Google Takeout Semantic Location History JSON.
                    </p>
                    <button className="font-label-md text-label-md border border-primary text-primary px-6 py-2 hover:bg-primary hover:text-surface-base transition-all">
                      {activeUploader === 'location' ? 'Close Panel' : 'Open Auditor'}
                    </button>
                  </div>

                  {/* Bank CSV Card */}
                  <div 
                    onClick={() => setActiveUploader(activeUploader === 'bank' ? 'none' : 'bank')}
                    className={`upload-dashed group transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] rounded-xl bg-surface-container/20 border border-transparent ${
                      activeUploader === 'bank' ? 'border-primary-fixed-dim bg-primary/5' : 'hover:bg-surface-container/30'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-6 border border-border-subtle group-hover:border-primary-fixed-dim transition-colors">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">account_balance</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-2 font-bold">Bank Statement</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 px-4">
                      CSV bank export. Matches transactions to category carbon indexes.
                    </p>
                    <button className="font-label-md text-label-md border border-primary text-primary px-6 py-2 hover:bg-primary hover:text-surface-base transition-all">
                      {activeUploader === 'bank' ? 'Close Panel' : 'Open Auditor'}
                    </button>
                  </div>

                  {/* Digital & Manual Card */}
                  <div 
                    onClick={() => setActiveUploader(activeUploader === 'digital' ? 'none' : 'digital')}
                    className={`upload-dashed group transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] rounded-xl bg-surface-container/20 border border-transparent ${
                      activeUploader === 'digital' ? 'border-primary-fixed-dim bg-primary/5' : 'hover:bg-surface-container/30'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-6 border border-border-subtle group-hover:border-primary-fixed-dim transition-colors">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">laptop_mac</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-2 font-bold">Digital & Manual</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 px-4">
                      Calculate streaming outputs and log manual carbon entries.
                    </p>
                    <button className="font-label-md text-label-md border border-primary text-primary px-6 py-2 hover:bg-primary hover:text-surface-base transition-all">
                      {activeUploader === 'digital' ? 'Close Panel' : 'Open Auditor'}
                    </button>
                  </div>
                </div>

                {/* Subpanel display for active ingest parser */}
                {activeUploader !== 'none' && (
                  <div className="mt-8 pt-4 border-t border-border-subtle transition-all duration-300">
                    {activeUploader === 'location' && <TakeoutParser />}
                    {activeUploader === 'bank' && <FinancialParser />}
                    {activeUploader === 'digital' && <DigitalTracker />}
                  </div>
                )}

                {/* Local computing disclaimer */}
                <div className="relative w-full rounded-xl overflow-hidden border border-border-subtle bg-surface-container/10 p-8 flex items-center gap-6 mt-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                    <span className="material-symbols-outlined text-2xl">shield_lock</span>
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-primary">WASM Local Compute Sandbox</h3>
                    <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                      EcoPulse does not upload files to cloud datastores. Location JSONs, statement CSVs, and data streams are analyzed strictly within sandbox memory, keeping files confidential and offline.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: RECEIPT SPLIT PANEL AUDITOR */}
            {activeView === 'receipt-parser' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Split-Screen Receipt Auditor</h2>
                    <p className="font-body-md text-on-surface-variant text-sm mt-1">
                      Upload photo scans. Compresses image client-side to downscale payload and routes it for OCR.
                    </p>
                  </div>
                </div>

                <div className="bg-surface-elevated border border-border-subtle rounded-xl overflow-hidden shadow-2xl">
                  {/* Render the full VisionAuditor UI here directly */}
                  <VisionAuditor />
                </div>
              </div>
            )}

            {/* VIEW 4: HISTORY / YEAR IN REVIEW */}
            {activeView === 'history' && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-syne text-[40px] md:text-[56px] leading-[1] font-bold text-primary mb-2 uppercase tracking-tight">
                    Your 2024 Carbon Ledger
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                    A definitive audit of your ecological footprint across the last twelve fiscal months.
                  </p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-12 gap-6 auto-rows-auto md:auto-rows-[240px]">
                  
                  {/* 12-Month Bar Chart */}
                  <div className="col-span-12 lg:col-span-8 row-span-2 bg-surface-elevated border border-border-subtle p-8 rounded-xl flex flex-col justify-between min-h-[350px] md:min-h-0">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined">analytics</span>
                        Monthly Intensity
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                          <span className="w-3 h-3 rounded-full bg-success-neon"></span> Target
                        </span>
                        <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                          <span className="w-3 h-3 rounded-full bg-error-flash"></span> Overdrive
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                      {[
                        { h: '45%', month: 'JAN', color: 'bg-success-neon' },
                        { h: '52%', month: 'FEB', color: 'bg-[#8AFF33]' },
                        { h: '58%', month: 'MAR', color: 'bg-[#B2FF33]' },
                        { h: '38%', month: 'APR', color: 'bg-success-neon shadow-[0_0_15px_rgba(57,255,20,0.3)]', active: true },
                        { h: '65%', month: 'MAY', color: 'bg-[#E0FF33]' },
                        { h: '72%', month: 'JUN', color: 'bg-[#FFF333]' },
                        { h: '80%', month: 'JUL', color: 'bg-[#FFD433]' },
                        { h: '75%', month: 'AUG', color: 'bg-[#FFAE33]' },
                        { h: '85%', month: 'SEP', color: 'bg-[#FF8833]' },
                        { h: '88%', month: 'OCT', color: 'bg-[#FF6233]' },
                        { h: '92%', month: 'NOV', color: 'bg-[#FF4533]' },
                        { h: '100%', month: 'DEC', color: 'bg-error-flash shadow-[0_0_15px_rgba(255,49,49,0.3)]', active: true }
                      ].map((bar, i) => (
                        <div key={i} className={`group relative flex-1 flex flex-col justify-end h-full transition-transform ${bar.active ? 'scale-105' : ''}`}>
                          <div 
                            className={`w-full opacity-80 group-hover:opacity-100 rounded-t-sm transition-all duration-700 ${bar.color}`}
                            style={{ height: bar.h }}
                          ></div>
                          <p className={`font-label-sm text-[10px] text-center mt-3 ${bar.active ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                            {bar.month}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Best/Worst Badges */}
                  <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-1 bg-surface-elevated border border-border-subtle p-6 rounded-xl flex items-center justify-between border-l-4 border-l-success-neon">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Optimal Period</span>
                      <h4 className="font-headline-md text-headline-md text-success-neon font-bold text-lg">April 2024</h4>
                      <p className="font-mono-azeret text-[13px] text-on-surface-variant mt-2">Emission: <span class="text-success-neon">0.84t</span> CO2e</p>
                    </div>
                    <div className="bg-success-neon/10 p-3 rounded-full text-success-neon">
                      <span className="material-symbols-outlined text-2xl">eco</span>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-1 bg-surface-elevated border border-border-subtle p-6 rounded-xl flex items-center justify-between border-l-4 border-l-error-flash">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Intensity Peak</span>
                      <h4 className="font-headline-md text-headline-md text-error-flash font-bold text-lg">December 2024</h4>
                      <p className="font-mono-azeret text-[13px] text-on-surface-variant mt-2">Emission: <span class="text-error-flash">4.12t</span> CO2e</p>
                    </div>
                    <div className="bg-error-flash/10 p-3 rounded-full text-error-flash">
                      <span className="material-symbols-outlined text-2xl">warning</span>
                    </div>
                  </div>

                  {/* Donut Chart & Category Breakdown */}
                  <div className="col-span-12 lg:col-span-5 row-span-2 bg-surface-elevated border border-border-subtle p-8 rounded-xl flex flex-col justify-between min-h-[350px] md:min-h-0">
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">Asset Allocation</h3>
                    
                    <div className="flex flex-col items-center justify-center flex-1 my-4">
                      {/* SVG Donut */}
                      <div className="relative w-44 h-44">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle className="stroke-outline-variant" cx="18" cy="18" fill="none" r="16" stroke-width="3.5"></circle>
                          <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" stroke-dasharray="45, 100" stroke-dashoffset="0" stroke-width="3.5"></circle>
                          <circle className="stroke-secondary-container" cx="18" cy="18" fill="none" r="16" stroke-dasharray="25, 100" stroke-dashoffset="-45" stroke-width="3.5"></circle>
                          <circle className="stroke-tertiary-container" cx="18" cy="18" fill="none" r="16" stroke-dasharray="20, 100" stroke-dashoffset="-70" stroke-width="3.5"></circle>
                          <circle className="stroke-on-surface-variant" cx="18" cy="18" fill="none" r="16" stroke-dasharray="10, 100" stroke-dashoffset="-90" stroke-width="3.5"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-mono-azeret text-[24px] font-bold text-primary">12.4t</span>
                          <span className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider">Annual Total</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                        <span className="text-on-surface-variant">Travel (45%)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-secondary-container"></div>
                        <span className="text-on-surface-variant">Food (25%)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></div>
                        <span className="text-on-surface-variant">Finance (20%)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-on-surface-variant"></div>
                        <span className="text-on-surface-variant">Others (10%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Audit */}
                  <div className="col-span-12 lg:col-span-7 row-span-2 bg-surface-elevated border border-border-subtle p-8 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-headline-md text-headline-md text-primary font-bold">Comparative Audit</h3>
                      <div className="px-3 py-1 bg-surface-container-highest rounded border border-outline-variant font-label-sm text-label-sm">
                        vs. 2023 Baseline
                      </div>
                    </div>

                    <div className="space-y-4 flex-1 my-2">
                      <div className="flex items-center gap-4 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant">
                        <span className="material-symbols-outlined text-success-neon text-2xl">trending_down</span>
                        <div className="flex-1">
                          <h5 className="font-body-md text-body-md font-bold text-sm">Flight Reduction</h5>
                          <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">Reduced short-haul travel by 4 trips.</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono-azeret text-[16px] text-success-neon font-bold">-2.1t</p>
                          <p className="font-label-sm text-[10px] text-on-surface-variant">Net Change</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant">
                        <span className="material-symbols-outlined text-error-flash text-2xl">trending_up</span>
                        <div className="flex-1">
                          <h5 className="font-body-md text-body-md font-bold text-sm">Data Consumption</h5>
                          <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">High-fidelity streaming and cloud compute.</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono-azeret text-[16px] text-error-flash font-bold">+0.4t</p>
                          <p className="font-label-sm text-[10px] text-on-surface-variant">Net Change</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border-subtle mt-4">
                      <div>
                        <h4 className="font-body-md text-body-md font-bold text-sm">Global Percentile</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">You are in the top 12% of sustainable carbon auditors.</p>
                      </div>
                      <button className="px-4 py-2 border border-primary text-primary font-label-md text-label-md rounded hover:bg-primary/10 transition-colors cursor-pointer">
                        View Leaderboard
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Mobile Navigation Shell (bottom bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container border-t border-border-subtle flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveView('overview')}
          className={`flex flex-col items-center bg-transparent border-none cursor-pointer ${
            activeView === 'overview' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-label-md">Overview</span>
        </button>
        <button 
          onClick={() => setActiveView('upload')}
          className={`flex flex-col items-center bg-transparent border-none cursor-pointer ${
            activeView === 'upload' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">publish</span>
          <span className="text-[10px] font-label-md">Ingest</span>
        </button>
        <button 
          onClick={() => setActiveView('receipt-parser')}
          className={`flex flex-col items-center bg-transparent border-none cursor-pointer ${
            activeView === 'receipt-parser' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="text-[10px] font-label-md">Auditor</span>
        </button>
        <button 
          onClick={() => setActiveView('history')}
          className={`flex flex-col items-center bg-transparent border-none cursor-pointer ${
            activeView === 'history' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px] font-label-md">History</span>
        </button>
      </nav>

      {/* Sticky Bottom Privacy Footer */}
      <footer className="hidden md:block w-[calc(100%-240px)] ml-[240px] py-4 border-t border-border-subtle bg-surface-container-lowest text-center">
        <div className="max-w-container-max mx-auto px-gutter-desktop flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-success-neon text-sm">security</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">All footprint calculations are processed locally. No file metadata is cached on servers.</span>
          </div>
          <div className="flex gap-4 font-label-sm text-label-sm text-on-surface-variant">
            <span>AR6 Vintage</span>
            <span>•</span>
            <span>Immutable Receipt Pattern</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
