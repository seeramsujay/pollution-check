import { describe, it, expect } from 'vitest';
import { parseSemanticMonth } from '../data/parser';

describe('parseSemanticMonth', () => {
  it('should return an empty list if timelineObjects is missing', () => {
    const rawJson = `{"timelineObjects": []}`;
    const result = parseSemanticMonth(rawJson);
    expect(result).toEqual([]);
  });

  it('should parse activitySegment entries correctly and filter out LOW confidence ones', () => {
    const rawJson = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            activityType: 'IN_TRAIN',
            distance: 15000, // 15 km
            confidence: 'HIGH',
            duration: {
              startTimestamp: '2024-06-20T10:00:00.000Z',
              endTimestamp: '2024-06-20T10:30:00.000Z'
            }
          }
        },
        {
          activitySegment: {
            activityType: 'IN_PASSENGER_VEHICLE',
            distance: 5000,
            confidence: 'LOW', // Should be filtered out
            duration: {
              startTimestamp: '2024-06-20T11:00:00.000Z',
              endTimestamp: '2024-06-20T11:15:00.000Z'
            }
          }
        },
        {
          activitySegment: {
            activityType: 'IN_BUS',
            distance: 8000, // 8 km
            confidence: 'MEDIUM',
            duration: {
              startTimestamp: '2024-06-20T12:00:00.000Z',
              endTimestamp: '2024-06-20T12:20:00.000Z'
            }
          }
        }
      ]
    });

    const receipts = parseSemanticMonth(rawJson);

    // Expecting 2 valid events (excluding the LOW confidence passenger vehicle segment)
    expect(receipts.length).toBe(2);

    const trainReceipt = receipts[0];
    expect(trainReceipt.type).toBe('IN_TRAIN');
    expect(trainReceipt.distanceMeters).toBe(15000);
    expect(trainReceipt.durationSeconds).toBe(1800); // 30 mins = 1800s
    expect(trainReceipt.emissionsKg).toBe(0.5319); // 15 * 0.03546

    const busReceipt = receipts[1];
    expect(busReceipt.type).toBe('IN_BUS');
    expect(busReceipt.distanceMeters).toBe(8000);
    expect(busReceipt.durationSeconds).toBe(1200); // 20 mins = 1200s
    expect(busReceipt.emissionsKg).toBe(0.8308); // 8 * 0.10385
  });

  it('should default to UNKNOWN factor if activity type is unrecognized', () => {
    const rawJson = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            activityType: 'UNRECOGNIZED_TYPE',
            distance: 10000, // 10 km
            confidence: 'HIGH',
            duration: {
              startTimestamp: '2024-06-20T10:00:00.000Z',
              endTimestamp: '2024-06-20T10:20:00.000Z'
            }
          }
        }
      ]
    });

    const receipts = parseSemanticMonth(rawJson);
    expect(receipts.length).toBe(1);
    expect(receipts[0].type).toBe('UNRECOGNIZED_TYPE');
    expect(receipts[0].emissionsKg).toBe(1.6272); // 10 * 0.16272 (UNKNOWN default factor)
  });
});
