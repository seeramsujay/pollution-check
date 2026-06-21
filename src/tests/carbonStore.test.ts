/**
 * @file carbonStore.test.ts
 * @description Unit tests for the Zustand carbon event store.
 *
 * These tests cover the four core store actions:
 * - Initial state shape and default values
 * - `addEvent()` — including automatic totalCo2e derivation
 * - `removeEvent()` — by ID
 * - `getDailyTotal()` — verifying the today-only filter
 *
 * Each test resets the store via `clearStore()` in `beforeEach` to prevent
 * cross-test state contamination (Zustand stores are module-level singletons).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCarbonStore } from '../store/carbonStore';

describe('useCarbonStore', () => {
  // Reset the store before each test to ensure isolation.
  beforeEach(() => {
    useCarbonStore.getState().clearStore();
  });

  // ── Initialization ─────────────────────────────────────────────────────────

  it('should initialize with empty events and a daily budget of 15.0 kg CO2e', () => {
    const state = useCarbonStore.getState();

    expect(state.events).toEqual([]);
    // 15 kg/day aligns with the UN SDG 13 sustainable development target.
    expect(state.dailyBudget).toBe(15.0);
  });

  // ── addEvent ───────────────────────────────────────────────────────────────

  it('should add an event correctly and auto-calculate totalCo2e from rawQuantity × co2eIntensity', () => {
    const store = useCarbonStore.getState();

    store.addEvent({
      id:           'evt-1',
      timestamp:    Date.now(),
      source:       'digital',
      category:     'Digital Services',
      description:  'Stream 4K Video',
      rawQuantity:  2,          // 2 hours
      rawUnit:      'hours',
      co2eIntensity: 0.16,     // 0.16 kg CO2e per hour (IEA streaming baseline)
      metadata:     { apiRoute: 'digital-tracker' },
    });

    const events = useCarbonStore.getState().events;
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('evt-1');
    // 2 hours × 0.16 kg/hour = 0.32 kg CO2e
    expect(events[0].totalCo2e).toBe(0.32);
  });

  // ── removeEvent ────────────────────────────────────────────────────────────

  it('should remove the correct event by ID, leaving other events intact', () => {
    const store = useCarbonStore.getState();

    // Add two distinct events.
    store.addEvent({
      id: 'evt-1', timestamp: Date.now(), source: 'digital',
      category: 'Digital Services', description: 'Test Event 1',
      rawQuantity: 1, rawUnit: 'hours', co2eIntensity: 0.1, metadata: {},
    });
    store.addEvent({
      id: 'evt-2', timestamp: Date.now(), source: 'digital',
      category: 'Digital Services', description: 'Test Event 2',
      rawQuantity: 2, rawUnit: 'hours', co2eIntensity: 0.2, metadata: {},
    });

    expect(useCarbonStore.getState().events.length).toBe(2);

    // Remove only evt-1; evt-2 must remain.
    useCarbonStore.getState().removeEvent('evt-1');

    const remaining = useCarbonStore.getState().events;
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('evt-2');
  });

  // ── getDailyTotal ──────────────────────────────────────────────────────────

  it('should sum totalCo2e only for events timestamped today, excluding yesterday', () => {
    const store = useCarbonStore.getState();

    const now       = Date.now();
    const yesterday = now - 24 * 3600 * 1000; // Exactly 24 hours ago

    // Today's event: 10 gb × 0.05 kg/gb = 0.5 kg CO2e
    store.addEvent({
      id: 'evt-today', timestamp: now, source: 'digital',
      category: 'Digital Services', description: 'Event Today',
      rawQuantity: 10, rawUnit: 'gb', co2eIntensity: 0.05, metadata: {},
    });

    // Yesterday's event: should not be included in getDailyTotal()
    store.addEvent({
      id: 'evt-yesterday', timestamp: yesterday, source: 'digital',
      category: 'Digital Services', description: 'Event Yesterday',
      rawQuantity: 20, rawUnit: 'gb', co2eIntensity: 0.05, metadata: {},
    });

    const dailyTotal = useCarbonStore.getState().getDailyTotal();

    // Only today's event: 10 × 0.05 = 0.5 kg CO2e
    expect(dailyTotal).toBe(0.5);
  });
});
