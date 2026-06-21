import { useState, useEffect } from 'preact/hooks';
import { useCarbonStore } from './store/carbonStore';
import { FinancialParser } from './components/FinancialParser';
import { TakeoutParser } from './components/TakeoutParser';
import { VisionAuditor } from './components/VisionAuditor';
import { DigitalTracker } from './components/DigitalTracker';
import { Assistant } from './components/Assistant';

/**
 * The main EcoPulse Application component.
 * Manages view routing, dark mode state, carbon budget summaries, and category grouping.
 */
export function App() {
  const events = useCarbonStore((state) => state.events);
  const dailyBudget = useCarbonStore((state) => state.dailyBudget);
  const addEvent = useCarbonStore((state) => state.addEvent);
  const clearStore = useCarbonStore((state) => state.clearStore);
  const getDailyTotal = useCarbonStore((state) => state.getDailyTotal);

  // Active view states
  const [activeView, setActiveView] = useState<'overview' | 'upload' | 'receipt-parser' | 'history'>('overview');
  const [activeUploader, setActiveUploader] = useState<'none' | 'location' | 'bank' | 'digital'>('none');
  const [darkMode, setDarkMode] = useState(true);

  // Carbon budget calculations
  const spentToday = getDailyTotal();
  const percentUsed = Math.min(100, (spentToday / dailyBudget) * 100);

  /**
   * Group and summarize daily emissions by categories (Travel, Food, Finance, Other).
   * Filter and aggregate events that occurred today.
   * 
   * @returns {{ travel: number, food: number, finance: number, other: number }}
   */
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
      // Categorize events based on their category string or source type
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

  /**
   * Seed the carbon ledger with realistic demonstration data representing various sources.
   * Clears the current store before inserting.
   */
  const loadSampleData = () => {
    clearStore();

    // 1. Trader Joe's Transaction (Financial Source)
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

    // 2. Train Travel Segment (Digital Source from Location Takeout)
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

    // 3. Video Streaming Activity (Digital Tracker Source)
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

    // 4. Organic Ribeye Steak (Vision Source from scanned receipt)
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
      <header className="glass-panel border-b border-border-subtle flex justify-between items-center w-full px-gutter-desktop h-16 fixed top-0 z-50">
        <div 
          onClick={() => setActiveView('overview')}
          className="font-serif text-[22px] font-bold text-primary cursor-pointer hover:opacity-95 flex items-center gap-2"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveView('overview')}
          aria-label="EcoPulse Home Dashboard"
        >
          <span className="text-xl" aria-hidden="true">⚡</span>
          <span>EcoPulse</span>
        </div>
        <nav className="hidden md:flex gap-8 items-center" aria-label="Main Navigation">
          <button 
            onClick={() => setActiveView('history')}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            aria-current={activeView === 'history' ? 'page' : undefined}
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
            className="text-primary hover:text-primary-fixed-dim bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
            title="Toggle theme"
            aria-label="Toggle light or dark theme"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle rounded text-xs text-primary font-label-sm cursor-pointer transition-colors"
              aria-label="Load demo carbon ledger data"
            >
              📥 Demo Data
            </button>
            <button
              onClick={clearStore}
              className="px-3 py-1 bg-error-container/10 hover:bg-error-container/20 border border-error/20 rounded text-xs text-error font-label-sm cursor-pointer transition-colors"
              aria-label="Reset all carbon ledger entries"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex flex-1 pt-16">
        
        {/* Desktop Left Side Navigation */}
        <aside className="fixed left-0 top-16 bottom-0 flex flex-col py-6 z-40 glass-panel border-r border-border-subtle w-[240px] hidden md:flex" aria-label="Sidebar Navigation">
          <div className="px-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-primary-fixed-dim bg-surface-container-high flex items-center justify-center font-bold text-primary" aria-hidden="true">
                EP
              </div>
              <div>
                <div className="font-serif text-[15px] font-bold text-primary">EcoPulse Auditor</div>
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
              aria-current={activeView === 'overview' ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
              <span className="font-label-md text-label-md">Overview</span>
            </button>
            <button 
              onClick={() => { setActiveView('upload'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'upload' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
              aria-current={activeView === 'upload' ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">publish</span>
              <span className="font-label-md text-label-md">Ingest & Upload</span>
            </button>
            <button 
              onClick={() => { setActiveView('receipt-parser'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'receipt-parser' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
              aria-current={activeView === 'receipt-parser' ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
              <span className="font-label-md text-label-md">Receipt Auditor</span>
            </button>
            <button 
              onClick={() => { setActiveView('history'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-left transition-all ${
                activeView === 'history' 
                  ? 'text-primary bg-surface-container-high border-r-2 border-primary scale-[0.98]' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
              aria-current={activeView === 'history' ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">history</span>
              <span className="font-label-md text-label-md">Year in Review</span>
            </button>
          </div>
          <div className="px-6 mt-auto">
            <button 
              onClick={() => setActiveView('history')}
              className="w-full py-3 bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-all font-bold cursor-pointer"
              aria-label="Generate sustainability report"
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
                {/* Top Section: Carbon Readiness & Live Vitals */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Carbon Readiness Index (Col 4) */}
                  <div className="lg:col-span-4">
                    <div className="bg-surface-elevated p-8 rounded-3xl border border-border-subtle flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-6 font-sans">Carbon Readiness</span>
                      
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                          <circle className="text-surface-container" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" stroke-width="6"></circle>
                          <circle className="text-primary rounded-full transition-all duration-1000" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" stroke-dasharray="502.65" stroke-dashoffset={String(502.65 - (Math.min(100, Math.max(0, 100 - percentUsed)) / 100) * 502.65)} stroke-width="12" stroke-linecap="round"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-serif text-5xl font-light">{Math.max(0, Math.round(100 - percentUsed))}</span>
                          <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1">
                            {percentUsed === 0 ? 'CLEAN' : percentUsed <= 50 ? 'OPTIMAL' : percentUsed <= 100 ? 'STABLE' : 'CRITICAL'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-8 grid grid-cols-3 gap-2 w-full">
                        <div className={`h-1.5 rounded-full ${percentUsed <= 50 ? 'bg-primary' : 'bg-primary/20'}`}></div>
                        <div className={`h-1.5 rounded-full ${percentUsed > 50 && percentUsed <= 100 ? 'bg-primary' : percentUsed <= 50 ? 'bg-primary' : 'bg-primary/20'}`}></div>
                        <div className={`h-1.5 rounded-full ${percentUsed > 100 ? 'bg-error' : 'bg-outline-variant/30'}`}></div>
                      </div>
                      
                      <p className="mt-6 text-xs text-on-surface-variant leading-relaxed font-sans">
                        {spentToday === 0 
                          ? "Your carbon ledger is currently clean. Load some data or log an event to calculate readiness."
                          : spentToday <= dailyBudget 
                            ? `Daily carbon footprint is stable. You have ${(dailyBudget - spentToday).toFixed(1)} kg CO2e remaining.`
                            : `🚨 Warning: Daily budget exceeded by ${(spentToday - dailyBudget).toFixed(1)} kg! Swap to lower impact choices.`
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Right Column: Live Ingestion Vitals (Col 8) */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase font-sans">Carbon Ingestion Vitals</h3>
                      <button 
                        onClick={() => setActiveView('upload')}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline bg-primary/5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">publish</span>
                        Ingest Portal
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vitals Card 1: Travel */}
                      <div className="bg-surface-elevated p-6 rounded-2xl border border-border-subtle flex flex-col justify-between h-44 group hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-primary">directions_run</span>
                          <span className="text-[9px] font-bold text-primary uppercase font-sans">{travelPercent}% of total</span>
                        </div>
                        <div>
                          <span className="font-serif text-4xl block text-primary">{travel.toFixed(1)}<span className="text-sm ml-1 font-sans text-on-surface-variant font-light">kg CO2e</span></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-sans">Travel Emissions</span>
                        </div>
                        <div className="w-full h-8 flex items-end gap-1 mt-2">
                          {[30, 45, 60, travelPercent > 0 ? travelPercent : 35, 20].map((h, idx) => (
                            <div key={idx} className="flex-1 bg-primary rounded-t-sm" style={{ height: `${h}%`, opacity: idx === 3 ? 1 : 0.25 }}></div>
                          ))}
                        </div>
                      </div>

                      {/* Vitals Card 2: Diet */}
                      <div className="bg-surface-elevated p-6 rounded-2xl border border-border-subtle flex flex-col justify-between h-44 group hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-primary">restaurant</span>
                          <span className="text-[9px] font-bold text-primary uppercase font-sans">{foodPercent}% of total</span>
                        </div>
                        <div>
                          <span className="font-serif text-4xl block text-primary">{food.toFixed(1)}<span className="text-sm ml-1 font-sans text-on-surface-variant font-light">kg CO2e</span></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-sans">Diet Auditing</span>
                        </div>
                        <div className="w-full h-8 flex items-center mt-2">
                          <svg className="w-full h-full text-primary opacity-40" viewBox="0 0 100 20">
                            <path d="M0 10 Q 25 18, 50 5 T 100 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                          </svg>
                        </div>
                      </div>

                      {/* Vitals Card 3: Digital */}
                      <div className="bg-surface-elevated p-6 rounded-2xl border border-border-subtle flex flex-col justify-between h-44 group hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-primary">devices</span>
                          <span className="text-[9px] font-bold text-primary uppercase font-sans">Stable</span>
                        </div>
                        <div>
                          <span className="font-serif text-4xl block text-primary">{other.toFixed(1)}<span className="text-sm ml-1 font-sans text-on-surface-variant font-light">kg CO2e</span></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-sans">Digital Services</span>
                        </div>
                        <div className="w-full h-8 flex items-end gap-1 mt-2">
                          {[20, 50, 40, other > 0 ? 80 : 30, 60].map((h, idx) => (
                            <div key={idx} className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: `${h}%`, opacity: idx === 3 ? 1 : 0.3 }}></div>
                          ))}
                        </div>
                      </div>

                      {/* Vitals Card 4: Financial */}
                      <div className="bg-surface-elevated p-6 rounded-2xl border border-border-subtle flex flex-col justify-between h-44 group hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="material-symbols-outlined text-primary">payments</span>
                          <span className="text-[9px] font-bold text-primary uppercase font-sans">{financePercent}% of total</span>
                        </div>
                        <div>
                          <span className="font-serif text-4xl block text-primary">{finance.toFixed(1)}<span className="text-sm ml-1 font-sans text-on-surface-variant font-light">kg CO2e</span></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-sans">Financial Spend</span>
                        </div>
                        <div className="w-full h-8 flex items-center mt-2">
                          <svg className="w-full h-full text-primary" viewBox="0 0 100 20">
                            <path d="M0 15 L 15 5 L 30 18 L 50 3 L 70 12 L 85 8 L 100 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SDG Goals Alignment Strip */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 flex gap-4 items-start shadow-sm">
                    <span className="text-3xl text-primary font-serif">13</span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-primary">SDG 13: Climate Action</h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Calculations use GWP AR6 vintages to target a sustainable 15kg daily CO2e ceiling.</p>
                    </div>
                  </div>
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 flex gap-4 items-start shadow-sm">
                    <span className="text-3xl text-primary font-serif">12</span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-primary">SDG 12: Responsible Consumption</h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Client-side OCR receipt splitting and financial statement auditing to track spending impact.</p>
                    </div>
                  </div>
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl p-5 flex gap-4 items-start shadow-sm">
                    <span className="text-3xl text-primary font-serif">11</span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-primary">SDG 11: Sustainable Communities</h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Trace location travel segments and identify clean low-carbon commuter alternatives.</p>
                    </div>
                  </div>
                </section>

                {/* Smarter Carbon Swaps Section */}
                <section>
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="font-serif text-2xl text-primary font-bold">Smarter Carbon Swaps</h2>
                      <p className="text-on-surface-variant text-sm mt-1">High-impact behavioral optimization based on parsed ledger context.</p>
                    </div>
                    <button 
                      onClick={() => setActiveView('history')}
                      className="text-primary font-bold text-sm flex items-center gap-1 hover:underline font-sans cursor-pointer bg-transparent border-none"
                    >
                      View Report
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Swap 1: Beef -> Vegan Burger */}
                    <div className="bg-surface-elevated rounded-3xl p-6 shadow-sm border border-border-subtle flex flex-col gap-5 hover:border-primary/40 transition-all duration-500 cursor-pointer group">
                      <div className="flex h-40 rounded-2xl overflow-hidden">
                        <div className="w-1/2 relative bg-surface-container flex flex-col items-center justify-center border-r border-border-subtle">
                          <span className="text-4xl">🥩</span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2">Beef Steak</span>
                          <div className="absolute top-2 left-2 bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest">
                            Before
                          </div>
                        </div>
                        <div className="w-1/2 relative bg-primary-container/40 flex flex-col items-center justify-center">
                          <span className="text-4xl">🍔</span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">Plant Burger</span>
                          <div className="absolute top-2 left-2 bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-full text-[8px] font-bold text-primary uppercase tracking-widest">
                            Better
                          </div>
                        </div>
                      </div>
                      <div className="px-1">
                        <h3 className="font-serif text-lg font-bold text-primary mb-2">Plant-Based Substitution</h3>
                        <div className="flex gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-container text-primary font-sans">-95% Carbon</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-tertiary-container text-tertiary font-sans">+22g Protein</span>
                        </div>
                      </div>
                    </div>

                    {/* Swap 2: Flight -> Train */}
                    <div className="bg-surface-elevated rounded-3xl p-6 shadow-sm border border-border-subtle flex flex-col gap-5 hover:border-primary/40 transition-all duration-500 cursor-pointer group">
                      <div className="flex h-40 rounded-2xl overflow-hidden">
                        <div className="w-1/2 relative bg-surface-container flex flex-col items-center justify-center border-r border-border-subtle">
                          <span className="text-4xl">✈️</span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2">Short Flight</span>
                          <div className="absolute top-2 left-2 bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest">
                            Before
                          </div>
                        </div>
                        <div className="w-1/2 relative bg-primary-container/40 flex flex-col items-center justify-center">
                          <span className="text-4xl">🚄</span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">Electric Rail</span>
                          <div className="absolute top-2 left-2 bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-full text-[8px] font-bold text-primary uppercase tracking-widest">
                            Better
                          </div>
                        </div>
                      </div>
                      <div className="px-1">
                        <h3 className="font-serif text-lg font-bold text-primary mb-2">Intercity High-Speed Rail</h3>
                        <div className="flex gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-container text-primary font-sans">-90% Carbon</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-tertiary-container text-tertiary font-sans">Eco Scenic</span>
                        </div>
                      </div>
                    </div>

                    {/* Swap 3: Solo SUV Drive -> E-Scooter */}
                    <div className="bg-surface-elevated rounded-3xl p-6 shadow-sm border border-border-subtle flex flex-col gap-5 hover:border-primary/40 transition-all duration-500 cursor-pointer group">
                      <div className="flex h-40 rounded-2xl overflow-hidden">
                        <div className="w-1/2 relative bg-surface-container flex flex-col items-center justify-center border-r border-border-subtle">
                          <span className="text-4xl">🚗</span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2">Solo SUV</span>
                          <div className="absolute top-2 left-2 bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest">
                            Before
                          </div>
                        </div>
                        <div className="w-1/2 relative bg-primary-container/40 flex flex-col items-center justify-center">
                          <span className="text-4xl">🛴</span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">E-Scooter / Bike</span>
                          <div className="absolute top-2 left-2 bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-full text-[8px] font-bold text-primary uppercase tracking-widest">
                            Better
                          </div>
                        </div>
                      </div>
                      <div className="px-1">
                        <h3 className="font-serif text-lg font-bold text-primary mb-2">Micro-Mobility Commute</h3>
                        <div className="flex gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-container text-primary font-sans">-98% Carbon</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-tertiary-container text-tertiary font-sans">Active Transit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bottom Section: Timeline Journey & Forecast */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Bottom Column: Today's Journey (Col 5) */}
                  <div className="lg:col-span-5 space-y-6">
                    <h2 className="font-serif text-2xl text-primary font-bold px-1">Today's Journey</h2>
                    <div className="space-y-4">
                      {events.length > 0 ? (
                        events.slice(0, 3).map((evt) => (
                          <div key={evt.id} className="flex items-center gap-4 bg-surface-elevated border border-border-subtle p-4 rounded-2xl shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center text-lg">
                              {evt.source === 'vision' ? '📸' : evt.source === 'financial' ? '💳' : '⚡'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-primary uppercase tracking-widest font-sans">{evt.category}</p>
                              <h4 className="font-serif text-sm font-semibold truncate text-primary">{evt.description}</h4>
                            </div>
                            <span className="text-xs font-bold text-error-flash font-mono">+{evt.totalCo2e.toFixed(1)}kg</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-on-surface-variant/60 italic px-1">No carbon activities audited today...</p>
                      )}
                      
                      {/* Upcoming Callout */}
                      <div className="flex items-center gap-4 border border-dashed border-outline-variant p-4 rounded-2xl bg-surface-container/20">
                        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline text-lg">add_a_photo</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-outline uppercase tracking-widest font-sans">Next • Upcoming</p>
                          <h4 className="font-serif text-sm font-semibold text-on-surface/50">Log Evening Dinner</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Bottom Column: Response Forecast (Col 7) */}
                  <div className="lg:col-span-7 bg-surface-elevated p-8 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-primary">Carbon Response Forecast</h3>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">Simulated projection of cumulative carbon footprint for the next 4 hours.</p>
                      </div>
                      <div className="bg-surface-container-low px-4 py-2 rounded-xl text-center border border-border-subtle">
                        <span className="block text-[8px] font-bold text-on-surface-variant uppercase font-sans">Confidence</span>
                        <span className="font-serif text-lg text-primary font-bold">92%</span>
                      </div>
                    </div>
                    
                    {/* Simulated Graph Lines */}
                    <div className="h-28 flex items-end gap-1 relative border-b border-border-subtle pb-1">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="border-t border-on-surface w-full"></div>
                        <div className="border-t border-on-surface w-full"></div>
                        <div className="border-t border-on-surface w-full"></div>
                      </div>
                      <svg className="w-full h-full text-primary" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0 38 Q 20 32, 40 28 T 80 18 T 100 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                        <path d="M0 38 Q 20 35, 40 33 T 80 28 T 100 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="2" stroke-linecap="round"></path>
                      </svg>
                    </div>
                    
                    <div className="mt-4 flex gap-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-sans">Forecast Trajectory</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]"></span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-sans">Standard Path</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Strip Banner */}
                <div className="bg-primary-container p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-border-subtle">
                  <div className="relative z-10">
                    <h2 className="font-serif text-2xl font-bold text-primary">Capture your footprint.</h2>
                    <p className="text-on-surface-variant max-w-sm text-xs mt-2 leading-relaxed">Log your local digital artifacts and files offline for absolute carbon privacy auditing.</p>
                  </div>
                  <div className="flex flex-wrap gap-4 relative z-10">
                    <button 
                      onClick={() => setActiveView('receipt-parser')}
                      className="bg-surface-elevated hover:bg-surface border border-border-subtle text-primary px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:scale-105 transition-all font-bold text-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary">photo_camera</span>
                      Scan Receipt
                    </button>
                    <button 
                      onClick={() => { setActiveView('upload'); setActiveUploader('location'); }}
                      className="bg-surface-elevated hover:bg-surface border border-border-subtle text-primary px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:scale-105 transition-all font-bold text-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary">cloud_upload</span>
                      Import Takeout
                    </button>
                    <button 
                      onClick={() => { setActiveView('upload'); setActiveUploader('digital'); }}
                      className="bg-surface-elevated hover:bg-surface border border-border-subtle text-primary px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:scale-105 transition-all font-bold text-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary">search</span>
                      Manual Log
                    </button>
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
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
