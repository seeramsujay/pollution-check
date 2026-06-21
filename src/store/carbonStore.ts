/**
 * @file carbonStore.ts
 * @description Global Zustand store for managing the carbon event ledger.
 *
 * This store is the single source of truth for all carbon events ingested
 * by EcoPulse. It is designed to be local-first — no data leaves the browser.
 * Events are stored in memory and lost on page reload (intentional for privacy).
 *
 * Architecture decision: Zustand was chosen over Context API for its
 * subscription-based selector model, which prevents unnecessary re-renders in
 * large component trees (e.g. the history view rendering 100+ events).
 */

import { create } from 'zustand';

// ─── Type Definitions ──────────────────────────────────────────────────────────

/**
 * The origin of a carbon event — determines which parser produced it.
 * - `vision`    → Receipt photo scanned via VisionAuditor (OCR)
 * - `financial` → Bank statement row parsed via FinancialParser (CSV)
 * - `digital`   → Network/streaming/manual log via DigitalTracker
 * - `travel`    → Location history segments parsed via TakeoutParser
 * - `food`      → Receipt items parsed via VisionAuditor
 * - `finance`   → Transactions parsed via FinancialParser
 */
export type CarbonSourceType = 'vision' | 'financial' | 'digital' | 'travel' | 'food' | 'finance';

/**
 * Physical units associated with `rawQuantity`.
 * - `kg`    → Weight in kilograms (food, product)
 * - `usd`   → Dollar spend (financial statement)
 * - `gb`    → Gigabytes of network data transferred
 * - `hours` → Duration of a digital service (streaming, conferencing)
 * - `km`    → Distance in kilometers (travel segments)
 */
export type CarbonUnitType = 'kg' | 'usd' | 'gb' | 'hours' | 'km';

/**
 * Represents a single carbon-emitting activity that has been audited and
 * added to the personal ledger. All values are immutable once committed.
 */
export interface CarbonEvent {
  /** Universally unique identifier generated at creation time via `crypto.randomUUID()`. */
  id: string;

  /** Unix timestamp (ms) when the activity occurred or was recorded. */
  timestamp: number;

  /** The ingestion pipeline that produced this event. */
  source: CarbonSourceType;

  /**
   * Semantic category used for dashboard grouping and color-coding.
   * Examples: 'Transport', 'Groceries', 'Dining Out', 'Digital Services'.
   */
  category: string;

  /** Human-readable description of the specific activity or item. */
  description: string;

  /** The raw measurement of the activity (e.g. spend amount, kg of food, GB of data). */
  rawQuantity: number;

  /** The physical unit that `rawQuantity` is measured in. */
  rawUnit: CarbonUnitType;

  /**
   * CO2-equivalent emission factor for this activity type.
   * Unit: kg CO2e emitted per one `rawUnit` of the activity.
   * Sources: Poore & Nemecek (2018), EPA EEIO, IEA 2023 Grid.
   */
  co2eIntensity: number;

  /**
   * Total CO2-equivalent emission for this specific event.
   * Derived value: `rawQuantity * co2eIntensity`, rounded to 4 decimal places.
   * Calculated by the store on `addEvent()` to keep components free of math.
   */
  totalCo2e: number;

  /** Optional parser-specific provenance metadata for audit trail purposes. */
  metadata: {
    /** ISO 4217 Merchant Category Code from the financial transaction. */
    mcc?: string;
    /** Matched merchant key from the FINANCIAL_CARBON_DICT lookup. */
    merchant?: string;
    /** Model confidence score (0–1) from the OCR or classification pass. */
    confidenceScore?: number;
    /** Number of LLM tokens consumed by the vision API call. */
    tokensConsumed?: number;
    /** Network type associated with data transfer events. */
    networkType?: 'wifi' | 'cellular';
    /** The internal pipeline route identifier that created this event. */
    apiRoute?: string;
  };
}

// ─── Store Interface ────────────────────────────────────────────────────────────

/**
 * Shape of the Zustand carbon store — state fields and action functions.
 */
interface CarbonState {
  /** Ordered list of all committed carbon events (newest first). */
  events: CarbonEvent[];

  /**
   * Daily carbon budget ceiling in kg CO2e.
   * Default: 15 kg — derived from the UN's sustainable development target
   * of ~5.5t CO2e/year per person, distributed over 365 days.
   */
  dailyBudget: number;

  /**
   * Commits a new carbon event to the ledger.
   * Automatically computes and injects `totalCo2e` from rawQuantity × co2eIntensity.
   * Events are prepended so the newest event appears first in lists.
   *
   * @param event - All CarbonEvent fields except `totalCo2e` (derived here).
   */
  addEvent: (event: Omit<CarbonEvent, 'totalCo2e'>) => void;

  /**
   * Removes a single event from the ledger by its ID.
   * Used in the history view for individual event deletion.
   *
   * @param id - The `CarbonEvent.id` to remove.
   */
  removeEvent: (id: string) => void;

  /**
   * Wipes the entire event ledger, restoring the store to its initial state.
   * Used by the "Reset" button and before loading demo data.
   */
  clearStore: () => void;

  /**
   * Computes the sum of `totalCo2e` for all events that occurred today.
   * Uses midnight-normalized date comparison to avoid timezone boundary issues.
   *
   * @returns Total kg CO2e emitted today.
   */
  getDailyTotal: () => number;
}

// ─── Store Implementation ───────────────────────────────────────────────────────

export const useCarbonStore = create<CarbonState>((set, get) => ({
  events: [],

  // 15 kg CO2e / day — aligned with UN SDG 13 sustainable development targets.
  dailyBudget: 15.0,

  addEvent: (newEvent) => {
    // Derive totalCo2e here to keep this calculation out of individual parsers.
    // Rounding to 4dp preserves scientific precision while avoiding float noise.
    const calculatedEvent: CarbonEvent = {
      ...newEvent,
      totalCo2e: Number((newEvent.rawQuantity * newEvent.co2eIntensity).toFixed(4)),
    };

    // Prepend to array — newest events should appear at the top of the ledger.
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
    // Normalize to midnight to group all events in the same calendar day,
    // regardless of the exact time they were logged.
    const todayMidnight = new Date().setHours(0, 0, 0, 0);

    return get().events
      .filter((evt) => new Date(evt.timestamp).setHours(0, 0, 0, 0) === todayMidnight)
      .reduce((sum, evt) => sum + evt.totalCo2e, 0);
  },
}));
