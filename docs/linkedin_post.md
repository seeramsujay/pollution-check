# 🚀 Introducing EcoPulse: The Privacy-First, Zero-Friction Carbon Auditor

Most personal carbon trackers fail for two reasons:
1. **Self-reporting fatigue**: No one wants to manually log every single cup of coffee or daily commute.
2. **Privacy intrusion**: You shouldn't have to link your live bank account to an unsecure cloud API just to track your emissions.

To solve this, I built **EcoPulse** — a Progressive Web App (PWA) designed to audit your footprint using digital artifacts you *already* own (Google Takeout location records, bank statement exports, and grocery receipts), running **entirely in the browser**.

👉 **Check out the repo here**: [seeramsujay/pollution-check](https://github.com/seeramsujay/pollution-check)

---

### 🛡️ Core Philosophy: Absolute Data Privacy
EcoPulse is built on a **local-first** philosophy. When you import your Google location history or bank CSVs, the data is processed strictly in your browser's memory sandbox. Zero bytes are uploaded to external datastores.

### ⚡ Key Features & Ingest Engines:
* **📍 Google Takeout Location Auditor**: Parses monthly Semantic JSON maps, filtering out coordinate drift, and calculating precise transit footprints (rail, flight, car) using **IPCC AR6** emission coefficients.
* **💳 Bank Statement spend-to-CO2 translator**: Translates standard statement CSVs into footprint events by matching Merchant Category Codes (MCC) to EPA Supply Chain NAICS intensity indexes.
* **📸 Split-Screen Receipt Scanner**: Takes a raw photo of a grocery receipt, downscales it to `<200KB` via HTML5 canvas, and routes it to an edge proxy for itemization.
* **🧠 Real-Time AI Carbon Cost**: Because AI query execution has a physical footprint, EcoPulse calculates the actual electricity and grid-equivalent emissions of the LLM inference query itself and logs it against your daily limit (AI Inception!).
* **💬 Context-Aware AI Assistant**: A local-compute dashboard assistant that trace-audits your ledger to identify dietary or travel anomalies and suggests specific replacement plans (e.g. swapping beef to poultry or adjusting streaming parameters).

---

### 📈 Engineering Metrics:
As a green computing advocate, the application itself had to be carbon-efficient:
* **Bundler & Core**: Built with **Preact + Vite + TypeScript**.
* **Styles**: Utility styled using **Tailwind CSS v4** implementing a sleek Kinetic Obsidian design theme.
* **Size**: The entire production JS bundle compiles to just **25.75 kB (gzipped)**! 
* **State Management**: Scaled lightweight using **Zustand** memory stores.
* **Deployment**: Fully containerized with **Docker** and multi-stage Nginx builds, optimized to scale to zero on **Google Cloud Run** for zero baseline cost.

Personal carbon auditing shouldn't cost you your privacy or your battery. EcoPulse proves that we can build smart, context-aware tools that respect both.

I’d love to hear your thoughts! What files or data exports do you think we should support next?

#GreenTech #WebDev #TypeScript #PrivacyFirst #OpenSource #Sustainability #Preact #CloudRun
