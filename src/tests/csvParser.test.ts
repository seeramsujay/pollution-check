import { describe, it, expect } from 'vitest';
import { parseFinancialCSV } from '../utils/csvParser';

describe('parseFinancialCSV', () => {
  it('should throw an error if required headers date, description, or amount are missing', () => {
    const invalidCSV = `date,description\n2024-01-01,Test Transaction`;
    expect(() => parseFinancialCSV(invalidCSV)).toThrowError(
      'CSV missing required headers: date, description, amount'
    );
  });

  it('should successfully parse valid transaction rows and map descriptions to categories and intensities', () => {
    const validCSV = `date,description,amount\n2024-06-20,Trader Joes Store,25.00\n2024-06-20,Netflix Subscription,12.99`;
    const events = parseFinancialCSV(validCSV);

    expect(events.length).toBe(2);

    const traderJoesEvent = events.find(e => e.description.includes('Trader Joes'));
    expect(traderJoesEvent).toBeDefined();
    expect(traderJoesEvent?.category).toBe('Groceries');
    expect(traderJoesEvent?.co2eIntensity).toBe(0.35); // traderjoes intensity
    expect(traderJoesEvent?.totalCo2e).toBe(8.75); // 25.00 * 0.35

    const netflixEvent = events.find(e => e.description.includes('Netflix'));
    expect(netflixEvent).toBeDefined();
    expect(netflixEvent?.category).toBe('Digital Services');
    expect(netflixEvent?.co2eIntensity).toBe(0.12); // netflix intensity
    expect(netflixEvent?.totalCo2e).toBe(1.5588); // 12.99 * 0.12 = 1.5588
  });

  it('should map Merchant Category Codes (MCC) to categories and intensities', () => {
    const validCSV = `date,description,amount,mcc\n2024-06-20,Random Store,100.00,5411`; // 5411 is Grocery
    const events = parseFinancialCSV(validCSV);

    expect(events.length).toBe(1);
    expect(events[0].category).toBe('Groceries');
    expect(events[0].co2eIntensity).toBe(0.35);
    expect(events[0].totalCo2e).toBe(35.0); // 100 * 0.35
  });

  it('should fallback to generic retail factor when description and MCC do not match any rules', () => {
    const validCSV = `date,description,amount\n2024-06-20,Some Unmapped Merchant,50.00`;
    const events = parseFinancialCSV(validCSV);

    expect(events.length).toBe(1);
    expect(events[0].category).toBe('Retail Operations');
    expect(events[0].co2eIntensity).toBe(0.208); // generic intensity
    expect(events[0].totalCo2e).toBe(10.4); // 50 * 0.208 = 10.4
  });

  it('should correctly ignore empty lines or rows with missing columns', () => {
    const messyCSV = `date,description,amount\n\n2024-06-20,Trader Joes,25.00\n2024-06-20,Messy Row\n\n`;
    const events = parseFinancialCSV(messyCSV);

    expect(events.length).toBe(1);
    expect(events[0].description).toBe('Trader Joes');
  });

  it('should handle negative transaction amounts correctly by using their absolute value', () => {
    const validCSV = `date,description,amount\n2024-06-20,Trader Joes,-15.50`;
    const events = parseFinancialCSV(validCSV);
    expect(events.length).toBe(1);
    expect(events[0].rawQuantity).toBe(15.50);
    expect(events[0].totalCo2e).toBe(5.425); // 15.5 * 0.35 = 5.425
  });
});
