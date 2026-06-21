/**
 * @file csvParser.test.ts
 * @description Unit tests for the financial CSV parser.
 *
 * These tests validate the core behaviors of `parseFinancialCSV`:
 * - Header validation and error throwing
 * - Description-based merchant keyword matching
 * - MCC (Merchant Category Code) priority matching
 * - Generic fallback for unrecognized merchants
 * - Robustness against malformed rows and negative amounts
 *
 * All expected totalCo2e values are manually verified using the formula:
 * `totalCo2e = Math.abs(amount) × co2eIntensity`
 */

import { describe, it, expect } from 'vitest';
import { parseFinancialCSV } from '../utils/csvParser';

describe('parseFinancialCSV', () => {

  // ── Input Validation ───────────────────────────────────────────────────────

  it('should throw an error when required headers (date, description, amount) are missing', () => {
    // CSV with only `date` and `description` — missing `amount`
    const invalidCSV = `date,description\n2024-01-01,Test Transaction`;

    expect(() => parseFinancialCSV(invalidCSV)).toThrowError(
      'CSV missing required headers: date, description, amount',
    );
  });

  // ── Description Keyword Matching ───────────────────────────────────────────

  it('should match transaction descriptions to emission categories and intensities', () => {
    const validCSV = [
      'date,description,amount',
      '2024-06-20,Trader Joes Store,25.00',    // → 'Groceries' @ 0.35 kg/$
      '2024-06-20,Netflix Subscription,12.99', // → 'Digital Services' @ 0.12 kg/$
    ].join('\n');

    const events = parseFinancialCSV(validCSV);
    expect(events.length).toBe(2);

    // Trader Joe's: 25.00 × 0.35 = 8.75 kg CO2e
    const grocery = events.find((e) => e.description.includes('Trader Joes'));
    expect(grocery).toBeDefined();
    expect(grocery?.category).toBe('Groceries');
    expect(grocery?.co2eIntensity).toBe(0.35);
    expect(grocery?.totalCo2e).toBe(8.75);

    // Netflix: 12.99 × 0.12 = 1.5588 kg CO2e
    const streaming = events.find((e) => e.description.includes('Netflix'));
    expect(streaming).toBeDefined();
    expect(streaming?.category).toBe('Digital Services');
    expect(streaming?.co2eIntensity).toBe(0.12);
    expect(streaming?.totalCo2e).toBe(1.5588);
  });

  // ── MCC Priority Matching ──────────────────────────────────────────────────

  it('should prioritise MCC code over description keyword matching', () => {
    // MCC 5411 = Grocery Stores — should override the generic description.
    const validCSV = `date,description,amount,mcc\n2024-06-20,Random Store,100.00,5411`;

    const events = parseFinancialCSV(validCSV);
    expect(events.length).toBe(1);

    // MCC 5411 resolves to 'grocery' → 100 × 0.35 = 35.0 kg CO2e
    expect(events[0].category).toBe('Groceries');
    expect(events[0].co2eIntensity).toBe(0.35);
    expect(events[0].totalCo2e).toBe(35.0);
  });

  // ── Generic Fallback ───────────────────────────────────────────────────────

  it('should fall back to the generic retail factor when no keyword or MCC matches', () => {
    const validCSV = `date,description,amount\n2024-06-20,Some Unmapped Merchant,50.00`;

    const events = parseFinancialCSV(validCSV);
    expect(events.length).toBe(1);

    // Generic fallback: 50 × 0.208 = 10.4 kg CO2e (EPA average retail)
    expect(events[0].category).toBe('Retail Operations');
    expect(events[0].co2eIntensity).toBe(0.208);
    expect(events[0].totalCo2e).toBe(10.4);
  });

  // ── Robustness ─────────────────────────────────────────────────────────────

  it('should silently skip blank lines and rows with insufficient columns', () => {
    const messyCSV = [
      'date,description,amount',
      '',                               // Blank line — skip
      '2024-06-20,Trader Joes,25.00',   // Valid row
      '2024-06-20,Messy Row',           // Missing `amount` column — skip
      '',                               // Trailing blank — skip
    ].join('\n');

    const events = parseFinancialCSV(messyCSV);

    // Only the valid Trader Joe's row should be parsed.
    expect(events.length).toBe(1);
    expect(events[0].description).toBe('Trader Joes');
  });

  it('should convert negative transaction amounts to their absolute value', () => {
    // Bank exports commonly use negative values for debit transactions.
    const validCSV = `date,description,amount\n2024-06-20,Trader Joes,-15.50`;

    const events = parseFinancialCSV(validCSV);
    expect(events.length).toBe(1);

    // Absolute value: 15.50 × 0.35 = 5.425 kg CO2e
    expect(events[0].rawQuantity).toBe(15.50);
    expect(events[0].totalCo2e).toBe(5.425);
  });
});
