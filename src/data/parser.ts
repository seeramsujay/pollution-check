/**
 * @file parser.ts
 * @description Parses Google Takeout Semantic Location History JSON files into
 * structured activity receipts for carbon emission calculation.
 *
 * # Input Format
 * Google exports location history as monthly JSON files stored at:
 * `Takeout/Location History/Semantic Location History/YYYY/YYYY_MONTH.json`
 *
 * The file structure looks like:
 * ```json
 * {
 *   "timelineObjects": [
 *     {
 *       "activitySegment": {
 *         "activityType": "IN_PASSENGER_VEHICLE",
 *         "distance": 15000,
 *         "confidence": "HIGH",
 *         "duration": {
 *           "startTimestamp": "2024-06-20T10:00:00.000Z",
 *           "endTimestamp":   "2024-06-20T10:30:00.000Z"
 *         }
 *       }
 *     },
 *     { "placeVisit": { ... } }  ← ignored; only activitySegments are processed
 *   ]
 * }
 * ```
 *
 * # Filtering Rules
 * - Only `activitySegment` objects are processed (not `placeVisit`).
 * - Segments with `confidence === 'LOW'` are skipped. Low-confidence segments
 *   often result from GPS jumps (indoor multi-path, tunnel entry) and can
 *   produce wildly inaccurate distances — e.g. a 500 km "drive" across a city.
 * - Segments missing `startTimestamp` or `endTimestamp` are discarded.
 *
 * # Privacy
 * No coordinates, visit details, or place names are extracted or stored.
 * Only the activity type, distance, duration, and timestamp are used.
 *
 * @module parser
 */

import { TRANSPORT_EMISSION_FACTORS } from '../constants/carbonEmissions';

// ─── Type Definitions ──────────────────────────────────────────────────────────

/**
 * A geographic coordinate pair.
 * Exported for potential use in future map visualization features.
 */
export interface SpatialCoordinate {
  lat: number;
  lon: number;
}

/**
 * A processed activity segment — the output unit of `parseSemanticMonth`.
 * Represents a single transport trip with its associated carbon emission.
 */
export interface ActivityReceipt {
  /**
   * Google's `activityType` string for this segment.
   * Examples: 'IN_PASSENGER_VEHICLE', 'IN_TRAIN', 'WALKING', 'FLYING'.
   */
  type: string;

  /** Total distance covered during this trip in metres (as-reported by Google). */
  distanceMeters: number;

  /**
   * Duration of the trip in seconds.
   * Computed as: `endTimestamp - startTimestamp`.
   */
  durationSeconds: number;

  /**
   * CO2-equivalent emissions for this trip in kilograms.
   * Computed as: `(distanceMeters / 1000) * emissionFactor`.
   * Rounded to 4 decimal places.
   */
  emissionsKg: number;

  /**
   * ISO 8601 timestamp string for the start of the activity segment.
   * Used to populate the `timestamp` field of the resulting `CarbonEvent`.
   */
  timestamp: string;
}

// ─── Parser Function ───────────────────────────────────────────────────────────

/**
 * Parses a Google Takeout Semantic Location History JSON file and extracts
 * all qualifying transport activity segments as `ActivityReceipt` objects.
 *
 * @param jsonContent     - Raw string content of the monthly Takeout JSON file.
 * @param factorRegistry  - Emission factor lookup table (kg CO2e / passenger-km).
 *                          Defaults to `TRANSPORT_EMISSION_FACTORS`. Injectable
 *                          for unit testing with custom factor tables.
 *
 * @returns Array of `ActivityReceipt` objects sorted in original timeline order.
 * @throws {SyntaxError} If `jsonContent` is not valid JSON.
 *
 * @example
 * const jsonText = await file.text();
 * const receipts = parseSemanticMonth(jsonText);
 * // → [{ type: 'IN_TRAIN', distanceMeters: 15000, emissionsKg: 0.5319, ... }]
 */
export function parseSemanticMonth(
  jsonContent: string,
  factorRegistry: Record<string, number> = TRANSPORT_EMISSION_FACTORS,
): ActivityReceipt[] {
  const parsed = JSON.parse(jsonContent);

  // The timeline is the top-level array; default to empty if missing.
  const timelineObjects: any[] = parsed.timelineObjects || [];
  const receipts: ActivityReceipt[] = [];

  for (const obj of timelineObjects) {
    // Skip placeVisit and other non-segment entries.
    if (!obj.activitySegment) continue;

    const segment = obj.activitySegment;

    // ── Confidence Filtering ──────────────────────────────────────────────
    // LOW confidence segments are unreliable GPS detections — often caused
    // by entering a tunnel, multi-path reflections in cities, or device sleep.
    // Skipping them prevents phantom mileage from inflating emissions.
    if (segment.confidence === 'LOW') continue;

    // ── Timestamp Extraction ──────────────────────────────────────────────
    const startTimestamp: string | undefined = segment.duration?.startTimestamp;
    const endTimestamp:   string | undefined = segment.duration?.endTimestamp;

    // Discard segments without a valid duration window — can't calculate
    // durationSeconds or provide a meaningful event timestamp.
    if (!startTimestamp || !endTimestamp) continue;

    // ── Core Metrics ──────────────────────────────────────────────────────
    const type          = (segment.activityType as string) || 'UNKNOWN';
    const distanceMeters = (segment.distance as number) || 0;

    const start          = new Date(startTimestamp);
    const end            = new Date(endTimestamp);
    // Math.max guards against negative durations from malformed timestamps.
    const durationSeconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);

    // ── Emission Calculation ──────────────────────────────────────────────
    const distanceKm = distanceMeters / 1000;

    // Look up the activity type's emission factor. If not in the registry
    // (new activity type from Google API), fall back to the UNKNOWN baseline
    // (conservative passenger vehicle assumption).
    const factor =
      factorRegistry[type] !== undefined
        ? factorRegistry[type]
        : (factorRegistry['UNKNOWN'] ?? 0.16272);

    // Round to 4 decimal places to keep values meaningful at short distances
    // (e.g., a 0.2 km walk shows 0.0000 correctly rather than floating noise).
    const emissionsKg = Number((distanceKm * factor).toFixed(4));

    receipts.push({
      type,
      distanceMeters,
      durationSeconds,
      emissionsKg,
      timestamp: startTimestamp,
    });
  }

  return receipts;
}
