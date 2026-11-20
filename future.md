# EcoPulse (pollution-check): Future Roadmap & Carbon Accounting Evolution

EcoPulse is a client-side, zero-knowledge carbon footprint audit ledger calculating personal greenhouse gas emissions from financial statements and location history. This document specifies future features.

---

## 1. Automated Bank & Transit Integrations

- **Open Banking API Connectors (Plaid / Teller / Nordigen)**:
  - Add optional local client-side OAuth connections to banks, fetching merchant categorization codes (MCC) dynamically without third-party cloud data persistence.
- **Micro-Transit & EV Telemetry (Tesla / Enode API)**:
  - Ingest real electric vehicle odometer and charging log telemetry, isolating home EV charging emissions using hourly marginal grid intensity factors.

---

## 2. Dynamic Marginal Grid Emission Factors

- **Real-Time Grid Emission Integration (Electricity Maps API)**:
  - Replace static regional electricity emission averages with real-time marginal carbon intensity ($g\text{CO}_2\text{e/kWh}$) updating hourly based on active renewable mix.
- **Product-Level Barcode Carbon Scanner**:
  - Web camera barcode scanner querying Open Food Facts and carbon lifecycle databases (Agribalyse) to log granular grocery item emissions.

---

## 3. Verifiable Offsets & Social Proof

- **Verra / Gold Standard Direct Offset API**:
  - One-click purchase of verified carbon removal credits with cryptographically signed certificates registered to the user's local ledger.
