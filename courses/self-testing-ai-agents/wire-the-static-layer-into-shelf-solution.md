---
title: 'Wire the Static Layer into Shelf: Solution'
description: Copyable static-layer artifacts—ESLint rules, TypeScript strict flags, knip, the lefthook config, gitleaks, and the CLAUDE.md additions—with verification commands for each part.
modified: 2026-04-14
date: 2026-04-10
---

This is the longest lab and the longest solution. The current Shelf starter is intentionally smaller, so this solution is the copyable version of the static layer you add during the lab. I will walk through every part in order, show the file to create or extend, explain why, and give you the commands to prove it works.

## What to add

### Part 1: ESLint custom rules

Open `eslint.config.js`. After the standard Svelte/TypeScript/Prettier config blocks, there are two `no-restricted-syntax` blocks.

The first block applies globally—every file in the project:

```js
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.property.name='waitForLoadState'] > Literal[value='networkidle']",
        message: 'networkidle is unreliable. Wait on a real signal.'
      },
      {
        selector:
          "MemberExpression[object.type='MemberExpression'][object.property.name='body'][property.name='userId']",
        message: 'Read userId from the session, not the request body. See CLAUDE.md → Auth.'
      }
    ]
  }
}
```

The `networkidle` rule uses the child combinator (`>`) to match a `Literal` node with value `'networkidle'` that is a direct argument to `waitForLoadState`. The `userId` rule uses a nested `MemberExpression` match—`body.userId`—because a simple property-name check on `userId` would fire on every object that happens to have a `userId` field. The nesting says "specifically `something.body.userId`," which is the shape of reading from a parsed request body.

The second block scopes to `tests/**/*.ts` only:

```js
{
  files: ['tests/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='waitForTimeout']",
        message: 'page.waitForTimeout is banned. See CLAUDE.md → Playwright → Waiting.'
      },
      {
        selector: "CallExpression[callee.property.name='locator'][arguments.0.type='Literal']",
        message: 'Use a getByRole/getByLabel locator. See CLAUDE.md → Playwright → Locators.'
      },
      {
        selector:
          "CallExpression[callee.property.name='waitForLoadState'] > Literal[value='networkidle']",
        message: 'networkidle is unreliable. Wait on a real signal.'
      }
    ]
  }
}
```

The `waitForTimeout` and raw `locator()` bans only apply to end-to-end test files. Banning `waitForTimeout` in application code would be overzealous—there are legitimate uses of `setTimeout` in app logic. But in test files, every `waitForTimeout` is a flake waiting to happen, and every raw `page.locator('.some-class')` is a brittle selector that should be `getByRole` or `getByLabel`.

The `networkidle` rule appears in _both_ blocks. That is deliberate: the global one catches route handlers or utility code that might call `waitForLoadState`, and the scoped one ensures the test-specific rule block does not accidentally shadow the global one. ESLint's `no-restricted-syntax` replaces the entire rule when a scoped config redefines it, so the test block must re-include patterns it wants to keep.

**Verification:**

```sh
# Clean baseline
npm run lint

# Prove waitForTimeout fires
echo "page.waitForTimeout(1000);" >> tests/smoke.spec.ts
npm run lint 2>&1 | grep "waitForTimeout is banned"
git checkout tests/smoke.spec.ts
```

### Part 2: TypeScript strict mode

Open `tsconfig.json`. The `compilerOptions` block:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

