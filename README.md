# Vigilon Cyber website

Astro site for [vigiloncyber.com](https://www.vigiloncyber.com), deployed on Vercel (`output: 'server'`).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm test`                | Runs rule, navigation, session and inquiry tests |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🧭 Guided compliance tools

| Route | Tool |
| :---- | :--- |
| `/tools/red-scope` | RED cybersecurity scope check |
| `/tools/cra-scope` | CRA scope check |
| `/tools/cra-roadmap` | CRA roadmap planner |
| `/tools/cra-reporting-readiness` | CRA reporting readiness check |

- Each tool is data in `src/lib/tools/`: questions (`questions.ts`), a path with visibility predicates, and a versioned rule set. Every rule cites a source from `sources.ts` and a legal reference. The engine (`engine.ts`) runs unchanged in the browser and under `npm test`.
- Answers are shared across tools by question id, so a visitor moving from the CRA scope check to the roadmap is not asked the same thing twice. Changing an answer removes answers that no longer apply and recalculates the result.
- Steps are addressed in the URL (`?step=…`), so browser Back/Forward and refresh work. Answers are kept only in `sessionStorage` for the current tab — cleared when the tab closes, after two hours without activity, or with “Clear my answers and start over”.
- The optional follow-up form posts the visitor’s answers and result summary to `/api/quote`, which emails them through Resend (`RESEND_API_KEY`). Results never require contact details.
- Funnel events send coarse identifiers only (tool, step, action, device class) through `@vercel/analytics` `track()`. Custom events need a Vercel plan that supports them.

### Rule review status

**The current rule sets are unreviewed local fixtures** (`status: 'fixture'`). They implement the cited provisions as read on 13 September 2026, but they have not been validated by a qualified reviewer.

- `npm run dev` shows the tools with a “Preview — not reviewed regulatory guidance” notice.
- Production builds replace fixture tools with an “isn’t available yet” page that links to the relevant services. Those pages are `noindex` and excluded from the sitemap, and homepage task cards link to service pages instead.
- To preview fixtures on a non-production deployment, build with `PUBLIC_GUIDED_TOOLS_PREVIEW=true`.
- To publish a tool: have a qualified reviewer check the rules against current primary sources and representative and boundary scenarios, update the rules and tests, then set `status: 'reviewed'`, `reviewedAt` and `reviewedBy` in that tool’s file. Remove the `/tools/` sitemap filter in `astro.config.mjs` once all tools are reviewed.

## 🖼️ Hero media

`src/components/HeroSlideshow.astro` renders the static artwork in `src/assets/vigilon-hero.png` through Astro’s image optimisation. Passing more approved images enables a crossfade with previous, next and pause controls (paused under reduced motion, offscreen and in hidden tabs). There is no video support yet.

## 📝 Content waiting for owner input

Content that depends on unconfirmed business input is marked in the source with `<DevNote>`, which renders only in `npm run dev`.
