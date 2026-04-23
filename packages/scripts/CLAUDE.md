# `@stevekinney/scripts` — agent notes

Command-line scripts that produce the website's generated artifacts. Bun-native throughout; no `node` or `tsc` in the run path.

## Load-bearing constraints

- **Script files are `#!/usr/bin/env bun` with the executable bit set.** The `bin` entries in `package.json` point Bun at the source file directly — removing the shebang or the mode bit breaks `bunx <command>` everywhere the script is referenced.
- **`content-build.ts` is idempotent.** It hashes `packages/content-enhancements/src/**/*.ts` (via `fast-glob`) into `applications/website/.generated/content-enhancements/.build-hash`. When the hash matches, the rebuild is skipped — that's what keeps Turbo's output cache valid and repeated invocations cheap. Do not rebuild unconditionally.
- **Turbo inputs mirror script inputs.** Anything a script reads has to be listed (as a glob, not an enumerated path) in `turbo.json`. A script that reads a file Turbo doesn't track will see stale cache restores.
- **`run-with-sharp-runtime.ts` is how sharp loads libvips on CI.** It prepends the platform-specific library directory onto `LD_LIBRARY_PATH` / `DYLD_LIBRARY_PATH` before spawning the child. Don't call sharp directly from scripts that aren't wrapped by this runner on Linux CI.

## Behaviour to preserve across edits

- `sync-generated-browser-assets.ts` filters the `.build-hash` sidecar with `filter` in `cp`. Without that filter the dotfile ends up in the served build output — harmless but noise.
- `build-report/inspect-website-output.ts` returns `null` for the HTML output root when neither `build/` nor `.vercel/output/static/` contains an HTML file. The report pipeline surfaces that as `"Unavailable"`; every downstream formatter needs to handle the nulls explicitly.
- `content-repository/` emits `ContentValidationIssue` records; `validate-content.ts` fails the build when the list is non-empty. Never filter or suppress issues inside the collection layer — surface them, and let the caller decide.
- `content-build.ts` calls `process.exit(0)` at the end of `main`. Dropping this occasionally leaves the Bun process hanging on CI.

## Things that look wrong but aren't

- `@stevekinney/scripts` exposes source files as bins, not a barrel `exports` map. That's deliberate — each script is a process entrypoint, not a library function.
- `build-report/build-report.ts` does `JSON.stringify(report, null, 2)` inline rather than calling a formatter module. That _is_ the formatter; a second module would be pure pass-through.
- `build-report/render-markdown.ts` uses `prose-writer`'s chainable builder instead of template literals. The chain looks verbose, but it keeps heading/list structure explicit — template literals silently drifted from the schema in the pre-refactor version.

## Modifying the package

- Unit tests: `bun test` from this directory. `content-repository.test.ts` and `build-report/build-report.test.ts` cover the two main graphs.
- `bunfig.toml` at the repository root sets `[test] root = "src"` for the website app; scripts here use `bun:test` directly and don't need that scope.
- When adding a new script: wire the shebang + bin entry + Turbo inputs in the same commit. Otherwise the script works locally and breaks in CI, or Turbo silently returns stale output.