`strict: true` is the umbrella—it enables `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, and `useUnknownInCatchVariables`. The five flags listed after it are _not_ included in `strict` and must be enabled individually.

`noUncheckedIndexedAccess` is the one that changes your daily life the most. With it on, `items[0]` has type `T | undefined` instead of `T`. Every array index and object bracket access forces you to handle the missing case. It is annoying for the first hour and then it catches a real bug, and you never turn it off.

`exactOptionalPropertyTypes` is stricter than most projects bother with. It means `{ x?: string }` allows `undefined` _only_ when the key is absent—you cannot explicitly assign `x: undefined`. If the existing code compiles clean with this flag, leave it on. If your own project does not, it is the one flag on this list worth deferring.

**Verification:**

```sh
npm run typecheck
```

### Part 3: Dead code detection with knip

Open `knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": [
    "src/app.html",
    "src/routes/**/+*.{ts,svelte}",
    "tests/**/*.{test,spec}.ts",
    "tests/helpers/*.ts",
    "scripts/*.{ts,mjs}"
  ],
  "project": ["src/**/*.{ts,svelte,svelte.ts}", "tests/**/*.ts", "scripts/**/*.{ts,mjs}"],
  "ignoreDependencies": ["@tailwindcss/forms", "@tailwindcss/typography", "tailwindcss"]
}
```

The `entry` array tells knip where execution starts—SvelteKit route files (`+page.ts`, `+server.ts`, `+layout.ts`), test files, helper files, and scripts. Everything reachable from these entry points is "used." Everything in the `project` globs that is _not_ reachable is dead code. If you add later labs like authenticated setup or a custom MCP server, extend these globs at that point instead of shipping them on day one.

The `ignoreDependencies` array handles Tailwind. Tailwind v4 uses CSS `@import` directives to pull in its plugins, not JavaScript imports, so knip cannot trace the dependency chain. Without the ignore list, knip reports `tailwindcss`, `@tailwindcss/forms`, and `@tailwindcss/typography` as unused dependencies on every run.

**Verification:**

```sh
npm run knip
```

### Part 4: Lefthook

One file. Open `lefthook.yml` at the repo root:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,svelte,js,mjs,cjs}'
      run: npx eslint --fix --max-warnings=0 {staged_files}
      stage_fixed: true
    format:
      glob: '*.{ts,svelte,js,mjs,cjs,json,md,yml,yaml,css}'
      run: npx prettier --write {staged_files}
      stage_fixed: true
    secrets:
      run: npx tsx scripts/run-gitleaks-staged.ts

pre-push:
  commands:
    checks:
      run: npm run pre-push
```

The `pre-commit` block runs three commands in parallel. The `lint` command expands `{staged_files}` to the staged files matching the `glob` and hands them to ESLint with `--fix --max-warnings=0`—auto-fixable issues get corrected, and any remaining warning becomes an error. The `format` command does the same for Prettier, across a wider glob that also covers JSON, Markdown, YAML, and CSS. Both commands use `stage_fixed: true`, which restages whatever the auto-fixers changed. The `secrets` command runs the gitleaks wrapper we cover in Part 5—it is intentionally unscoped by `glob` because the wrapper re-lists the staged index itself and would be confused by a pre-filtered argument list.

The `pre-push` block shells out to `npm run pre-push`, which this lab adds for local verification: `npm run typecheck && npm run knip && npm run test:unit`. The ordering matters—typecheck is cheapest, knip is next, unit tests are last. If typecheck fails, knip and tests never run.

The minimal starter does not wire `lefthook install` into `prepare`. After adding `lefthook.yml`, run `npx lefthook install` once locally, then decide whether you want to fold that install step into `prepare` for your own project.

**Verification:**

```sh
# Prove pre-commit fires (from repo root, against whatever you have staged)
npx lefthook run pre-commit

# Prove pre-push fires
npx lefthook run pre-push
```

### Part 5: Secret scanning with gitleaks

Open `scripts/run-gitleaks-staged.ts`. This script exists because `gitleaks git --staged` had reliability issues with newly added files at the time of writing. The workaround is straightforward: materialize the staged git index into a temporary directory, run `gitleaks dir` against it, then clean up.

The script does four things:

It lists staged files using `git diff --cached --name-only --diff-filter=ACM -z`. The `-z` flag uses null bytes as delimiters so filenames with spaces do not break the parse. The `--diff-filter=ACM` limits to added, copied, and modified files—deleted files are not interesting for secret scanning.

For each staged file, it extracts the exact staged content with `git show :<path>` and writes it to the temp directory. This is the staged version, not the working-tree version—if you staged a clean file but then dirtied it in your editor, the scan sees the clean version. That is correct behavior for a pre-commit hook.

