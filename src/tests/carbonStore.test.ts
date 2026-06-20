import { describe, it, expect, beforeEach } from 'vitest';
import { useCarbonStore } from '../store/carbonStore';

describe('useCarbonStore', () => {
  beforeEach(() => {
    useCarbonStore.getState().clearStore();
  });

  it('should initialize with empty events and a daily budget of 15.0', () => {
    const state = useCarbonStore.getState();
    expect(state.events).toEqual([]);
    expect(state.dailyBudget).toBe(15.0);
  });

  it('should add events correctly and calculate totalCo2e dynamically', () => {
    const store = useCarbonStore.getState();
    store.addEvent({
      id: 'evt-1',
      timestamp: Date.now(),
      source: 'digital',
      category: 'Digital Services',
      description: 'Stream 4K Video',
      rawQuantity: 2,
      rawUnit: 'hours',
      co2eIntensity: 0.16,
      metadata: { apiRoute: 'digital-tracker' }
    });

    const updatedEvents = useCarbonStore.getState().events;
    expect(updatedEvents.length).toBe(1);
    expect(updatedEvents[0].id).toBe('evt-1');
    expect(updatedEvents[0].totalCo2e).toBe(0.32); // 2 * 0.16
  });

  it('should remove events correctly by ID', () => {
    const store = useCarbonStore.getState();
    store.addEvent({
      id: 'evt-1',
      timestamp: Date.now(),
      source: 'digital',
      category: 'Digital Services',
      description: 'Test Event 1',
      rawQuantity: 1,
      rawUnit: 'hours',
      co2eIntensity: 0.1,
      metadata: {}
    });

    store.addEvent({
      id: 'evt-2',
      timestamp: Date.now(),
      source: 'digital',
      category: 'Digital Services',
      description: 'Test Event 2',
      rawQuantity: 2,
      rawUnit: 'hours',
      co2eIntensity: 0.2,
      metadata: {}
    });

    let currentEvents = useCarbonStore.getState().events;
    expect(currentEvents.length).toBe(2);

    useCarbonStore.getState().removeEvent('evt-1');
    currentEvents = useCarbonStore.getState().events;
    expect(currentEvents.length).toBe(1);
    expect(currentEvents[0].id).toBe('evt-2');
  });

  it('should compute getDailyTotal for events logged today only', () => {
    const store = useCarbonStore.getState();
    const today = Date.now();
    const yesterday = Date.now() - 24 * 3600 * 1000;

    store.addEvent({
      id: 'evt-today',
      timestamp: today,
      source: 'digital',
      category: 'Digital Services',
      description: 'Event Today',
      rawQuantity: 10,
      rawUnit: 'gb',
      co2eIntensity: 0.05,
      metadata: {}
    });

    store.addEvent({
      id: 'evt-yesterday',
      timestamp: yesterday,
      source: 'digital',
      category: 'Digital Services',
      description: 'Event Yesterday',
      rawQuantity: 20,
      rawUnit: 'gb',
      co2eIntensity: 0.05,
      metadata: {}
    });

    const dailyTotal = useCarbonStore.getState().getDailyTotal();
    expect(dailyTotal).toBe(0.5); // Only today: 10 * 0.05 = 0.5
  });
});
