---
paths:
  - 'applications/website/src/routes/experiments/**'
  - 'applications/website/src/lib/experiments/**'
  - 'applications/website/tests/experiments.spec.ts'
---

# Experiments

Interactive tools at `/experiments/<slug>`. Each is a prerendered SvelteKit page that hydrates and runs entirely in the browser. These rules come from building the first one, the model pricing calculator.

## Registration

- A route folder `src/routes/experiments/<slug>/` with a `+page.svelte` needs an `experiment.ts` beside it exporting `experiment: ExperimentMetadata` (`title`, `description`, `added` as `YYYY-MM-DD`). The index page, sitemap, and Open Graph image all derive from it. Never add an experiment to a shared list; `src/lib/experiments/registry.test.ts` fails on an unregistered page.
- `+page.server.ts` sets `prerender = true`, returns `title` and `description` from `./experiment`, and never sets `csr = false`. The Open Graph drift test compares the two.
- The page has exactly one `h1` inside `main`; the site header has its own for the wordmark. `tests/experiments.spec.ts` checks every experiment for a 200 response, a clean hydration with no console errors, its registered title, and no horizontal scroll at 360 pixels in light and dark.

## Gotchas

- Hydration: prerendered controls exist before any handler is attached. Disable controls that start work until mounted, and in Playwright open pages with `openExperiment` from `tests/helpers/open-experiment.ts`, which waits for `html[data-hydrated]`. `page.goto` resolves before the scripts load, so a click before then is lost.
- File intake: use `src/lib/experiments/file-drop-zone.svelte`. It walks dropped folders, keeps stray drops from opening the file in place of the page, and waits for hydration. Pass `captureWindowDrops` only on a page with a single drop zone.
- Large files: stream them with `src/lib/experiments/read-lines.ts` rather than `file.text()`. It yields to the browser every 30 ms; without that, a 579 MB file froze the page for over a second.
- Client bundle: `bun run check-build-budget` fails any client chunk over 50 kB. Keep zod and other large libraries out of client code: validate data on the server or at build time and hand the page plain data. Lazy-load heavy views.
- Money: add the parts before dividing by a million, and test an exact half cent such as $0.335, which must show as $0.34.
- Dates: format `YYYY-MM-DD` values with `timeZone: 'UTC'` (`formatCalendarDate` in `src/lib/experiments/format.ts`), or anyone west of UTC sees the previous day.
- Narrow screens: wide tables scroll inside a `relative overflow-x-auto` region. Without `relative`, absolutely positioned `sr-only` children escape the region and stretch the whole page.
- Token counts: parse and format them with `src/lib/experiments/format.ts`, which accepts `250k`, `1.5M`, and `1,000,000`.
- Claude Code transcripts: read them with `src/lib/experiments/claude-code-transcript.ts`, which was checked against 121 real transcripts. A streamed response spans several lines with the same `message.id` and `output_tokens` grows until the last one, so the last line wins. A response with several `message` iterations, such as one with an advisor call, reports their sum in its top-level usage; its real context is the last iteration's prompt.
- Playwright names match by substring unless `exact: true`, so `Cached input` also finds `Uncached input`.
- Theming follows the site's system preference. Don't add a per-page theme toggle.
- Test fixtures are synthetic. Never commit real transcripts, settings files, or other personal data.
- Check a specification's factual claims against real data before relying on them, and report any deviation.
