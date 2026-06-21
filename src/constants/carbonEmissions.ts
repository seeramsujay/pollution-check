/**
 * @file carbonEmissions.ts
 * @description Lookup tables for carbon emission intensity factors.
 *
 * All values are expressed in kg CO2e per unit of activity.
 * Sources are cited inline. These constants are shared across all parsers and
 * are the single authoritative source of emission factors in EcoPulse.
 *
 * Methodology notes:
 * - Food factors use lifecycle assessment (LCA) data including land-use change.
 * - Financial factors use spend-based EEIO (Environmentally Extended Input-Output) analysis.
 * - Transport factors use passenger-km passenger-averaged emission coefficients.
 */

// ─── Food & Grocery Emission Factors ──────────────────────────────────────────

/**
 * Maps food category keywords to kg CO2e per kilogram of product.
 *
 * Source: Poore & Nemecek (2018). "Reducing food's environmental impacts
 * through producers and consumers." Science, 360(6392), 987–992.
 * https://doi.org/10.1126/science.aaq0216
 *
 * Used by: VisionAuditor — applied to receipt line items after OCR classification.
 *
 * @example
 * // A 0.35 kg ribeye steak → 0.35 * 60.0 = 21.0 kg CO2e
 * const co2e = VISION_CARBON_DICT['beef'] * quantity_kg;
 */
export const VISION_CARBON_DICT: Record<string, number> = {
  beef:       60.0,  // Highest footprint food: includes methane + land deforestation
  lamb:       24.0,  // High methane from enteric fermentation
  cheese:     21.0,  // Dairy concentration requires significant milk input
  pork:        7.0,  // Omnivorous diet conversion efficiency
  poultry:     6.0,  // Efficient grain conversion; no methane
  rice:        4.0,  // Flooded paddy methane emissions
  avocados:    2.5,  // High water usage and refrigeration logistics
  milk:        3.0,  // Dairy, including methane but averaged across full year
  bread:       1.4,  // Wheat processing and baking energy
  peas:        1.0,  // Legumes fix nitrogen, significantly reducing fertilizer
  vegetables:  0.5,  // Low-input, short cold chain
};

// ─── Financial Spend-Based Emission Factors ────────────────────────────────────

/**
 * Maps merchant keywords (or MCC-resolved keys) to kg CO2e per USD of spend.
 *
 * Source: U.S. EPA Supply Chain Greenhouse Gas Emission Factors (v1.3.0)
 * https://www.epa.gov/climateleadership/supply-chain-ghg-emission-factors-us-industries-and-commodities
 *
 * Methodology: Spend-based EEIO factors. Each dollar spent at a merchant
 * implies a proportional share of that industry's total Scope 1-3 emissions.
 *
 * Used by: FinancialParser — matched against transaction descriptions/MCCs.
 *
 * @example
 * // $25 at Whole Foods → 25 * 0.35 = 8.75 kg CO2e
 * const co2e = FINANCIAL_CARBON_DICT['wholefoods'].intensity * spend_usd;
 */