It resolves the `gitleaks` binary with `which`. If gitleaks is not installed, it prints a warning and exits zero. This is a deliberate choice: a missing tool should not block development, but it should be loud about the gap. In CI, gitleaks is installed explicitly, so the warning path only fires on developer machines that have not run `brew install gitleaks`.

It runs `gitleaks dir <temp-dir> --redact` with the `.gitleaks.toml` config if one exists. The `--redact` flag ensures that if a secret is found, the error output does not echo the secret itself into the terminal.

The `secrets` command in `lefthook.yml` shells out to this script as the final pre-commit gate:

```yaml
secrets:
  run: npx tsx scripts/run-gitleaks-staged.ts
```

Note the deliberate lack of a `glob` field. The wrapper script re-enumerates the staged index on its own, so handing it a pre-filtered `{staged_files}` list would double-filter. Let the script do its own listing.

**Verification:**

```sh
# Gitleaks is installed
gitleaks version

# Clean staged state passes
npx tsx scripts/run-gitleaks-staged.ts

# A real secret is caught (stage a file with a secret-shaped string, run the script, unstage)
```

### Part 6: the CLAUDE.md update

The day-one `CLAUDE.md` in Shelf only lists the smaller starter loop: `npm run typecheck`, `npm run lint`, and `npm run test`. This lab is where you extend it. Add the static-layer sections now: name `knip.json`, `lefthook.yml`, `.gitleaks.toml`, and `scripts/run-gitleaks-staged.ts` explicitly, add `npm run knip` / `npm run pre-push` to the "done" story, and keep the "Do not" section banning `@ts-expect-error`, `eslint-disable`, and `--no-verify`.

## What you still need to run

Every verification command, part by part:

```sh
# Part 1: ESLint
npm run lint

# Part 2: TypeScript
npm run typecheck

# Part 3: Knip
npm run knip

# Part 4: Lefthook
npx lefthook run pre-commit
npx lefthook run pre-push

# Part 5: Gitleaks
gitleaks version
npx tsx scripts/run-gitleaks-staged.ts

# Part 6: CLAUDE.md
wc -l CLAUDE.md
grep -c 'typecheck\|lint\|knip' CLAUDE.md
grep -c '@ts-expect-error\|eslint-disable\|no-verify' CLAUDE.md
```

And the full-stack check that the lab's final acceptance criteria require:

```sh
npm run typecheck && npm run lint && npm run knip && npm run test
```

All four should exit zero once you've finished the static-layer pass.

## Patterns to take away

- **Encode decisions as rules, not comments.** An ESLint selector that bans `waitForTimeout` fires on every save. A comment in `CLAUDE.md` that says "don't use `waitForTimeout`" fires when the agent happens to read it. Both are useful. The lint rule is _reliable_.
- **Scope your bans.** The `waitForTimeout` rule applies only to test files. The `networkidle` rule applies globally. The `userId` rule applies globally. Each ban is scoped to where the pattern is actually dangerous, not where it is theoretically possible.
- **Strict mode is a ratchet.** Once `noUncheckedIndexedAccess` is on and the codebase compiles clean, every future contributor inherits that constraint without knowing it was a deliberate choice. The flag _is_ the documentation.
- **Dead code detection catches what the agent leaves behind.** Agents write code, realize they need a different approach, and leave the first attempt in place. Knip finds it. Without knip, abandoned utilities accumulate until someone notices the import graph is a mess.
- **Hooks are cheap insurance.** Lefthook's pre-commit block runs in under two seconds on a typical commit—ESLint, Prettier, and the secret scan all running in parallel against staged files. The pre-push hook adds maybe fifteen seconds for typecheck + knip + unit tests. The cost is negligible. The alternative—finding the lint error in CI ten minutes later—is not.
- **The gitleaks script is a pragmatic workaround.** Materializing the staged index into a temp directory is more reliable than any of the staged-file flags gitleaks has offered across releases. When the upstream behavior stabilizes, you can simplify. Until then, the script works.

## Additional Reading

- [Lab: Wire the Static Layer into Shelf](lab-wire-the-static-layer-into-shelf.md)
- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Dead Code Detection](dead-code-detection.md)
- [Git Hooks with Lefthook](git-hooks-with-lefthook.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
