Idea: EcoPulse

The Thing
EcoPulse is a high-performance, universal carbon auditor built as a lightweight Progressive Web App. It automatically calculates your environmental footprint by parsing data you already have: Google location history, bank statements, and photos of your grocery receipts.

The End Result
A minimalist, lightning-fast dashboard where a user uploads a file or takes a photo and instantly sees their daily CO2e spending. It feels like a high-speed financial app but for the planet, with clear progress bars against a 15kg daily budget and actionable advice based on detected patterns. Working means a 5MB receipt is processed into a carbon ledger in seconds, and a year of travel is mapped without a single manual log.

Why This Matters
Carbon tracking is currently broken by "self-reporting fatigue" or "invasive privacy trades." EcoPulse scratches the itch for a private, automated, and scientifically rigorous tool that runs entirely in the browser, giving people the truth about their impact without demanding their life story.

Acceptable Tradeoffs
Visual polish can be sacrificed for speed and bundle size. We will use system fonts and CSS shapes instead of heavy images. Feature breadth (like social sharing) is secondary to the accuracy of the parsing engines.

Non-Negotiables
Privacy is absolute; all data processing must happen client-side or through a secure, non-logging proxy. The repository must remain under 10MB. Calculations must use the most recent GWP (AR6) vintages.

The Mentality (Soul)
Think like a minimalist architect building a high-speed calculator. Every kilobyte added to the bundle must earn its place. When a decision is ambiguous, choose the path that requires zero manual input from the user. Good enough means the math is right and the UI doesn't lag on a 2017 MacBook. If the user has to type more than a keyword, we've failed. Build it to feel "alive"—reactive, transparent, and ruthlessly efficient.
