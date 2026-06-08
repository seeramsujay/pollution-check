// src/utils/csvParser.ts
import type { CarbonEvent } from '../store/carbonStore';
import { FINANCIAL_CARBON_DICT, MCC_MAPPING } from '../constants/carbonEmissions';


export function parseFinancialCSV(csvText: string): CarbonEvent[] {  
  const events: CarbonEvent[] = [];  
  const lines = csvText.split(/\r?\n/);  
  if (lines.length < 2) return [];

  // Parse headers to handle various column configurations  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));  
  const dateIdx = headers.indexOf('date');  
  const descIdx = headers.indexOf('description');  
  const amountIdx = headers.indexOf('amount');  
  const mccIdx = headers.indexOf('mcc'); 

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {  
    throw new Error('CSV missing required headers: date, description, amount');  
  }

  // Linear scan execution: O(N) time complexity where N is the number of transaction rows  
  for (let i = 1; i < lines.length; i++) {  
    const row = lines[i].trim();  
    if (!row) continue;

    // Handle commas inside quotes via regex split  
    const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.trim().replace(/^["']|["']$/g, ''));  
    if (columns.length < headers.length) continue;

    const rawDate = columns[dateIdx];  
    const rawDesc = columns[descIdx];  
    const rawAmount = Math.abs(parseFloat(columns[amountIdx]));  
    const rawMcc = mccIdx !== -1 ? columns[mccIdx] : undefined;

    if (isNaN(rawAmount)) continue;

    // Match transaction to mapping keys using Merchant Category Codes (MCC) or descriptions  
    let matchedKey = 'generic';  
    if (rawMcc && MCC_MAPPING[rawMcc]) {  
      matchedKey = MCC_MAPPING[rawMcc];  
    } else {  
      const lowerDesc = rawDesc.toLowerCase();  
      const keys = Object.keys(FINANCIAL_CARBON_DICT);  
      for (let k = 0; k < keys.length; k++) {  
        if (lowerDesc.includes(keys[k])) {  
          matchedKey = keys[k];  
          break;  
        }  
      }  
    }

    const mapMeta = FINANCIAL_CARBON_DICT[matchedKey] || FINANCIAL_CARBON_DICT['generic'];  
    const timestamp = Date.parse(rawDate) || Date.now();

    events.push({  
      id: crypto.randomUUID(),  
      timestamp,  
      source: 'financial',  
      category: mapMeta.category,  
      description: rawDesc,  
      rawQuantity: rawAmount,  
      rawUnit: 'usd',  
      co2eIntensity: mapMeta.intensity,  
      totalCo2e: Number((rawAmount * mapMeta.intensity).toFixed(4)),  
      metadata: {  
        mcc: rawMcc,  
        merchant: matchedKey  
      }  
    });  
  }

  return events;  
}
