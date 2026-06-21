/**
 * @file takeoutParser.test.ts
 * @description Comprehensive unit tests for the Google Takeout Semantic Location History parser.
 *
 * Test coverage includes:
 * - Empty and missing timelineObjects
 * - placeVisit entries correctly ignored (only activitySegment processed)
 * - LOW confidence filtering
 * - HIGH and MEDIUM confidence segments parsed correctly
 * - All known transport types with correct emission factors
 * - WALKING and CYCLING → zero emissions
 * - UNKNOWN fallback for unrecognized activity types
 * - Missing duration timestamps → segment skipped
 * - Custom factor registry injection for unit test isolation
 * - Duration calculation correctness
 * - Output field correctness (type, distanceMeters, timestamp)
 * - Invalid JSON handling
 */

import { describe, it, expect } from 'vitest';
import { parseSemanticMonth } from '../data/parser';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Builds a minimal valid activitySegment JSON string. */
function makeSegmentJSON(overrides: {
  type?: string;
  distanceMeters?: number;
  confidence?: string;
  startTimestamp?: string;
  endTimestamp?: string;
}) {
  return JSON.stringify({
    timelineObjects: [
      {
        activitySegment: {
          activityType:  overrides.type       ?? 'IN_TRAIN',
          distance:      overrides.distanceMeters ?? 10000,
          confidence:    overrides.confidence  ?? 'HIGH',
          duration: {
            startTimestamp: overrides.startTimestamp ?? '2024-06-20T10:00:00.000Z',
            endTimestamp:   overrides.endTimestamp   ?? '2024-06-20T10:30:00.000Z',
          },
        },
      },
    ],
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('parseSemanticMonth', () => {

  // ── Empty / Minimal Input ────────────────────────────────────────────────────

  describe('empty and minimal input', () => {
    it('should return an empty array when timelineObjects is an empty array', () => {
      expect(parseSemanticMonth(JSON.stringify({ timelineObjects: [] }))).toEqual([]);
    });

    it('should return an empty array when timelineObjects key is missing entirely', () => {
      expect(parseSemanticMonth(JSON.stringify({}))).toEqual([]);
    });

    it('should throw SyntaxError for invalid JSON input', () => {
      expect(() => parseSemanticMonth('NOT VALID JSON')).toThrow(SyntaxError);
    });
  });

  // ── Entry Type Filtering ──────────────────────────────────────────────────────

  describe('entry type filtering', () => {
    it('should ignore placeVisit entries entirely', () => {
      const json = JSON.stringify({
        timelineObjects: [
          { placeVisit: { location: { name: 'Starbucks' } } },
          { placeVisit: { location: { name: 'Office' } } },
        ],
      });
      expect(parseSemanticMonth(json)).toEqual([]);
    });

    it('should process only activitySegments when mixed with placeVisits', () => {
      const json = JSON.stringify({
        timelineObjects: [
          { placeVisit: { location: { name: 'Home' } } },
          {
            activitySegment: {
              activityType: 'IN_TRAIN', distance: 5000, confidence: 'HIGH',
              duration: { startTimestamp: '2024-06-20T10:00:00.000Z', endTimestamp: '2024-06-20T10:15:00.000Z' },
            },
          },
          { placeVisit: { location: { name: 'Work' } } },
        ],
      });
      const results = parseSemanticMonth(json);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('IN_TRAIN');
    });
  });

  // ── Confidence Filtering ──────────────────────────────────────────────────────

  describe('confidence filtering', () => {
    it('should skip LOW confidence segments (GPS noise rejection)', () => {
      const json = makeSegmentJSON({ confidence: 'LOW' });
      expect(parseSemanticMonth(json)).toEqual([]);
    });

    it('should parse HIGH confidence segments', () => {
      expect(parseSemanticMonth(makeSegmentJSON({ confidence: 'HIGH' }))).toHaveLength(1);
    });

    it('should parse MEDIUM confidence segments', () => {
      expect(parseSemanticMonth(makeSegmentJSON({ confidence: 'MEDIUM' }))).toHaveLength(1);
    });

    it('should filter out LOW but keep HIGH when both appear together', () => {
      const json = JSON.stringify({
        timelineObjects: [
          {
            activitySegment: {
              activityType: 'IN_TRAIN', distance: 15000, confidence: 'HIGH',
              duration: { startTimestamp: '2024-06-20T10:00:00.000Z', endTimestamp: '2024-06-20T10:30:00.000Z' },
            },
          },
          {
            activitySegment: {
              activityType: 'IN_PASSENGER_VEHICLE', distance: 5000, confidence: 'LOW',
              duration: { startTimestamp: '2024-06-20T11:00:00.000Z', endTimestamp: '2024-06-20T11:10:00.000Z' },
            },
          },
        ],
      });
      const results = parseSemanticMonth(json);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('IN_TRAIN');
    });
  });

  // ── Duration Handling ────────────────────────────────────────────────────────

  describe('duration handling', () => {
    it('should skip segments missing startTimestamp', () => {
      const json = JSON.stringify({
        timelineObjects: [{
          activitySegment: {
            activityType: 'IN_BUS', distance: 5000, confidence: 'HIGH',
            duration: { endTimestamp: '2024-06-20T10:30:00.000Z' },
          },
        }],
      });
      expect(parseSemanticMonth(json)).toEqual([]);
    });

    it('should skip segments missing endTimestamp', () => {
      const json = JSON.stringify({
        timelineObjects: [{
          activitySegment: {
            activityType: 'IN_BUS', distance: 5000, confidence: 'HIGH',
            duration: { startTimestamp: '2024-06-20T10:00:00.000Z' },
          },
        }],
      });
      expect(parseSemanticMonth(json)).toEqual([]);
    });

    it('should skip segments missing duration block entirely', () => {
      const json = JSON.stringify({
        timelineObjects: [{
          activitySegment: { activityType: 'IN_BUS', distance: 5000, confidence: 'HIGH' },
        }],
      });
      expect(parseSemanticMonth(json)).toEqual([]);
    });

    it('should correctly compute durationSeconds from start/end timestamps', () => {
      // 30 min = 1800 seconds
      const result = parseSemanticMonth(makeSegmentJSON({
        startTimestamp: '2024-06-20T10:00:00.000Z',
        endTimestamp:   '2024-06-20T10:30:00.000Z',
      }));
      expect(result[0].durationSeconds).toBe(1800);
    });

    it('should clamp durationSeconds to 0 for inverted timestamps', () => {
      // End before start — unusual but defensive
      const result = parseSemanticMonth(makeSegmentJSON({
        startTimestamp: '2024-06-20T10:30:00.000Z',
        endTimestamp:   '2024-06-20T10:00:00.000Z',
      }));
      expect(result[0].durationSeconds).toBe(0);
    });
  });

  // ── Emission Calculation ──────────────────────────────────────────────────────

  describe('emission calculations per transport type', () => {
    // Emission formula: distanceKm × factor, rounded to 4dp

    it('IN_TRAIN: 15 km × 0.03546 = 0.5319 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'IN_TRAIN', distanceMeters: 15000 }));
      expect(result[0].emissionsKg).toBe(0.5319);
    });

    it('IN_BUS: 8 km × 0.10385 = 0.8308 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'IN_BUS', distanceMeters: 8000 }));
      expect(result[0].emissionsKg).toBe(0.8308);
    });

    it('IN_PASSENGER_VEHICLE: 10 km × 0.16272 = 1.6272 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'IN_PASSENGER_VEHICLE', distanceMeters: 10000 }));
      expect(result[0].emissionsKg).toBe(1.6272);
    });

    it('FLYING: 100 km × 0.12576 = 12.576 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'FLYING', distanceMeters: 100000 }));
      expect(result[0].emissionsKg).toBe(12.576);
    });

    it('WALKING: any distance → 0.0 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'WALKING', distanceMeters: 5000 }));
      expect(result[0].emissionsKg).toBe(0.0);
    });

    it('CYCLING: any distance → 0.0 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'CYCLING', distanceMeters: 3000 }));
      expect(result[0].emissionsKg).toBe(0.0);
    });

    it('STILL: any distance → 0.0 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'STILL', distanceMeters: 0 }));
      expect(result[0].emissionsKg).toBe(0.0);
    });

    it('UNKNOWN activity type: falls back to passenger vehicle factor (0.16272)', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'UNRECOGNIZED_TYPE', distanceMeters: 10000 }));
      expect(result[0].type).toBe('UNRECOGNIZED_TYPE');
      // 10 km × 0.16272 = 1.6272
      expect(result[0].emissionsKg).toBe(1.6272);
    });

    it('should handle zero distance gracefully → 0.0 kg CO2e', () => {
      const result = parseSemanticMonth(makeSegmentJSON({ type: 'IN_TRAIN', distanceMeters: 0 }));
      expect(result[0].emissionsKg).toBe(0.0);
    });
  });

  // ── Output Field Correctness ──────────────────────────────────────────────────

  describe('output field correctness', () => {
    it('should set type, distanceMeters, and timestamp on the receipt', () => {
      const result = parseSemanticMonth(makeSegmentJSON({
        type: 'IN_BUS',
        distanceMeters: 8000,
        startTimestamp: '2024-06-20T12:00:00.000Z',
      }));
      expect(result[0].type).toBe('IN_BUS');
      expect(result[0].distanceMeters).toBe(8000);
      expect(result[0].timestamp).toBe('2024-06-20T12:00:00.000Z');
    });

    it('should preserve original order of segments in output array', () => {
      const json = JSON.stringify({
        timelineObjects: [
          {
            activitySegment: {
              activityType: 'IN_BUS', distance: 8000, confidence: 'HIGH',
              duration: { startTimestamp: '2024-06-20T08:00:00.000Z', endTimestamp: '2024-06-20T08:20:00.000Z' },
            },
          },
          {
            activitySegment: {
              activityType: 'WALKING', distance: 500, confidence: 'HIGH',
              duration: { startTimestamp: '2024-06-20T09:00:00.000Z', endTimestamp: '2024-06-20T09:10:00.000Z' },
            },
          },
          {
            activitySegment: {
              activityType: 'IN_TRAIN', distance: 15000, confidence: 'HIGH',
              duration: { startTimestamp: '2024-06-20T10:00:00.000Z', endTimestamp: '2024-06-20T10:30:00.000Z' },
            },
          },
        ],
      });
      const results = parseSemanticMonth(json);
      expect(results[0].type).toBe('IN_BUS');
      expect(results[1].type).toBe('WALKING');
      expect(results[2].type).toBe('IN_TRAIN');
    });
  });

  // ── Custom Factor Registry ────────────────────────────────────────────────────

  describe('custom factor registry injection', () => {
    it('should use a custom factor registry when provided', () => {
      const customRegistry = { 'IN_TRAIN': 999.0, 'UNKNOWN': 0 };
      const result = parseSemanticMonth(
        makeSegmentJSON({ type: 'IN_TRAIN', distanceMeters: 1000 }),
        customRegistry,
      );
      // 1 km × 999.0 = 999.0
      expect(result[0].emissionsKg).toBe(999.0);
    });

    it('should fall back to UNKNOWN in custom registry for unrecognized types', () => {
      const customRegistry = { 'UNKNOWN': 5.0 };
      const result = parseSemanticMonth(
        makeSegmentJSON({ type: 'MYSTERY', distanceMeters: 2000 }),
        customRegistry,
      );
      // 2 km × 5.0 = 10.0
      expect(result[0].emissionsKg).toBe(10.0);
    });
  });
});
