# ⚡ EcoPulse

**Universal Carbon Auditor — Private, Automated, High-Performance.**

🔗 **Live Demo:** [https://pollution-check-site-453397284615.us-central1.run.app](https://pollution-check-site-453397284615.us-central1.run.app)

EcoPulse is a Progressive Web App (PWA) carbon auditing platform designed to automate environmental footprint tracking with zero user friction and absolute data privacy. It parses Google Location History exports, bank statement CSVs, and receipt photos locally in the browser, ledgering them against a **15kg daily CO2e budget** representing the global target for climate stabilization.

---

## 🏛️ Challenge Vertical & Project Soul
EcoPulse sits in the **Personal Carbon Ledger & Sustainability Ingestion** vertical. 

Existing personal carbon trackers fail due to "self-reporting fatigue" (requiring users to manually log every meal or commute) or invasive cloud linkages (requiring continuous, unsecure bank API connections). EcoPulse resolves both pain points by auditing digital artifacts that users already possess, executing all computations local-first inside the browser.

---

## 🎯 Challenge Expectations & Architecture Alignment

EcoPulse is designed from the ground up to address all requirements of the challenge:

### 1. Smart, Dynamic Assistant
We have implemented the **EcoPulse AI Assistant**, an interactive dashboard agent. It operates local-first (guaranteeing user privacy) and dynamically audits the live carbon ledger. Rather than static boilerplate advice, the assistant generates responsive insights based on the exact files the user has ingested.

### 2. Logical Decision Making Based on User Context
The assistant analyzes the local Zustand state to trace emission hotspots:
* **Dietary Context**: Detects meat purchases (beef, pork, lamb) and suggests substitution plans using IPCC AR6 environmental impact metrics.
* **Travel Context**: Detects vehicle and air commutes and maps specific green alternatives (high-speed rail, public transit, walking bounds).
* **Digital Context**: Scans network throughput and video streaming hours, offering practical settings guidelines (e.g., UHD downscaling details) to reduce server overhead.

### 3. Practical and Real-World Usability
EcoPulse bypasses manual estimation forms by parsing files users already have:
* **Google Takeout Location History** (Travel metrics mapped to distance with noise filtering)
* **Standard Bank Statement CSVs** (Financial spend translated to NAICS intensity indexes)
* **Grocery Receipt Photos** (Downsampled locally and processed via Edge OCR)

### 4. Clean and Maintainable Code
The app has a highly modular architecture:
* **State Layer**: Decoupled Zustand store (`src/store/carbonStore.ts`) manages ledger transactions.
* **Ingestion Layer**: Decoupled parsers parse files and map records to standard `CarbonEvent` shapes.
* **Performance Bound**: Employs Preact and Tailwind CSS v4, yielding an compiled, gzipped bundle under **150KB** (complying with repository size restrictions).

---

## 🛠️ How It Works & Directory Structure

```
pollution-check/
├── Dockerfile                   # Multi-stage production container build configuration
├── nginx.conf                   # Nginx config with Gzip compression and client-side routing
├── edge/
│   └── audit-proxy.ts           # Cloudflare Worker proxying LLM & token-to-carbon cost
├── src/
│   ├── components/              # Decoupled UI components
│   │   ├── DigitalTracker.tsx   # Digital energy formulas & manual overrides
│   │   ├── FinancialParser.tsx  # Bank CSV statement parser & previewer
│   │   ├── TakeoutParser.tsx    # Google Takeout location history importer
│   │   └── VisionAuditor.tsx    # Canvas photo optimizer, API caller, and mock processor
│   ├── constants/
│   │   └── carbonEmissions.ts   # Hardcoded emission factors (GWP AR6) and MCC mappings
│   ├── data/
│   │   └── parser.ts            # Google Takeout JSON parser with low-confidence filtering
│   ├── store/
│   │   └── carbonStore.ts       # Zustand carbon ledger and budget state store
│   ├── app.tsx                  # Dashboard container & budget visual loop
│   ├── index.css                # Tailwind CSS v4 entry point
│   └── main.tsx                 # Bootstrapping React root node
```

### Ingestion Logic
1. **Google Takeout Location History**: Reads a monthly JSON file. It extracts travel duration and distance (O(N) complexity), filters out points with `LOW` confidence coordinates to prevent signal-drift, and multiplies distance by GWP-AR6 transit emission factors.
2. **Financial Statements**: Parses standard CSV ledgers. It attempts to match Merchant Category Codes (MCC) to categories, falls back to substring matches on merchant descriptions, and applies EPA Supply Chain intensity factors ($ spend to kg CO2e).
3. **Receipt Photos**: Uses an HTML5 Canvas to downsample photo uploads to `<200KB` base64 payloads inside the browser. The payload is sent to the Cloudflare Worker proxy where `gpt-4o-mini` extracts items. It then calculates the carbon footprint of the AI inference query itself and adds it to the ledger (AI inception feature). A built-in mock simulation runs automatically when offline or if API keys are missing to ensure testability.
4. **Digital Services**: Implements first-principles equations converting network data throughput (GBs) and active streaming/video call times (hours) into direct electrical footprints and grid carbon equivalents.

---

## 🔍 Key Scientific Assumptions
* **GWP Vintage**: Carbon calculations are aligned with the **IPCC 6th Assessment Report (AR6)** values to prevent calculation drift.
* **Agricultural Emissions**: Hardcoded food emission factors are derived from the **Poore & Nemecek (2018)** meta-analysis.
* **Financial Multipliers**: Monetary carbon intensities conform to the **US EPA Supply Chain Greenhouse Gas Emission Factors v1.3 by NAICS-6**.
* **AI Carbon Footprint**: Model inference is calculated based on H100 GPU cluster stats (2.0 Wh/M input tokens, 9.9 Wh/M output tokens) multiplied by a hyperscale power usage effectiveness (PUE) of 1.1 and Northern Virginia (US East) grid intensity (365.13 micro-grams CO2e/Wh).

---

## 🚀 Local Installation & Testing

Verify that you have Node.js and `pnpm` installed, then run:

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm run dev

# Run unit tests (Vitest suite)
pnpm run test

# Build production bundle (<150KB gzipped limit)
pnpm run build
```

---

## 🧪 Quality Assurance & Test Coverage

EcoPulse includes a rigorous test suite built on Vitest to guarantee parser accuracy, calculation correctness, and store safety. The suite executes **74 unit tests** covering three major core engines:

1. **Carbon Event Ledger (`src/tests/carbonStore.test.ts`)**
   * **Calculations**: Verifies mathematical derivations ($rawQuantity \times co2eIntensity$) and rounds outputs to 4 decimal places to prevent floating-point drift.
   * **Operations**: Validates newest-first event queue sorting, safe deletion of non-existent event IDs, store wipe commands, and budget overflow indicators.
2. **Bank Statement parser (`src/tests/csvParser.test.ts`)**
   * **Format Robustness**: Handles CRLF endings, multi-line quoted entries containing commas, blank lines, and incomplete rows.
   * **Priority Matching**: Asserts that Category Codes (MCC 5411, 5541, 4511, 5812) successfully override text description keywords.
   * **Fallbacks**: Validates custom intensity factors and ensures random UUID Generation for events conforms strictly to RFC-4122 (UUID v4).
3. **Location History Parser (`src/tests/takeoutParser.test.ts`)**
   * **Data Ingestion**: Ignores `placeVisit` coordinates and isolates `activitySegment` blocks. Rejecting signals marked with `LOW` confidence coordinates.
   * **Travel Footprint**: Tests GWP-AR6 factors across seven transit models. Zeroes out non-combustion activities (WALKING, CYCLING, STILL).
   * **Injectability**: Supports custom emission registries for sandboxed testing.

---

## ♿ WCAG Accessibility Standards

EcoPulse is optimized to meet high standards of web accessibility (WCAG 2.1 AA compliant) for users relying on assistive technologies:

* **Semantic Structure**: All interface blocks are enclosed in native HTML5 landmark tags (`<section>`, `<article>`, `<header>`) allowing screen readers to quickly scan the page layout.
* **Dynamic Content Announcements**: Operations that alter the state of the UI—such as the typing indicator, file processing progression, and parsed item lists—utilize ARIA Live regions (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) to announce state changes.
* **Form & Input Associations**: Inputs use descriptive labels and `aria-describedby` links pointing to instruction texts. The digital and manual logging inputs are grouped within semantic `<fieldset>` elements complete with visual-hidden `<legend>` prompts for voice and Braille readouts.
* **Accessible Tables**: Layout data tables employ standard row/column headers linked via explicit `scope` attributes, wrapped in `<figure>` and `<figcaption>` elements for clear contextual explanations.
* **Visual Adaptations**: Elements avoid CSS display-none for screen-reader-only labels, utilizing Tailwind-compatible `sr-only` styles to deliver descriptive timestamps and ingestion alerts.

---

## ☁️ Google Cloud Deployment Guide

EcoPulse is dockerized and optimized to run on **Google Cloud Run**, which provides serverless scaling (scaling to zero when inactive for zero baseline cost).

### Prerequisites
* Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
* Initialize your project: `gcloud init`

### 1. Build and Submit the Container to Artifact Registry
Replace `PROJECT_ID` with your Google Cloud Project ID and `REPO_NAME` with your Artifact Registry repository name:

```bash
# Configure Docker to authenticate with Google Cloud
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the container image locally
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/ecopulse:latest .

# Push the container image to Artifact Registry
docker push us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/ecopulse:latest
```

*Alternatively, you can build directly on Google Cloud using Cloud Build:*
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/ecopulse:latest .
```

### 2. Deploy to Google Cloud Run
Deploy the container to Cloud Run with public access:

```bash
gcloud run deploy ecopulse \
    --image us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/ecopulse:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080
```

Once deployment completes, the CLI will output a secure HTTPS Service URL (for example, our live instance: `https://pollution-check-site-453397284615.us-central1.run.app`) where your live Google Cloud website is active!
