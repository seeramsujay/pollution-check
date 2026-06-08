Roadmap: EcoPulse

Legend
DONE | ACTIVE | BLOCKED | COLAB | LOCAL | RISK

Phases

Phase 1 — Core Infrastructure [LOCAL] [DONE]
Goal: Establish the PWA shell and global state management.
Depends: none
[x] Set up Preact + Vite + Tailwind CSS scaffold — Ensure gzipped bundle target is <150KB.
[x] Implement Zustand `carbonStore` — Core ledger for `CarbonEvent` objects.
[x] Create `CarbonEvent` TypeScript interfaces — Defines the single format for all auditors.

Phase 2 — Ingestion Engines [LOCAL] [DONE]
Goal: Implement zero-friction data parsers.
Depends: Phase 1
[x] Build Google Takeout Location Parser — Optimized for Semantic JSON format.
[x] Build Linear CSV Financial Parser — Regex-based, zero external dependencies.
[x] Implement client-side `imageCompressor` — Uses HTML5 canvas to downscale payloads for Edge.

Phase 3 — Vision Audit & Edge Proxy [LOCAL|COLAB] [DONE]
Goal: Connect vision-based auditing via secure proxy.
Depends: Phase 2
[x] Deploy Cloudflare Worker Edge Proxy — Injects API keys and calculates token-to-carbon cost.
[x] Build `VisionAuditor` UI — Handles camera capture and result normalization.
[x] Calibrate Agricultural Emissions Catalog — Hardcode Poore & Nemecek (2018) factors.

Phase 4 — Model Optimization [COLAB] [DEPRECATED]
Goal: Fine-tune and quantize classification models.
Depends: Phase 3
[x] Architectural Pivot: Replaced client-side neural net runtime with ultra-lightweight client rule engine + secure Cloudflare edge worker. This prevents shipping massive ONNX blobs, maintaining our <10MB repo footprint and safeguarding mobile battery performance.

Phase 5 — Polish & Deployment [LOCAL] [DONE]
Goal: Finalize PWA and achieve <10MB repo target.
Depends: Phase 4
[x] Implement "AI Carbon Cost" meta-feature — Deducts ug CO2e from budget per query.
[x] Audit repository size — Strip non-essential assets to stay under 10MB.
[x] Deploy to Google Cloud Run / Vercel — Final verification.
[x] Design high-fidelity UI made by Stitch and Ge (Kinetic Obsidian palette).
[x] Implement context-aware EcoPulse AI Assistant widget.
