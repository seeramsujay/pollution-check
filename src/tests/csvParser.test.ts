/**
 * @file csvParser.test.ts
 * @description Comprehensive unit tests for the financial CSV parser.
 *
 * Test coverage includes:
 * - Header validation (missing fields, case-insensitivity)
 * - MCC priority over description keyword matching
 * - All known merchant keyword matches
 * - Generic fallback for unmapped merchants
 * - Negative amount handling (absolute value)
 * - Quoted fields containing commas
 * - Empty CSV / header-only CSV
 * - Malformed rows skipped gracefully
 * - Correct field mapping: source, rawUnit, timestamp, metadata
 */

import { describe, it, expect } from 'vitest';
import { parseFinancialCSV } from '../utils/csvParser';

describe('parseFinancialCSV', () => {

  // ── Input Validation ──────────────────────────────────────────────────────────

  describe('header validation', () => {
    it('should throw when `amount` column is missing', () => {
      expect(() => parseFinancialCSV(`date,description\n2024-01-01,Test`))
        .toThrowError('CSV missing required headers: date, description, amount');
    });

    it('should throw when `date` column is missing', () => {
      expect(() => parseFinancialCSV(`description,amount\nTrader Joes,25.00`))
        .toThrowError('CSV missing required headers: date, description, amount');
    });

    it('should throw when `description` column is missing', () => {
      expect(() => parseFinancialCSV(`date,amount\n2024-01-01,25.00`))
        .toThrowError('CSV missing required headers: date, description, amount');
    });

    it('should return an empty array for a header-only CSV with no data rows', () => {
      const result = parseFinancialCSV(`date,description,amount`);
      expect(result).toEqual([]);
    });

    it('should return an empty array for a completely empty string', () => {
      const result = parseFinancialCSV('');
      expect(result).toEqual([]);
    });

    it('should accept case-insensitive headers (e.g. DATE, DESCRIPTION, AMOUNT)', () => {
      const csv = `DATE,DESCRIPTION,AMOUNT\n2024-06-20,Trader Joes,25.00`;
      expect(() => parseFinancialCSV(csv)).not.toThrow();
      const events = parseFinancialCSV(csv);
      expect(events.length).toBe(1);
    });
  });

  // ── Description Keyword Matching ──────────────────────────────────────────────

  describe('description keyword matching', () => {
    it('should match Trader Joes → Groceries @ 0.35 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Trader Joes Store,25.00`);
      expect(events[0].category).toBe('Groceries');
      expect(events[0].co2eIntensity).toBe(0.35);
      // 25 × 0.35 = 8.75
      expect(events[0].totalCo2e).toBe(8.75);
    });

    it('should match Netflix → Digital Services @ 0.12 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Netflix Subscription,12.99`);
      expect(events[0].category).toBe('Digital Services');
      expect(events[0].co2eIntensity).toBe(0.12);
      // 12.99 × 0.12 = 1.5588
      expect(events[0].totalCo2e).toBe(1.5588);
    });

    it('should match Starbucks → Dining Out @ 0.42 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,STARBUCKS #4492,8.50`);
      expect(events[0].category).toBe('Dining Out');
      expect(events[0].co2eIntensity).toBe(0.42);
    });

    it('should match Shell → Transport (Fuel) @ 1.20 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,SHELL FUEL STATION,55.00`);
      expect(events[0].category).toBe('Transport (Fuel)');
      expect(events[0].co2eIntensity).toBe(1.20);
    });

    it('should match Uber → Ride Sharing @ 0.65 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Uber Trip,22.50`);
      expect(events[0].category).toBe('Ride Sharing');
      expect(events[0].co2eIntensity).toBe(0.65);
    });

    it('should match Delta → Aviation Travel @ 0.80 kg/$', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Delta Airlines Ticket,420.00`);
      expect(events[0].category).toBe('Aviation Travel');
      expect(events[0].co2eIntensity).toBe(0.80);
    });
  });

  // ── MCC Priority Matching ─────────────────────────────────────────────────────

  describe('MCC code matching', () => {
    it('should prioritise MCC 5411 (Grocery) over a generic description', () => {
      const csv = `date,description,amount,mcc\n2024-06-20,Random Store,100.00,5411`;
      const events = parseFinancialCSV(csv);
      expect(events[0].category).toBe('Groceries');
      // 100 × 0.35 = 35.0
      expect(events[0].totalCo2e).toBe(35.0);
    });

    it('should use MCC 5541 (Gas Station) even when description is ambiguous', () => {
      const csv = `date,description,amount,mcc\n2024-06-20,Purchase,60.00,5541`;
      const events = parseFinancialCSV(csv);
      expect(events[0].category).toBe('Transport (Fuel)');
    });

    it('should use MCC 4511 (Airline) → Aviation Travel', () => {
      const csv = `date,description,amount,mcc\n2024-06-20,Online Purchase,500.00,4511`;
      const events = parseFinancialCSV(csv);
      expect(events[0].category).toBe('Aviation Travel');
    });

    it('should use MCC 5812 (Restaurant) → Dining Out', () => {
      const csv = `date,description,amount,mcc\n2024-06-20,Unnamed Vendor,35.00,5812`;
      const events = parseFinancialCSV(csv);
      expect(events[0].category).toBe('Dining Out');
    });

    it('should store mcc and merchant in metadata', () => {
      const csv = `date,description,amount,mcc\n2024-06-20,Grocery Store,50.00,5411`;
      const events = parseFinancialCSV(csv);
      expect(events[0].metadata.mcc).toBe('5411');
      expect(events[0].metadata.merchant).toBe('grocery');
    });
  });

  // ── Generic Fallback ──────────────────────────────────────────────────────────

  describe('generic fallback', () => {
    it('should fall back to Retail Operations @ 0.208 kg/$ for unmapped merchants', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Mystery Vendor XYZ,50.00`);
      expect(events[0].category).toBe('Retail Operations');
      expect(events[0].co2eIntensity).toBe(0.208);
      // 50 × 0.208 = 10.4
      expect(events[0].totalCo2e).toBe(10.4);
    });
  });

  // ── Amount Handling ───────────────────────────────────────────────────────────

  describe('amount handling', () => {
    it('should convert negative amounts to their absolute value', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Trader Joes,-15.50`);
      expect(events[0].rawQuantity).toBe(15.50);
      // 15.5 × 0.35 = 5.425
      expect(events[0].totalCo2e).toBe(5.425);
    });

    it('should skip rows where amount is not a number', () => {
      const csv = `date,description,amount\n2024-06-20,Trader Joes,N/A\n2024-06-20,Netflix,12.99`;
      const events = parseFinancialCSV(csv);
      // Only the Netflix row should survive
      expect(events.length).toBe(1);
      expect(events[0].description).toBe('Netflix');
    });
  });

  // ── Event Field Correctness ───────────────────────────────────────────────────

  describe('output event fields', () => {
    it('should always set source = "finance" and rawUnit = "usd"', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Trader Joes,25.00`);
      expect(events[0].source).toBe('finance');
      expect(events[0].rawUnit).toBe('usd');
    });

    it('should parse valid ISO dates into a numeric timestamp', () => {
      const events = parseFinancialCSV(`date,description,amount\n2024-06-20,Trader Joes,25.00`);
      expect(events[0].timestamp).toBe(Date.parse('2024-06-20'));
    });

    it('should fall back to Date.now() for unparseable date strings', () => {
      const before = Date.now();
      const events = parseFinancialCSV(`date,description,amount\nNOT-A-DATE,Trader Joes,25.00`);
      const after  = Date.now();
      expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ── Robustness ────────────────────────────────────────────────────────────────

  describe('robustness', () => {
    it('should silently skip blank lines', () => {
      const csv = `date,description,amount\n\n2024-06-20,Trader Joes,25.00\n\n`;
      expect(parseFinancialCSV(csv).length).toBe(1);
    });

    it('should skip rows with fewer columns than headers', () => {
      const csv = `date,description,amount\n2024-06-20,Incomplete Row`;
      expect(parseFinancialCSV(csv).length).toBe(0);
    });

    it('should correctly parse quoted fields containing commas', () => {
      // "Trader Joes, Inc." must be treated as a single description field
      const csv = `date,description,amount\n2024-06-20,"Trader Joes, Inc.",30.00`;
      const events = parseFinancialCSV(csv);
      expect(events.length).toBe(1);
      expect(events[0].description).toBe('Trader Joes, Inc.');
      expect(events[0].category).toBe('Groceries');
    });

    it('should handle Windows-style CRLF line endings', () => {
      const csv = `date,description,amount\r\n2024-06-20,Trader Joes,25.00\r\n2024-06-20,Netflix,12.99`;
      const events = parseFinancialCSV(csv);
      expect(events.length).toBe(2);
    });

    it('should generate a unique UUID id for every event', () => {
      const csv = `date,description,amount\n2024-06-20,Trader Joes,25.00\n2024-06-20,Netflix,12.99`;
      const events = parseFinancialCSV(csv);
      expect(events[0].id).not.toBe(events[1].id);
      // UUID v4 format check
      expect(events[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});
