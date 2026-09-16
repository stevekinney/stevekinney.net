# Contributing

## Setup

- Install Bun 1.3.2 and Node 24.x.
- Run `bun install`.
- If you work with large assets, run `git lfs install`.

## Development

- `bun dev` (default at `http://localhost:4444`)
- `bun dev --open` to launch a browser tab

## Fast checks (local)

- `bun run lint`
- `bun run check`
- `bun run test:unit`
- `bun run content:validate`
- `bun run content:check [paths...]`

## Full checks (CI parity)

- `bun run lint`
- `bun run check`
- `bun run test:unit`
- `bun run test:integration` (builds first, then runs Playwright)
- `bun run content:validate`

## Integration tests (reuse a running server)

If you already have a preview server running, you can skip the build step:

```bash
bun run build
bun run preview -- --host 127.0.0.1 --port 4445 --strictPort
bun run test:integration:dev
```

Set `PLAYWRIGHT_BASE_URL` or `PLAYWRIGHT_PORT` if you use a different host/port.

## Content authoring

Content lives in `writing/` and `courses/`. A writing post and a course landing page use `title`, `description`, and `date` frontmatter. Course lessons use `title` and `description` and have no publication date. Keep descriptions nonempty, plain text, unique across writing and courses, and at or below 160 Unicode codepoints. Titles and descriptions are entered by the author; `modified` is computed from semantic Git changes and is not hand-authored. The root Turbo commands capture the Git revision used for that computation. The 160-character description limit is our editorial rule; [Google specifies no fixed maximum](https://developers.google.com/search/docs/appearance/snippet). Titles over 60 Unicode code points receive advisory guidance.

The supported metadata commands are:

- `bun run content:check [paths...]` checks the selected files, or the whole corpus when no paths are supplied.
- `bun run content:fix [paths...]` repairs safe metadata normalization for the selected files, or the whole corpus by default. It does not invent editorial title or description text.
- `bun run content:validate` validates the complete content graph, including generated routes and indexes.

Obsidian’s Templates command offers Writing Post, Course Landing, and Course Lesson templates. Fill in the title and description explicitly; date-bearing templates insert a quoted date. The Properties interface uses the shared property types in this repository.

The pre-commit hook repairs staged content and validates it, including course READMEs. CI checks without editing files and reports `bun run content:fix` when repairable drift remains. Missing descriptions and prose that needs rewriting require editorial input; repairs never truncate descriptions. Missing titles can be recovered only from an unambiguous navigation title or leading H1, and missing publication dates require an initial Git addition or an authored value.

Modification dates reflect committed changes to document bodies and retained metadata. Course dates also include navigation and lesson additions or removals. Dirty tracked files retain their committed timestamps. Untracked writing and course pages temporarily use their authored publication date; untracked lessons have no modification date. Full Git history is required. GitHub Actions checks out full history, and Vercel builds fetch it before Turbo starts.

Run `bun run content:check` while drafting. Run `bun run content:validate` before submitting changes that affect content structure or links.

## Running individual tests

- **Website unit tests (Vitest):** `bunx vitest run src/path/to/file.test.ts` from `applications/website/`
- **Scripts unit tests (bun:test):** `cd packages/scripts && bun test content-repository.test.ts`
- **Integration tests (Playwright):** start a preview server first, then `PLAYWRIGHT_WEB_SERVER=0 bunx playwright test tests/file.spec.ts`

## Bundle stats

`bun run build:stats` generates `build/stats.html` and `build/stats.json`.

## Cleaning

`bun run clean` removes build artifacts and caches.
