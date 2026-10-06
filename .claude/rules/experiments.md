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
- Code that two or more experiments use lives in `src/lib/experiments/`, such as the model prices in `model-pricing.toml`. An experiment never imports from another experiment's route folder.
- The page has exactly one `h1` inside `main`; the site header has its own for the wordmark. `tests/experiments.spec.ts` checks every experiment for a 200 response, a clean hydration with no console errors, its registered title, and no horizontal scroll at 360 pixels in light and dark.

## Gotchas

- Hydration: prerendered controls exist before any handler is attached. Disable controls that start work until mounted, and put browser-only cleanup such as `cancelAnimationFrame` in the function `onMount` returns: `onDestroy` also runs during prerendering, where it fails the build. In Playwright, open pages with `openExperiment` from `tests/helpers/open-experiment.ts`, which waits for `html[data-hydrated]`. `page.goto` resolves before the scripts load, so a click before then is lost.
- File intake: use `src/lib/experiments/file-drop-zone.svelte`. It walks dropped folders, keeps stray drops from opening the file in place of the page, and waits for hydration. Pass `captureWindowDrops` only on a page with a single drop zone. It sizes to its content; pass `class="h-full"` to match a column beside it.
- URL state: read the query string or hash only after mount, and write it with `pushState` or `replaceState` from `$app/navigation`, which the lint rule allows with a query or hash. Never call `window.history.pushState` or `replaceState` directly: SvelteKit warns that it conflicts with the router.
- Large files: stream them with `src/lib/experiments/read-lines.ts` rather than `file.text()`. It yields to the browser every 30 ms; without that, a 579 MB file froze the page for over a second. Slice every long computation the same way, including one that restores a shared link on mount: a link to 10,000 simulated runs once blocked the page for 1.3 seconds.
- Client bundle: `bun run check-build-budget` fails any chunk a page loads up front that's over 50 kB, and any chunk loaded only through `import()` that's over 850 kB. The build's Vite manifest decides which is which: a chunk any route statically imports counts as up front. Keep zod and other large libraries out of the up-front graph: validate data on the server or at build time and hand the page plain data, or `import()` the library after mount the way the skill and agent editors load their `workbench.ts` (skillset, yaml, and smol-toml) and `src/lib/experiments/code-editor-view.ts`. One static import of a heavy module from a `.svelte` file pulls it into the up-front graph, so check chunk sizes right after the first build. The budget counts JavaScript only, so also watch the size of the page data a large dataset adds. Run `bun run build:report` first; the budget check reads its report.
- Money: add the parts before dividing by a million, and test an exact half cent such as $0.335, which must show as $0.34.
- Dates: format `YYYY-MM-DD` values with `timeZone: 'UTC'` (`formatCalendarDate` in `src/lib/experiments/format.ts`), or anyone west of UTC sees the previous day.
- Narrow screens: wide tables scroll inside a `relative overflow-x-auto` region. Without `relative`, absolutely positioned `sr-only` children escape the region and stretch the whole page.
- Chart tooltips: place them from their measured width and clamp them inside the chart, or a tooltip near the right edge widens a 360-pixel page. The phone-width test should hover and keyboard-focus the chart, not just load it.
- Untrusted strings with no spaces, such as model IDs and file names, need `[overflow-wrap:anywhere]`; a 120-character model ID once widened the page by 732 pixels. Wrap them everywhere they appear, including status lines, error messages, and warning text, and test each with a long name at 360 pixels.
- Edge inputs: guard every division by an input that can be zero, so nothing prints `Infinity×`, and reject absurd numbers (over a billion, say), because sums that overflow to `Infinity` put `NaN` into SVG attributes. A key that skips rerunning an expensive step must include the input values, not just their count.
- Conditional Tailwind classes: make the base and the variant alternatives. Appending `bg-amber-50` after `bg-white` leaves stylesheet order to pick a winner, and the plain one won.
- Token counts: parse and format them with `src/lib/experiments/format.ts`, which accepts `250k`, `1.5M`, and `1,000,000`.
- Claude Code transcripts: read them with `src/lib/experiments/claude-code-transcript.ts`, which was checked against 121 real transcripts. A streamed response spans several lines with the same `message.id` and `output_tokens` grows until the last one, so the last line wins. A response with several `message` iterations, such as one with an advisor call, reports their sum in its top-level usage; its real context is the last iteration's prompt. For tool calls, failed tool results with their line numbers, and the usage split by cache lifetime, use `createDetailedTranscriptReader` from the same file; subagent responses are in `subagentTurns`. Project folders under `~/.claude/projects` encode the home path with dashes (`-Users-<name>-…`), so redaction has to match that form too.
- Playwright names match by substring unless `exact: true`, so `Cached input` also finds `Uncached input`. A `label` that wraps a `select` and extra text doesn't give the select an exact accessible name.
- Type checks: when `applications/website/.generated/content-data.json` exists, svelte-check covers only 99 files and misses real errors. For full coverage, move that file aside and run it again (the one error about the missing file is expected), or run `bunx tsc --noEmit -p tsconfig.json`, which covers the `.ts` files but not `.svelte` ones.
- Don't run vitest or `bun run check` in a worktree while its build runs. Both rerun `svelte-kit sync`, so the client and the prerendered pages get different version hashes, every page fails to hydrate, and Turbo caches the broken output. Rebuild with `TURBO_FORCE=true`.
- Theming follows the site's system preference. Don't add a per-page theme toggle.
- Test fixtures are synthetic. Never commit real transcripts, settings files, or other personal data. The root `.gitignore` ignores `settings.local.json` and `.env*.local` files, so check `git status` shows each fixture you add; a spec once passed only in the worktree that held an uncommitted one.
- Check a specification's factual claims against real data before relying on them, and report any deviation. Specifications can be edited while work is underway: the current file is the source of truth, so reread it rather than trusting a summary of it.
- On macOS, `pgrep -f "a|b"` doesn't treat `|` as alternation, so it matches nothing. Check each pattern separately, or check your port with `lsof -nP -iTCP:<port> -sTCP:LISTEN`.
