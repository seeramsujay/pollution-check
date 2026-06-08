Roadmap: EcoPulse

Legend
DONE | ACTIVE | BLOCKED | COLAB | LOCAL | RISK

Phases

Phase 1 — Core Infrastructure [LOCAL]
Goal: Establish the PWA shell and global state management.
Depends: none
[ ] Set up Preact + Vite + Tailwind CSS scaffold — Ensure gzipped bundle target is <150KB.
[ ] Implement Zustand `carbonStore` — Core ledger for `CarbonEvent` objects.
[ ] Create `CarbonEvent` TypeScript interfaces — Defines the single format for all auditors.

Phase 2 — Ingestion Engines [LOCAL]
Goal: Implement zero-friction data parsers.
Depends: Phase 1
[ ] Build Google Takeout Location Parser — Optimized for Semantic JSON format.
[ ] Build Linear CSV Financial Parser — Regex-based, zero external dependencies.
[ ] Implement client-side `imageCompressor` — Uses HTML5 canvas to downscale payloads for Edge.

Phase 3 — Vision Audit & Edge Proxy [LOCAL|COLAB]
Goal: Connect vision-based auditing via secure proxy.
Depends: Phase 2
[ ] Deploy Cloudflare Worker Edge Proxy — Injects API keys and calculates token-to-carbon cost.
[ ] Build `VisionAuditor` UI — Handles camera capture and result normalization.
[ ] Calibrate Agricultural Emissions Catalog — Hardcode Poore & Nemecek (2018) factors. Risk: API rate limits on LLM endpoint.

Phase 4 — Model Optimization [COLAB]
Goal: Fine-tune and quantize classification models.
Depends: Phase 3
[ ] Fine-tune DistilBERT for food classification — Run on Colab with GPU.
[ ] Quantize model to 8-bit ONNX — Target <10MB for client-side execution. Colab: required for quantization tools.

Phase 5 — Polish & Deployment [LOCAL]
Goal: Finalize PWA and achieve <10MB repo target.
Depends: Phase 4
[ ] Implement "AI Carbon Cost" meta-feature — Deducts ug CO2e from budget per query.
[ ] Audit repository size — Strip non-essential assets to stay under 10MB.
[ ] Deploy to Vercel/GitHub Pages — Final PWA verification.
