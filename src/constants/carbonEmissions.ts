// src/constants/carbonEmissions.ts

// Poore & Nemecek (2018) global meta-analysis factors (kg CO2e / kg)
export const VISION_CARBON_DICT: Record<string, number> = {  
  beef: 60.0,  
  lamb: 24.0,  
  cheese: 21.0,  
  pork: 7.0,  
  poultry: 6.0,  
  rice: 4.0,  
  avocados: 2.5,  
  bread: 1.4,  
  peas: 1.0,  
  milk: 3.0,  
  vegetables: 0.5  
};

// EPA Supply Chain Greenhouse Gas Emission Factors (kg CO2e / $)
export const FINANCIAL_CARBON_DICT: Record<string, { intensity: number; category: string }> = {  
  gas: { intensity: 1.20, category: 'Transport (Fuel)' },  
  fuel: { intensity: 1.20, category: 'Transport (Fuel)' },  
  shell: { intensity: 1.20, category: 'Transport (Fuel)' },  
  chevron: { intensity: 1.20, category: 'Transport (Fuel)' },  
  exxon: { intensity: 1.20, category: 'Transport (Fuel)' },  
  delta: { intensity: 0.80, category: 'Aviation Travel' },  
  united: { intensity: 0.80, category: 'Aviation Travel' },  
  american: { intensity: 0.80, category: 'Aviation Travel' },  
  uber: { intensity: 0.65, category: 'Ride Sharing' },  
  lyft: { intensity: 0.65, category: 'Ride Sharing' },  
  wholefoods: { intensity: 0.35, category: 'Groceries' },  
  traderjoes: { intensity: 0.35, category: 'Groceries' },  
  safeway: { intensity: 0.35, category: 'Groceries' },  
  grocery: { intensity: 0.35, category: 'Groceries' },  
  restaurant: { intensity: 0.42, category: 'Dining Out' },  
  mcdonalds: { intensity: 0.42, category: 'Dining Out' },  
  starbucks: { intensity: 0.42, category: 'Dining Out' },  
  netflix: { intensity: 0.12, category: 'Digital Services' },  
  spotify: { intensity: 0.12, category: 'Digital Services' },  
  comcast: { intensity: 0.12, category: 'Digital Services' },  
  generic: { intensity: 0.208, category: 'Retail Operations' }  
};

// Merchant Category Codes (MCC) mappings
export const MCC_MAPPING: Record<string, string> = {  
  '5541': 'gas',  
  '4511': 'delta',  
  '4121': 'uber',  
  '5411': 'grocery',  
  '5812': 'restaurant',  
  '4899': 'netflix'  
};

// Google Takeout travel emission factors (kg CO2e / passenger-km)
export const TRANSPORT_EMISSION_FACTORS: Record<string, number> = {  
  "IN_BUS": 0.10385,              // Bus / Motor Coach
  "IN_PASSENGER_VEHICLE": 0.16272, // Assuming standard petrol passenger car
  "IN_TRAIN": 0.03546,            // Intercity rail baseline
  "FLYING": 0.12576,              // Short-haul economy baseline
  "WALKING": 0.0,
  "CYCLING": 0.0,
  "STILL": 0.0,
  "UNKNOWN": 0.16272               // Default to passenger vehicle as a safe upper bound
};
