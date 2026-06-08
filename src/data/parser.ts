// src/data/parser.ts
import { TRANSPORT_EMISSION_FACTORS } from '../constants/carbonEmissions';

export interface SpatialCoordinate {  
  lat: number;  
  lon: number;  
}

export interface ActivityReceipt {  
  type: string;  
  distanceMeters: number;  
  durationSeconds: number;  
  emissionsKg: number;  
  timestamp: string;  
}

export function parseSemanticMonth(  
  jsonContent: string,   
  factorRegistry: Record<string, number> = TRANSPORT_EMISSION_FACTORS  
): ActivityReceipt[] {  
  const parsed = JSON.parse(jsonContent);  
  const timelineObjects = parsed.timelineObjects || [];  
  const receipts: ActivityReceipt[] = [];

  for (const obj of timelineObjects) {  
    if (obj.activitySegment) {  
      const segment = obj.activitySegment;  
      
      // Filter out points where confidence is LOW to mitigate coordinate jumping
      if (segment.confidence === 'LOW') {
        continue;
      }

      const type = segment.activityType || "UNKNOWN";  
      const distanceMeters = segment.distance || 0;  
      
      let startTimestamp = segment.duration?.startTimestamp;
      let endTimestamp = segment.duration?.endTimestamp;
      
      if (!startTimestamp || !endTimestamp) {
        continue;
      }

      const start = new Date(startTimestamp);  
      const end = new Date(endTimestamp);  
      const durationSeconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);  
        
      const distanceKm = distanceMeters / 1000;  
      // Default to "UNKNOWN" or baseline petrol vehicle factor if the activity type is not in registry
      const factor = factorRegistry[type] !== undefined 
        ? factorRegistry[type] 
        : (factorRegistry["UNKNOWN"] || 0.16272);  
      
      const emissionsKg = Number((distanceKm * factor).toFixed(4));

      receipts.push({  
        type,  
        distanceMeters,  
        durationSeconds,  
        emissionsKg,  
        timestamp: startTimestamp  
      });  
    }  
  }  
  return receipts;  
}
