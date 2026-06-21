/**
 * @file takeoutParser.test.ts
 * @description Unit tests for the Google Takeout Semantic Location History parser.
 *
 * These tests validate the core behaviors of `parseSemanticMonth`:
 * - Empty timeline handling
 * - Parsing valid activity segments with emission calculation
 * - LOW confidence filtering (GPS noise rejection)
 * - Unknown activity type fallback to the 'UNKNOWN' factor
 *
 * The `factorRegistry` parameter is injectable, but all tests here use the
 * real `TRANSPORT_EMISSION_FACTORS` (the default) to test production behavior.
 *
 * Emission formula: emissionsKg = (distanceMeters / 1000) × factor
 * All expected values are independently verified with the exact factor values.
 */

import { describe, it, expect } from 'vitest';
import { parseSemanticMonth } from '../data/parser';

describe('parseSemanticMonth', () => {

  // ── Empty / Minimal Input ──────────────────────────────────────────────────

  it('should return an empty array if timelineObjects contains no activity segments', () => {
    const rawJson = JSON.stringify({ timelineObjects: [] });
    const result = parseSemanticMonth(rawJson);
    expect(result).toEqual([]);
  });

  // ── Standard Parsing + LOW Confidence Filter ───────────────────────────────

  it('should parse HIGH/MEDIUM confidence segments and skip LOW confidence ones', () => {
    const rawJson = JSON.stringify({
      timelineObjects: [
        {
          // ✅ HIGH confidence train — should be parsed
          activitySegment: {
            activityType: 'IN_TRAIN',
            distance:     15000,        // 15 km
            confidence:   'HIGH',
            duration: {
              startTimestamp: '2024-06-20T10:00:00.000Z',
              endTimestamp:   '2024-06-20T10:30:00.000Z', // 30 min = 1800s
            },
          },
        },
        {
          // ❌ LOW confidence car — GPS jump artefact, should be filtered out
          activitySegment: {
            activityType: 'IN_PASSENGER_VEHICLE',
            distance:     5000,
            confidence:   'LOW',
            duration: {
              startTimestamp: '2024-06-20T11:00:00.000Z',
              endTimestamp:   '2024-06-20T11:15:00.000Z',
            },
          },
        },
        {
          // ✅ MEDIUM confidence bus — should be parsed
          activitySegment: {
            activityType: 'IN_BUS',
            distance:     8000,         // 8 km
            confidence:   'MEDIUM',
            duration: {
              startTimestamp: '2024-06-20T12:00:00.000Z',
              endTimestamp:   '2024-06-20T12:20:00.000Z', // 20 min = 1200s
            },
          },
        },
      ],
    });

    const receipts = parseSemanticMonth(rawJson);

    // Only the train and bus should have been parsed (2 of 3 segments).
    expect(receipts.length).toBe(2);

    // Train: 15 km × 0.03546 kg/km = 0.5319 kg CO2e
    const train = receipts[0];
    expect(train.type).toBe('IN_TRAIN');
    expect(train.distanceMeters).toBe(15000);
    expect(train.durationSeconds).toBe(1800);
    expect(train.emissionsKg).toBe(0.5319);

    // Bus: 8 km × 0.10385 kg/km = 0.8308 kg CO2e
    const bus = receipts[1];
    expect(bus.type).toBe('IN_BUS');
    expect(bus.distanceMeters).toBe(8000);
    expect(bus.durationSeconds).toBe(1200);
    expect(bus.emissionsKg).toBe(0.8308);
  });

  // ── Unknown Activity Type Fallback ─────────────────────────────────────────

  it('should use the UNKNOWN emission factor when the activity type is unrecognized', () => {
    const rawJson = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            activityType: 'UNRECOGNIZED_TYPE', // Not in TRANSPORT_EMISSION_FACTORS
            distance:     10000,               // 10 km
            confidence:   'HIGH',
            duration: {
              startTimestamp: '2024-06-20T10:00:00.000Z',
              endTimestamp:   '2024-06-20T10:20:00.000Z',
            },
          },
        },
      ],
    });

    const receipts = parseSemanticMonth(rawJson);
    expect(receipts.length).toBe(1);

    // UNKNOWN defaults to passenger vehicle: 10 km × 0.16272 = 1.6272 kg CO2e
    expect(receipts[0].type).toBe('UNRECOGNIZED_TYPE');
    expect(receipts[0].emissionsKg).toBe(1.6272);
  });
});