export const FINANCIAL_CARBON_DICT: Record<string, { intensity: number; category: string }> = {
  // ── Fuel & Transport ──
  gas:       { intensity: 1.20, category: 'Transport (Fuel)' },   // Direct combustion emissions
  fuel:      { intensity: 1.20, category: 'Transport (Fuel)' },
  shell:     { intensity: 1.20, category: 'Transport (Fuel)' },
  chevron:   { intensity: 1.20, category: 'Transport (Fuel)' },
  exxon:     { intensity: 1.20, category: 'Transport (Fuel)' },

  // ── Aviation ──
  delta:     { intensity: 0.80, category: 'Aviation Travel' },    // Includes radiative forcing multiplier
  united:    { intensity: 0.80, category: 'Aviation Travel' },
  american:  { intensity: 0.80, category: 'Aviation Travel' },

  // ── Ride-Sharing ──
  uber:      { intensity: 0.65, category: 'Ride Sharing' },       // Average per-dollar across trip types
  lyft:      { intensity: 0.65, category: 'Ride Sharing' },

  // ── Groceries ──
  wholefoods:  { intensity: 0.35, category: 'Groceries' },        // Organic goods have slightly higher logistics
  traderjoes:  { intensity: 0.35, category: 'Groceries' },
  safeway:     { intensity: 0.35, category: 'Groceries' },
  grocery:     { intensity: 0.35, category: 'Groceries' },        // Generic fallback for unrecognized grocery stores

  // ── Dining Out ──
  restaurant:  { intensity: 0.42, category: 'Dining Out' },       // Includes cooking, waste, service overhead
  mcdonalds:   { intensity: 0.42, category: 'Dining Out' },
  starbucks:   { intensity: 0.42, category: 'Dining Out' },

  // ── Digital / Streaming ──
  netflix:     { intensity: 0.12, category: 'Digital Services' }, // Network + data-center electricity
  spotify:     { intensity: 0.12, category: 'Digital Services' },
  comcast:     { intensity: 0.12, category: 'Digital Services' },

  // ── Catch-all ──
  generic:     { intensity: 0.208, category: 'Retail Operations' }, // EPA average across all retail sectors
};

// ─── Merchant Category Code (MCC) Mapping ─────────────────────────────────────

/**
 * Maps ISO 18245 Merchant Category Codes (MCC) to their corresponding key
 * in `FINANCIAL_CARBON_DICT`. This allows precise categorization when the
 * raw transaction description is ambiguous.
 *
 * MCCs are standardized 4-digit codes assigned by payment networks.
 *
 * @example
 * // MCC '5411' is assigned to grocery stores
 * const dictKey = MCC_MAPPING['5411']; // → 'grocery'
 */
export const MCC_MAPPING: Record<string, string> = {
  '5541': 'gas',        // Automotive Service Stations
  '4511': 'delta',      // Airlines (generic)
  '4121': 'uber',       // Taxicabs and Limousines (includes rideshare)
  '5411': 'grocery',    // Grocery Stores and Supermarkets
  '5812': 'restaurant', // Eating Places and Restaurants
  '4899': 'netflix',    // Cable and Other Pay TV Services
};

// ─── Transport Segment Emission Factors ───────────────────────────────────────

/**
 * Maps Google Takeout `activityType` strings to kg CO2e per passenger-kilometre.
 *
 * Sources:
 * - Bus / Coach: IPCC AR6 WG3 Table 10.6 (2022)
 * - Passenger Vehicle: EPA GHG Inventory (2023), US average light-duty car
 * - Train: UK DEFRA GHG Conversion Factors (2023), national rail
 * - Short-haul Aviation: ICAO Carbon Emission Calculator methodology (2023)
 * - Walking/Cycling/Still: Zero direct tailpipe emissions
 *
 * Used by: TakeoutParser — applied to each activitySegment parsed from the
 * monthly Semantic Location History JSON file.
 *
 * @example
 * // 15 km train journey → 15 * 0.03546 = 0.5319 kg CO2e
 * const co2e = TRANSPORT_EMISSION_FACTORS['IN_TRAIN'] * distanceKm;
 */
export const TRANSPORT_EMISSION_FACTORS: Record<string, number> = {
  'IN_BUS':               0.10385,  // Bus / Motor Coach (passenger average)
  'IN_PASSENGER_VEHICLE': 0.16272,  // Standard petrol car (solo occupancy)
  'IN_TRAIN':             0.03546,  // Intercity electric rail
  'FLYING':               0.12576,  // Short-haul economy seat (< 3,700 km)
  'WALKING':              0.0,      // Zero direct emissions
  'CYCLING':              0.0,      // Zero direct emissions
  'STILL':                0.0,      // Stationary — no transport emissions
  'UNKNOWN':              0.16272,  // Conservative fallback: assume passenger vehicle
};
