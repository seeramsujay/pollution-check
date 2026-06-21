/**
 * @file csvParser.ts
 * @description Parses bank/credit card statement CSV exports into carbon events.
 *
 * # Algorithm Overview
 * 1. Splits the CSV into header row and data rows.
 * 2. Validates that `date`, `description`, and `amount` columns are present.
 * 3. For each data row, attempts to match the transaction to a carbon factor using:
 *    a. ISO 18245 Merchant Category Code (MCC) — when the `mcc` column is present.
 *    b. Keyword substring match against the transaction description.
 *    c. Falls back to the `generic` retail factor if no match is found.
 * 4. Constructs and returns an array of `CarbonEvent` objects ready for the store.
 *
 * # CSV Format
 * The input CSV must contain these required headers (case-insensitive):
 * - `date`        → ISO 8601 date string (e.g. 2024-06-20)
 * - `description` → Merchant or transaction name
 * - `amount`      → Transaction amount in USD (positive or negative)
 *
 * Optional headers:
 * - `mcc`         → 4-digit ISO 18245 Merchant Category Code
 *
 * # Privacy Note
 * All parsing is performed in the browser. No CSV data is sent to any server.
 *
 * @module csvParser
 */

import type { CarbonEvent } from '../store/carbonStore';
import { FINANCIAL_CARBON_DICT, MCC_MAPPING } from '../constants/carbonEmissions';

/**
 * Parses a raw CSV string from a financial statement into carbon ledger events.
 *
 * Time complexity: O(N × M) where N = number of rows, M = number of dict keys.
 * In practice M ≈ 20 and N ≤ thousands, so this is effectively linear.
 *
 * @param csvText - Raw CSV file content as a string (UTF-8).
 * @returns Array of fully hydrated `CarbonEvent` objects.
 * @throws {Error} If required headers (`date`, `description`, `amount`) are missing.
 *
 * @example
 * const csv = `date,description,amount\n2024-06-20,Trader Joes,25.00`;
 * const events = parseFinancialCSV(csv);
 * // → [{ category: 'Groceries', co2eIntensity: 0.35, totalCo2e: 8.75, ... }]
 */
export function parseFinancialCSV(csvText: string): CarbonEvent[] {
  const events: CarbonEvent[] = [];

  // Split on both Windows (\r\n) and Unix (\n) line endings for compatibility.
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // ── Header Parsing ────────────────────────────────────────────────────────
  // Normalize headers: lowercase, trim whitespace, strip surrounding quotes.
  // This handles common CSV exports from banks (Mint, Chase, Bank of America).
  const headers = lines[0]
    .toLowerCase()
    .split(',')
    .map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const dateIdx   = headers.indexOf('date');
  const descIdx   = headers.indexOf('description');
  const amountIdx = headers.indexOf('amount');
  const mccIdx    = headers.indexOf('mcc'); // Optional — may be -1

  // Validate required columns before processing any rows.
  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error('CSV missing required headers: date, description, amount');
  }

  // ── Row Processing ────────────────────────────────────────────────────────
  // Start from index 1 to skip the header row.
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();

    // Skip blank lines (common at end of CSV exports).
    if (!row) continue;

    // Split on commas, but respect values enclosed in double quotes.
    // Regex: split on commas not inside an even number of double quotes.
    const columns = row
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((col) => col.trim().replace(/^["']|["']$/g, ''));

    // Skip rows with fewer columns than headers (malformed rows).
    if (columns.length < headers.length) continue;

    const rawDate   = columns[dateIdx];
    const rawDesc   = columns[descIdx];
    const rawMcc    = mccIdx !== -1 ? columns[mccIdx] : undefined;

    // Use absolute value — bank exports mix positive and negative amounts
    // depending on whether debit/credit convention is used.
    const rawAmount = Math.abs(parseFloat(columns[amountIdx]));

    // Skip rows with unparseable amounts (e.g. header repeated mid-file).
    if (isNaN(rawAmount)) continue;

    // ── Emission Factor Matching ──────────────────────────────────────────
    // Priority 1: MCC code (most authoritative — assigned by payment network)
    // Priority 2: Keyword in description (substring match, alphanumeric only)
    // Priority 3: Generic retail fallback
    let matchedKey = 'generic';

    if (rawMcc && MCC_MAPPING[rawMcc]) {
      // Direct MCC lookup — highly reliable
      matchedKey = MCC_MAPPING[rawMcc];
    } else {
      // Strip non-alphanumeric chars from description for flexible matching
      // (handles "TRADER JOE'S #123" → "traderjoes123")
      const cleanDesc = rawDesc.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dictKeys  = Object.keys(FINANCIAL_CARBON_DICT);

      for (let k = 0; k < dictKeys.length; k++) {
        const cleanKey = dictKeys[k].replace(/[^a-z0-9]/g, '');
        if (cleanDesc.includes(cleanKey)) {
          matchedKey = dictKeys[k];
          break; // Use the first match — dict is ordered by specificity
        }
      }
    }

    // Resolve the emission metadata for the matched key.
    const mapMeta = FINANCIAL_CARBON_DICT[matchedKey] || FINANCIAL_CARBON_DICT['generic'];

    // Parse the date — fall back to now() if the format is unrecognized.
    const timestamp = Date.parse(rawDate) || Date.now();

    events.push({
      id:           crypto.randomUUID(),
      timestamp,
      source:       'financial',
      category:     mapMeta.category,
      description:  rawDesc,
      rawQuantity:  rawAmount,
      rawUnit:      'usd',
      co2eIntensity: mapMeta.intensity,
      // Inline totalCo2e here because FinancialParser constructs events directly,
      // bypassing store.addEvent() until the user clicks "Commit to Ledger".
      totalCo2e:    Number((rawAmount * mapMeta.intensity).toFixed(4)),
      metadata: {
        mcc:      rawMcc,
        merchant: matchedKey,
      },
    });
  }

  return events;
}
