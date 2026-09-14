# Vigilon Cyber site overhaul handoff

The canonical implementation specification is `vigilon-site-overhaul-brief.json` (UTF-8 JSON, schema version 1.0.0). It consolidates the owner's requests and the UX recommendations from the conversation through September 13, 2026.

## Give this to Codex or Claude Code

Open the intended Astro repository, extract this handoff into an accessible reference folder, and use the following prompt. Replace the bracketed paths before sending it.

```text
Implement the Vigilon Cyber website overhaul in "C:\Users\bryce\Code\vigilon-cyber" using "C:\Users\bryce\Code\vigilon-cyber\vigilon-site-overhaul-handoff\vigilon-site-overhaul-brief.json" as the implementation brief.

Read the complete JSON and the applicable repository instructions before editing. Inspect the existing Astro version, routes, components, styles, forms, integrations, and git status. Preserve unrelated changes and reuse working project conventions. Treat the brief's detailed recommendations as implementation defaults, subject to my explicit corrections and repository constraints.

Follow the dependency-ordered implementation plan. Start with the CRA result structure, then the shared question-flow system, four tools, and the homepage/service architecture. Build dedicated tool pages with dynamic steps, working browser navigation, session persistence, immediate results, and optional follow-up. Keep direct service and inquiry routes available.

Use the supplied hero PNG immediately. Treat HeroSlideshow.astro as untested starter code to review and adapt. No MP4 or second slideshow image is included. Use the static fallback until additional media is approved and available.

Do not fabricate regulatory rules, Continuum capabilities, official reporting integrations, accreditations, testimonials, prices, or commercial promises. Verify current primary sources before production regulatory logic. Build independent UI work while missing business inputs are pending; clearly distinguish local fixtures from production results. Ask only for information that blocks the dependent work.

Make all relevant controls functional, run appropriate repository checks, and verify changed flows on desktop and mobile, including keyboard navigation, reduced motion, Back/Forward, refresh, answer edits, and errors. Report completed work, checks actually run, unresolved inputs, and launch blockers against the acceptance-criteria IDs.

Work locally and provide a reviewable result. Do not deploy, publish, purchase services, send messages, or make regulatory submissions without separate authorization.
```

## Package contents

- `vigilon-site-overhaul-brief.json`: complete machine-readable brief, priorities, dependencies, verification plan, and 18 acceptance criteria.
- `vigilon-hero-master.png`: generated static hero artwork. Proposed application location: `src/assets/vigilon-hero.png`.
- `vigilon-hero-art-direction.txt`: original image prompt and future motion direction.
- `HeroSlideshow.astro`: optional reference component; generated, but not tested inside the target repository.
- `vigilon-ux-evidence.html`: standalone visual evidence report containing 11 embedded screenshots from September 12, 2026. No separate screenshot files are required to view it.

Asset filenames in the JSON resolve relative to this extracted handoff folder. Proposed application routes and destinations are recommendations to reconcile with the real repository, not evidence those paths already exist.

## What remains to verify

The brief does not contain a complete approved RED/CRA legal decision tree. It does not verify Continuum's features, direct submission capability, product screenshots, pricing, or operating terms. It also does not resolve the two sites' differing phone numbers or approve customer/partner proof materials. Those gaps are listed with affected work and safe fallbacks in `content_inputs_needed`.

Regulatory dates are a dated baseline from the prior review. Recheck them and any transition or scope rules against current official sources before launch. The historical website screenshots are audit evidence, not a substitute for inspecting the current repository.

No live site was modified or deployed while preparing this handoff.
