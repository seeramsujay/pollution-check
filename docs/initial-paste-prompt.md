Onboarding Prompt: EcoPulse

You are working on EcoPulse. Here is everything you need to operate effectively.

What This Is
EcoPulse is a lightweight PWA carbon auditor that automates footprint tracking. It parses Google location history, bank CSVs, and receipt photos locally to provide a private, zero-friction environmental ledger against a 15kg daily budget.

Current State
Phase 1 (Infrastructure) is defined. Core parsers for Google Takeout and Financial CSVs are the immediate priority. The project is in the initial development phase.

Your Constraints
Hardware: MacBook Air 2017. No local GPU. No local torch/training.
Offload: Model training, 8-bit quantization, and heavy dataset preprocessing must go to Google Colab.
Language/stack: Preact, TypeScript, Tailwind CSS, Zustand, Vite.
Style: Atomic components, Preact Signals for reactivity, zero-dependency utility functions.

Active Task
[FILL: current task]

Files to Read First
1. `idea.md` - To understand the project soul and non-negotiables.
2. `roadmap.md` - To see the execution plan.
3. `skill-takeout-parser.md` - For the first core ingestion implementation.

Never Do
- Never run `torch` or `transformers` training loops locally.
- Never add heavy UI libraries that push the bundle over 150KB gzipped.
- Never compromise user privacy by sending raw PII to external servers (always use the Edge Proxy for vision tasks).
- Never use dynamic runtime lookups for emission factors without the "Immutable Receipt" pattern.
