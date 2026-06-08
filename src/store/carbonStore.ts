import { create } from 'zustand';

export type CarbonSourceType = 'vision' | 'financial' | 'digital';  
export type CarbonUnitType = 'kg' | 'usd' | 'gb' | 'hours';

export interface CarbonEvent {  
  id: string;  
  timestamp: number;   
  source: CarbonSourceType;  
  category: string;   
  description: string;   
  rawQuantity: number;   
  rawUnit: CarbonUnitType;  
  co2eIntensity: number; // kg CO2e emitted per rawUnit  
  totalCo2e: number; // Calculated dynamically: rawQuantity * co2eIntensity  
  metadata: {  
    mcc?: string;   
    merchant?: string;   
    confidenceScore?: number;   
    tokensConsumed?: number;   
    networkType?: 'wifi' | 'cellular';   
    apiRoute?: string;  
  };  
}

interface CarbonState {  
  events: CarbonEvent[];  
  dailyBudget: number;  
  addEvent: (event: Omit<CarbonEvent, 'totalCo2e'>) => void;  
  removeEvent: (id: string) => void;  
  clearStore: () => void;  
  getDailyTotal: () => number;  
}

export const useCarbonStore = create<CarbonState>((set, get) => ({  
  events: [],  
  dailyBudget: 15.0, // Standardized 15kg CO2e daily ceiling  
    
  addEvent: (newEvent) => {  
    const calculatedEvent: CarbonEvent = {  
      ...newEvent,  
      totalCo2e: Number((newEvent.rawQuantity * newEvent.co2eIntensity).toFixed(4)),  
    };  
      
    set((state) => ({  
      events: [calculatedEvent, ...state.events],  
    }));  
  },  
    
  removeEvent: (id) => {  
    set((state) => ({  
      events: state.events.filter((evt) => evt.id !== id),  
    }));  
  },  
    
  clearStore: () => set({ events: [] }),  
    
  getDailyTotal: () => {  
    const today = new Date().setHours(0, 0, 0, 0);  
    return get().events  
      .filter((evt) => new Date(evt.timestamp).setHours(0, 0, 0, 0) === today)  
      .reduce((sum, evt) => sum + evt.totalCo2e, 0);  
  },  
}));
