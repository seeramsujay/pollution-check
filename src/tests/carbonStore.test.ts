/**
 * @file carbonStore.test.ts
 * @description Comprehensive unit tests for the Zustand carbon event store.
 *
 * Test coverage includes:
 * - Initial state shape and default values
 * - addEvent: totalCo2e derivation, ordering (newest-first), rounding precision
 * - removeEvent: correct event removal, leaving others intact, non-existent ID safety
 * - clearStore: full wipe
 * - getDailyTotal: today-only filter, multiple events, empty store, budget overflow
 * - dailyBudget: constant correctness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCarbonStore } from '../store/carbonStore';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Builds a minimal valid event stub, merging any overrides provided. */
function makeEvent(overrides: {
  id?: string;
  timestamp?: number;
  source?: 'financial' | 'digital' | 'vision' | 'travel' | 'food' | 'finance';
  category?: string;
  description?: string;
  rawQuantity?: number;
  rawUnit?: 'usd' | 'kg' | 'gb' | 'hours' | 'km';
  co2eIntensity?: number;
  metadata?: Record<string, unknown>;
} = {}) {
  return {
    id: 'evt-default',
    timestamp: Date.now(),
    source: 'digital' as const,
    category: 'Digital Services',
    description: 'Test Event',
    rawQuantity: 1,
    rawUnit: 'hours' as const,
    co2eIntensity: 0.1,
    metadata: {},
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useCarbonStore', () => {
  // Guarantee test isolation — Zustand stores are module-level singletons.
  beforeEach(() => {
    useCarbonStore.getState().clearStore();
  });

  // ── Initialization ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have an empty events array on initialization', () => {
      expect(useCarbonStore.getState().events).toEqual([]);
    });

    it('should have a daily budget of exactly 15.0 kg CO2e (UN SDG 13 target)', () => {
      expect(useCarbonStore.getState().dailyBudget).toBe(15.0);
    });
  });

  // ── addEvent ─────────────────────────────────────────────────────────────────

  describe('addEvent', () => {
    it('should automatically derive totalCo2e = rawQuantity × co2eIntensity', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'e1', rawQuantity: 2, co2eIntensity: 0.16 }));
      const evt = useCarbonStore.getState().events[0];
      // 2 × 0.16 = 0.32
      expect(evt.totalCo2e).toBe(0.32);
    });

    it('should round totalCo2e to 4 decimal places to prevent floating-point noise', () => {
      // 1.1 × 0.07125 = 0.078375 (exact), but floating point may drift
      useCarbonStore.getState().addEvent(makeEvent({ rawQuantity: 1.1, co2eIntensity: 0.07125 }));
      const result = useCarbonStore.getState().events[0].totalCo2e;
      expect(result).toBe(0.0784); // toFixed(4) rounded
    });

    it('should prepend new events so the most recent event is at index 0', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'first', description: 'First Event' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'second', description: 'Second Event' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'third', description: 'Third Event' }));

      const events = useCarbonStore.getState().events;
      expect(events[0].id).toBe('third');  // Newest at index 0
      expect(events[1].id).toBe('second');
      expect(events[2].id).toBe('first');
    });

    it('should store all event fields exactly as provided', () => {
      const payload = makeEvent({
        id: 'full-test',
        timestamp: 1719000000000,
        source: 'vision',
        category: 'beef',
        description: 'Organic Ribeye Steak',
        rawQuantity: 0.35,
        rawUnit: 'kg',
        co2eIntensity: 60.0,
        metadata: { confidenceScore: 0.95, merchant: 'whole-foods' },
      });
      useCarbonStore.getState().addEvent(payload);

      const stored = useCarbonStore.getState().events[0];
      expect(stored.id).toBe('full-test');
      expect(stored.source).toBe('vision');
      expect(stored.category).toBe('beef');
      expect(stored.rawQuantity).toBe(0.35);
      expect(stored.rawUnit).toBe('kg');
      expect(stored.metadata.confidenceScore).toBe(0.95);
      // 0.35 × 60.0 = 21.0
      expect(stored.totalCo2e).toBe(21.0);
    });

    it('should handle zero quantity correctly (zero-emission event)', () => {
      useCarbonStore.getState().addEvent(makeEvent({ rawQuantity: 0, co2eIntensity: 10 }));
      expect(useCarbonStore.getState().events[0].totalCo2e).toBe(0);
    });

    it('should handle very small fractional values without becoming zero', () => {
      // 0.001 gb × 0.0095 kg/gb = 0.0000095 → rounds to 0.0000
      // Actual: 0.01 × 0.0095 = 0.000095 → rounds to 0.0001
      useCarbonStore.getState().addEvent(makeEvent({ rawQuantity: 0.01, co2eIntensity: 0.0095 }));
      const result = useCarbonStore.getState().events[0].totalCo2e;
      expect(result).toBe(0.0001);
    });
  });

  // ── removeEvent ──────────────────────────────────────────────────────────────

  describe('removeEvent', () => {
    it('should remove only the event matching the given ID', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'keep-a' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'remove-me' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'keep-b' }));

      useCarbonStore.getState().removeEvent('remove-me');

      const ids = useCarbonStore.getState().events.map((e) => e.id);
      expect(ids).not.toContain('remove-me');
      expect(ids).toContain('keep-a');
      expect(ids).toContain('keep-b');
      expect(ids.length).toBe(2);
    });

    it('should not throw or mutate state when removing a non-existent ID', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'exists' }));

      // Should silently no-op — no crash, no removal
      expect(() => useCarbonStore.getState().removeEvent('ghost-id')).not.toThrow();
      expect(useCarbonStore.getState().events.length).toBe(1);
    });

    it('should result in an empty list after removing the only event', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'solo' }));
      useCarbonStore.getState().removeEvent('solo');
      expect(useCarbonStore.getState().events).toEqual([]);
    });
  });

  // ── clearStore ───────────────────────────────────────────────────────────────

  describe('clearStore', () => {
    it('should wipe all events and return an empty array', () => {
      useCarbonStore.getState().addEvent(makeEvent({ id: 'a' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'b' }));
      useCarbonStore.getState().addEvent(makeEvent({ id: 'c' }));

      expect(useCarbonStore.getState().events.length).toBe(3);

      useCarbonStore.getState().clearStore();

      expect(useCarbonStore.getState().events).toEqual([]);
    });

    it('should be safe to call clearStore on an already-empty store', () => {
      expect(() => useCarbonStore.getState().clearStore()).not.toThrow();
      expect(useCarbonStore.getState().events).toEqual([]);
    });

    it('should not affect dailyBudget when clearing events', () => {
      useCarbonStore.getState().addEvent(makeEvent());
      useCarbonStore.getState().clearStore();
      // Budget is a constant; it must survive a clear.
      expect(useCarbonStore.getState().dailyBudget).toBe(15.0);
    });
  });

  // ── getDailyTotal ─────────────────────────────────────────────────────────────

  describe('getDailyTotal', () => {
    it('should return 0 when no events exist', () => {
      expect(useCarbonStore.getState().getDailyTotal()).toBe(0);
    });

    it('should sum only events from today, excluding older events', () => {
      const now       = Date.now();
      const yesterday = now - 25 * 3600 * 1000; // 25 hours ago — safely yesterday

      // Today: 10 × 0.05 = 0.5 kg CO2e
      useCarbonStore.getState().addEvent(makeEvent({ id: 't1', timestamp: now, rawQuantity: 10, co2eIntensity: 0.05 }));
      // Yesterday: should be excluded
      useCarbonStore.getState().addEvent(makeEvent({ id: 't2', timestamp: yesterday, rawQuantity: 20, co2eIntensity: 0.05 }));

      expect(useCarbonStore.getState().getDailyTotal()).toBe(0.5);
    });

    it('should sum multiple events from today correctly', () => {
      const now = Date.now();
      // 1 × 0.16 = 0.16 kg
      useCarbonStore.getState().addEvent(makeEvent({ id: 'a', timestamp: now, rawQuantity: 1, co2eIntensity: 0.16 }));
      // 2 × 0.35 = 0.7 kg
      useCarbonStore.getState().addEvent(makeEvent({ id: 'b', timestamp: now, rawQuantity: 2, co2eIntensity: 0.35 }));
      // 5 × 1.2  = 6.0 kg
      useCarbonStore.getState().addEvent(makeEvent({ id: 'c', timestamp: now, rawQuantity: 5, co2eIntensity: 1.2 }));

      // 0.16 + 0.7 + 6.0 = 6.86
      expect(useCarbonStore.getState().getDailyTotal()).toBeCloseTo(6.86, 4);
    });

    it('should correctly detect budget exceeded when total > 15 kg', () => {
      const now = Date.now();
      const store = useCarbonStore.getState();
      const budget = store.dailyBudget; // 15.0

      // Add two events totalling 20 kg (4 × 5 kg each)
      store.addEvent(makeEvent({ id: 'heavy-1', timestamp: now, rawQuantity: 10, co2eIntensity: 1.0 }));
      store.addEvent(makeEvent({ id: 'heavy-2', timestamp: now, rawQuantity: 10, co2eIntensity: 1.0 }));

      const total = useCarbonStore.getState().getDailyTotal();
      expect(total).toBe(20.0);
      expect(total).toBeGreaterThan(budget); // Over budget
    });

    it('should return 0 for getDailyTotal after clearStore', () => {
      useCarbonStore.getState().addEvent(makeEvent({ rawQuantity: 5, co2eIntensity: 2 }));
      useCarbonStore.getState().clearStore();
      expect(useCarbonStore.getState().getDailyTotal()).toBe(0);
    });
  });
});
