import { useState, useEffect, useRef } from 'preact/hooks';
import { useCarbonStore } from '../store/carbonStore';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export function Assistant() {
  const events = useCarbonStore((state) => state.events);
  const dailyBudget = useCarbonStore((state) => state.dailyBudget);
  const getDailyTotal = useCarbonStore((state) => state.getDailyTotal);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const spentToday = getDailyTotal();

  // Initialize with welcome message based on current context
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = getContextualWelcomeText();
      setMessages([
        {
          sender: 'assistant',
          text: welcomeText,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [events]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getContextualWelcomeText = () => {
    let msg = `Welcome to your EcoPulse Carbon Assistant. I am auditing your live local ledger in real-time. `;
    
    if (events.length === 0) {
      return msg + "Currently, your ledger is empty. Go to the Ingest tab to upload location Takeout logs, bank statement CSVs, or snap grocery receipt photos so I can begin optimization.";
    }

    if (spentToday === 0) {
      return msg + `You have ${events.length} historical events logged, but nothing yet today. You are at 0.0 kg CO2e out of your 15kg daily budget. Let's keep it clean!`;
    }

    if (spentToday > dailyBudget) {
      return msg + `🚨 Alert: Your footprint today is ${spentToday.toFixed(2)} kg CO2e, which exceeds your daily budget of 15.0 kg by ${(spentToday - dailyBudget).toFixed(2)} kg. Let's analyze your hotspots to offset or reduce this immediately.`;
    }

    return msg + `Today's intensity is at ${spentToday.toFixed(2)} kg CO2e, utilizing ${( (spentToday / dailyBudget) * 100 ).toFixed(1)}% of your daily cap. I have calculated some optimization paths based on your inputs. What would you like to target?`;
  };

  const getAssistantResponse = (userQuery: string): string => {
    const query = userQuery.toLowerCase();
    


    // Find the highest emission event
    const sortedEvents = [...events].sort((a, b) => b.totalCo2e - a.totalCo2e);
    const topEvent = sortedEvents[0];

    // Response construction based on user query keywords
    if (query.includes('diet') || query.includes('food') || query.includes('eat') || query.includes('meal')) {
      const foodEvents = events.filter(e => 
        ['groceries', 'beef', 'lamb', 'cheese', 'pork', 'poultry', 'rice', 'avocados', 'bread', 'peas', 'milk', 'vegetables'].includes(e.category.toLowerCase())
      );
      const foodTotal = foodEvents.reduce((sum, e) => sum + e.totalCo2e, 0);

      if (foodEvents.length === 0) {
        return "I don't see any diet or food entries in your current ledger. If you upload a grocery receipt photo or bank CSV showing food purchases, I can analyze them. Remember, food accounts for up to 26% of global greenhouse gas emissions, with beef emitting 60kg CO2e per kg vs. peas at 0.9kg CO2e.";
      }

      let response = `Your logged food purchases account for **${foodTotal.toFixed(2)} kg CO2e**. \n\n`;
      const beefItems = foodEvents.filter(e => e.category.toLowerCase() === 'beef' || e.description.toLowerCase().includes('beef') || e.description.toLowerCase().includes('steak'));
      
      if (beefItems.length > 0) {
        const beefSum = beefItems.reduce((sum, e) => sum + e.totalCo2e, 0);
        response += `🔴 **High Intensity Spot**: Your beef consumption (${beefSum.toFixed(2)} kg CO2e) is the primary driver here. By switching from beef to chicken, you reduce impact by 85%. By switching to legumes/grains, you reduce it by over 98% (AR6 standard metrics).\n\n`;
      } else {
        response += `💚 Your dietary footprint is relatively low-carbon. Continue selecting local produce, plant-based proteins, and minimizing dairy, which are high contributors (AR6 P&N 2018 parameters).\n\n`;
      }

      response += "Would you like me to map out a plant-based meal alternative?";
      return response;
    }

    if (query.includes('travel') || query.includes('transport') || query.includes('flight') || query.includes('car') || query.includes('drive')) {
      const travelEvents = events.filter(e => 
        ['transport', 'transport (fuel)', 'ride sharing', 'aviation travel', 'travel'].includes(e.category.toLowerCase()) ||
        e.description.toLowerCase().includes('travel') || 
        e.description.toLowerCase().includes('drive')
      );
      const travelTotal = travelEvents.reduce((sum, e) => sum + e.totalCo2e, 0);

      if (travelEvents.length === 0) {
        return "You have no travel events logged. Uploading your Google Takeout Semantic Location History JSON will let me automatically map your walking, driving, and train trips with zero manual input.";
      }

      let response = `Your travel events contribute **${travelTotal.toFixed(2)} kg CO2e** to your ledger.\n\n`;
      const flights = travelEvents.filter(e => e.category.toLowerCase() === 'aviation travel' || e.description.toLowerCase().includes('flight') || e.description.toLowerCase().includes('plane'));
      
      if (flights.length > 0) {
        response += `✈️ **Aviation Impact**: Aviation is highly intensive due to radiative forcing at altitude. Consider high-speed rail alternatives for trips under 500km, which can reduce emissions by 90% per passenger-kilometer.\n\n`;
      }

      const cars = travelEvents.filter(e => e.description.toLowerCase().includes('drive') || e.description.toLowerCase().includes('uber') || e.description.toLowerCase().includes('car'));
      if (cars.length > 0) {
        response += `🚗 **Road Commute**: I noticed car travel logged. Walking or biking for journeys under 3km produces zero direct emissions and supports physical health. For medium commutes, local electric transit averages just 0.03 kg CO2e/km.\n\n`;
      }

      return response;
    }

    if (query.includes('digital') || query.includes('streaming') || query.includes('netflix') || query.includes('zoom') || query.includes('cloud')) {
      const digitalEvents = events.filter(e => e.category.toLowerCase() === 'digital services' || e.description.toLowerCase().includes('stream') || e.description.toLowerCase().includes('video'));
      const digitalTotal = digitalEvents.reduce((sum, e) => sum + e.totalCo2e, 0);

      if (digitalEvents.length === 0) {
        return "Currently, no digital services are audited. You can log network usage (GBs) or active streaming times in the 'Digital & Manual' tab. For example, streaming 4K video for 2 hours emits roughly 0.32 kg CO2e due to server hosting and grid transmissions.";
      }

      return `Your digital streaming and cloud footprint accounts for **${digitalTotal.toFixed(2)} kg CO2e**. \n\n💡 **Optimization tip**: Lowering streaming resolutions from 4K/UHD to 1080p (Full HD) reduces raw network throughput by ~60%, directly lowering data-center electricity load and cooling costs. Turn off video feeds in virtual conferences when not presenting.`;
    }

    if (query.includes('budget') || query.includes('status') || query.includes('limit') || query.includes('total') || query.includes('spend')) {
      let response = `Today you have expended **${spentToday.toFixed(2)} kg CO2e** out of your **15.0 kg CO2e** budget.\n\n`;
      if (spentToday > dailyBudget) {
        response += `⚠️ You are currently **${(spentToday - dailyBudget).toFixed(2)} kg over limit**. `;
      } else {
        response += `✅ You have **${(dailyBudget - spentToday).toFixed(2)} kg remaining** to allocate. `;
      }

      if (topEvent) {
        response += `Your single largest emission is **"${topEvent.description}"** which emitted **${topEvent.totalCo2e.toFixed(2)} kg CO2e** (Category: ${topEvent.category}). Focusing reductions on this category yields the highest leverage.`;
      }

      return response;
    }

    if (query.includes('action') || query.includes('plan') || query.includes('recommend') || query.includes('reduce') || query.includes('help')) {
      if (events.length === 0) {
        return "To generate a custom environmental action plan, I need some data! Please use the Ingest tab to import files first.";
      }

      let plan = "### EcoPulse Environmental Action Plan 🌿\n\n";
      let stepNum = 1;

      // Check food
      const beefItems = events.filter(e => e.category.toLowerCase() === 'beef' || e.description.toLowerCase().includes('beef') || e.description.toLowerCase().includes('steak'));
      if (beefItems.length > 0) {
        plan += `${stepNum++}. **Swap Beef**: Substitute your logged beef with plant proteins or poultry. Doing this saves ~11.5 kg CO2e per meal.\n`;
      }

      // Check travel
      const carItems = events.filter(e => e.description.toLowerCase().includes('drive') || e.description.toLowerCase().includes('car') || e.description.toLowerCase().includes('uber'));
      if (carItems.length > 0) {
        plan += `${stepNum++}. **Active Mobility**: Swap car journeys under 3km for walking or micro-mobility (biking/scooters) to save ~0.24 kg CO2e/km.\n`;
      }

      // Check digital
      const streamItems = events.filter(e => e.description.toLowerCase().includes('stream') || e.description.toLowerCase().includes('video') || e.description.toLowerCase().includes('4k'));
      if (streamItems.length > 0) {
        plan += `${stepNum++}. **HD vs 4K**: Configure your streaming services to default to 1080p rather than 4K to decrease data routing emissions by 60%.\n`;
      }

      if (spentToday > dailyBudget) {
        plan += `${stepNum++}. **Offset Excess**: You are over your 15kg cap. Consider purchasing verified Gold Standard offsets or committing to a zero-carbon day tomorrow to balance the ledger.\n`;
      } else {
        plan += `${stepNum++}. **Sustain Target**: You are currently inside your 15kg carbon budget. Avoid high-impact actions for the rest of the day to maintain target compliance.\n`;
      }

      return plan;
    }

    // Default / general fallback
    if (topEvent) {
      return `I see you have logged **${events.length} items**, totaling **${spentToday.toFixed(2)} kg CO2e**. Your highest contributor is "${topEvent.description}" at **${topEvent.totalCo2e.toFixed(2)} kg CO2e**. \n\nYou can ask me specific questions like:
- "How can I reduce my food footprint?"
- "Explain my travel emissions."
- "Give me a daily action plan."
- "What is my current budget status?"`;
    }

    return "Ask me about your ledger, for example: 'Explain my food emissions', 'How can I reduce my travel footprint?', or 'Give me an action plan'. I operate local-first to guarantee data privacy.";
  };

  const handleSendMessage = (e?: Event) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: inputText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate thinking latency to feel organic
    setTimeout(() => {
      const responseText = getAssistantResponse(userMsg.text);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: responseText,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    // Submit immediately
    const userMsg: Message = {
      sender: 'user',
      text: question,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = getAssistantResponse(question);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: responseText,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 flex flex-col h-[400px] shadow-2xl relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary-fixed-dim/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success-neon animate-pulse-dot"></div>
          <div>
            <h3 className="font-headline-md text-[16px] font-bold text-primary">EcoPulse AI Assistant</h3>
            <p className="font-label-sm text-[10px] text-on-surface-variant">Real-time local context analyzer</p>
          </div>
        </div>
        <span className="font-label-sm text-[10px] bg-surface-container px-2 py-1 rounded text-primary border border-outline-variant">Local Compute</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-primary text-on-primary-fixed font-medium rounded-tr-none'
                : 'bg-surface-container border border-border-subtle text-on-surface rounded-tl-none whitespace-pre-line'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-container border border-border-subtle text-on-surface-variant rounded-lg rounded-tl-none p-3 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Questions */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 text-[11px] whitespace-nowrap">
        <button 
          onClick={() => handleQuickQuestion("Show my daily carbon status")}
          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle text-on-surface hover:text-primary transition-all rounded"
        >
          📊 Daily Status
        </button>
        <button 
          onClick={() => handleQuickQuestion("How can I reduce my food footprint?")}
          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle text-on-surface hover:text-primary transition-all rounded"
        >
          🥑 Diet Auditing
        </button>
        <button 
          onClick={() => handleQuickQuestion("Explain my travel emissions")}
          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle text-on-surface hover:text-primary transition-all rounded"
        >
          🚗 Travel Insights
        </button>
        <button 
          onClick={() => handleQuickQuestion("Give me a daily action plan")}
          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-border-subtle text-on-surface hover:text-primary transition-all rounded"
        >
          📋 Get Action Plan
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-border-subtle pt-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText((e.target as HTMLInputElement).value)}
          placeholder="Ask a question about your carbon ledger..."
          className="flex-1 bg-surface-container-lowest border border-border-subtle rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-fixed-dim transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-primary text-on-primary-fixed hover:bg-primary-fixed-dim hover:text-on-primary-fixed-variant px-4 py-2 text-xs font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
