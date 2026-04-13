---
title: 'Lab: Wire the Static Layer into Shelf'
description: Install and configure the whole stack—ESLint custom rules, TypeScript strict, knip, lefthook, gitleaks—and prove each layer fires on the right mistake.
modified: 2026-04-12
date: 2026-04-06
---

Longest lab of the day. Multi-part. Pace yourself—each part is a self-contained check, and you can stop between parts if you need to.

> [!NOTE] In the current starter
> Shelf now starts smaller on purpose. The day-one repo already has ESLint, TypeScript, and the minimal Playwright loop, but it does **not** ship `knip.json`, `lefthook.yml`, `.gitleaks.toml`, or `scripts/run-gitleaks-staged.ts`. This lab is where you add those files and then verify each one against a planted bad input.

## The task

Build out the full static layer for Shelf and verify every piece fires on a planted bad input. For each part: add or extend the file, read back over the rule you just created, then trigger the probe and watch it catch.

## What you can verify locally

Everything in Parts 1 through 5 is local and mechanical: extend `eslint.config.js` and `tsconfig.json`, create `knip.json`, `lefthook.yml`, `.gitleaks.toml`, and `scripts/run-gitleaks-staged.ts`, run `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run test`, and `npm run pre-push`, plant one bad input at a time, then watch the right layer fail. Part 6 is local too if you are updating your own `CLAUDE.md` or Codex instructions file.

## What remains manual or external

The only non-mechanical part is judging the agent behavior at the end. The final prompt is there to test whether the instructions and static layer are strong enough that the agent reads the error, repairs the code, and reruns the checks without coaching. If you decide to open a pull request afterward, treat that as an optional hosted follow-up, not a requirement for finishing the lab locally.

## Part 1: ESLint custom rules

Open `eslint.config.js`. Find the `no-restricted-syntax` block. It bans four patterns:

- `page.waitForTimeout` (anywhere in `tests/end-to-end/`). Selector: `CallExpression[callee.property.name='waitForTimeout']`. Message: `"page.waitForTimeout is banned. See CLAUDE.md → Playwright → Waiting."`
- `page.locator` called with a string argument (anywhere in `tests/end-to-end/`). Selector: `CallExpression[callee.property.name='locator'][arguments.0.type='Literal']`. Message: `"Use a getByRole/getByLabel locator. See CLAUDE.md → Playwright → Locators."`
- `page.waitForLoadState('networkidle')` (anywhere). Selector: `CallExpression[callee.property.name='waitForLoadState'] Literal[value='networkidle']`. Message: `"networkidle is unreliable. Wait on a real signal."`
- Reading `userId` from a request body in a route handler. Selector: `MemberExpression[object.type='MemberExpression'][object.property.name='body'][property.name='userId']`. Message: `"Read userId from the session, not the request body. See CLAUDE.md → Auth."`

Each rule has both a `selector` and a `message`. The message strings are load-bearing — they name the file, the section, and the fix. That's the difference between a lint error the agent ignores and a lint error the agent reads and acts on.

The lesson's **Writing a `no-restricted-syntax` rule** section in [Lint and Types as Guardrails](lint-and-types-as-guardrails.md) walks each of these four AST selectors in English. Read it alongside the file you build here so you understand _why_ the `body.userId` rule uses a nested `MemberExpression` match instead of just a property name, and why the `networkidle` rule uses the descendant combinator.

> [!NOTE]
> In the Shelf workshop repository, `npm` is the source of truth. If your own project uses Bun, translate the commands back to `bun` as appropriate. The important part is that the checks are real, named scripts the agent is required to run.

### Acceptance for Part 1

- [ ] `eslint.config.js` contains the four restricted-syntax rules above (selector + message).
- [ ] Running `npm run lint` on the current (clean) Shelf repository exits zero.
- [ ] Adding a `page.waitForTimeout(1000)` line to any file under `tests/end-to-end/` makes `npm run lint` exit non-zero, and the output contains the substring `page.waitForTimeout is banned`.
- [ ] Adding a `page.locator('.foo')` line to any file under `tests/end-to-end/` makes `npm run lint` exit non-zero, and the output contains the substring `Use a getByRole/getByLabel locator`.
- [ ] Reverting the test changes restores a clean lint (`npm run lint` exits zero).

## Part 2: TypeScript strict mode

Open `tsconfig.json`. Find every strict flag from the lesson — `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. They're all there. Read each one and make sure you can explain, in one sentence, what kind of bug it catches that `strict: true` alone would miss.

### Acceptance for Part 2

- [ ] `tsconfig.json` has `strict: true`.
- [ ] `tsconfig.json` explicitly enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`.
- [ ] `npm run typecheck` exits zero on the current Shelf source.
- [ ] Adding `const x: string = items[0]` (without a guard) to any file produces a typecheck error.

## Part 3: Dead code detection

Create `knip.json`. Set the `entry` and `project` globs so knip knows which files are roots (SvelteKit pages, tests, scripts) and which files are in-scope for the unused-exports analysis. Then run `npm run knip` to see it report zero findings against the current repo.

> [!NOTE]
> In this local repository, the `knip` script sets `DATABASE_URL=file:./tmp/knip.db` before invoking knip. That keeps `drizzle.config.ts` loadable during analysis without depending on a developer-specific `.env`.

### Acceptance for Part 3

- [ ] `knip.json` exists with sensible `entry` and `project` globs.
- [ ] `npm run knip` exits zero on the current Shelf repo.
- [ ] Adding an unreferenced `.ts` file under `src/lib/` causes `npm run knip` to report it as unused.
- [ ] Removing the file restores clean knip output.
- [ ] If your repository still contains a retired subtree like `src/lib/legacy-auth/`, it is explicitly ignored. If your local Shelf clone does not contain that directory, do not invent it just to satisfy the lab.

## Part 4: Lefthook

Create `lefthook.yml`. Add `pre-commit` and `pre-push` blocks. Pre-commit should run fast checks on `{staged_files}` with `parallel: true` and `stage_fixed: true`, while pre-push should run the slightly-slower `npm run pre-push` script (which calls typecheck, knip, and unit tests) against the whole tree. Read the [Git Hooks with Lefthook](git-hooks-with-lefthook.md) lesson if you want the reasoning behind the split.

### Acceptance for Part 4

- [ ] `lefthook.yml` exists at the repo root.
- [ ] `pre-commit` runs ESLint, Prettier, and a secret scan against `{staged_files}`, all marked `parallel: true`, and any auto-fixed files are restaged via `stage_fixed: true`.
- [ ] `pre-push` runs `npm run pre-push`, which in turn runs at least `npm run typecheck` and `npm run knip`.
- [ ] Making a change with a lint error and running `lefthook run pre-commit` aborts with the lint error visible.
- [ ] Auto-fixable issues (formatting) get fixed and restaged automatically.

## Part 5: Secret scanning

Add a `secrets` command under `pre-commit` in `lefthook.yml` so it shells out to `npx tsx scripts/run-gitleaks-staged.ts`. Then read back over that script and make sure it materializes the staged index into a tmp directory before running `gitleaks dir`. Finally, create `.gitleaks.toml` and notice which paths you allowlist (`sample-config.json` and `tests/fixtures/`) and why — they're deliberate bait that would otherwise trip the scanner.

> [!NOTE]
> With the current Gitleaks release used in this workshop, `gitleaks git --staged` was not a reliable pre-commit verifier for newly added files. The local Shelf repository fixes that by materializing the exact git index into a temporary directory and running `gitleaks dir` there from `scripts/run-gitleaks-staged.ts`. That wrapper is what the lefthook `secrets` command shells out to.

### Acceptance for Part 5

- [ ] `gitleaks version` runs on your machine.
- [ ] `lefthook.yml` has a `secrets` command under `pre-commit` that invokes `npx tsx scripts/run-gitleaks-staged.ts`.
- [ ] `.gitleaks.toml` allowlists `sample-config.json` and `tests/fixtures/`.
- [ ] Running the staged-snapshot script directly (`npx tsx scripts/run-gitleaks-staged.ts`) exits zero for the clean staged state.
- [ ] Attempting to stage a file containing `BETTER_AUTH_SECRET="7Xse4XqnSo3hcT31Yb2vi7LMt6BYI93w.0EWmIcjHKAdde1SY5TEVqh5fPu6NvFBf"` triggers the hook and blocks the commit.
- [ ] The `sample-config.json` file can still be committed without issue (the allowlist works).

## Part 6: the `CLAUDE.md` update

Add sections to `CLAUDE.md` that reflect every layer you wired up. At minimum:

- A "static checks" section listing `npm run lint`, `npm run typecheck`, and `npm run knip` as mandatory pre-done commands.
- In the day-one Shelf starter, "done" only means `npm run typecheck`, `npm run lint`, and `npm run test`. This lab is where you extend that definition to include `npm run knip` and `npm run pre-push`.
- Rules about `@ts-expect-error`, `eslint-disable`, and `--no-verify`.
- A secrets section per the gitleaks lesson.
- A reference back to the Playwright rules ([locators](locators-and-the-accessibility-hierarchy.md), [waiting](the-waiting-story.md), [auth](storage-state-authentication.md)) so the custom lint rules are connected to the same source of truth.

### Acceptance for Part 6

- [ ] `CLAUDE.md` lists all static check commands under a "what done means" heading.
- [ ] `CLAUDE.md` explicitly bans bypassing via `@ts-expect-error`, `eslint-disable`, or `--no-verify`.
- [ ] The sections cross-reference each other where rules overlap (e.g., the lint rule for `waitForTimeout` points at the same source as the Playwright waiting rules).
- [ ] `wc -l CLAUDE.md` still reports a number under 150. (It's going to grow; that's fine. Just don't let it become a novel.)

## End-to-end verification

Once every layer is in place, hand the agent a single prompt that exercises all of them:

> Add a new route `/shelf/export` that lets a user download their shelf as a JSON file. Include a Playwright test for it. Run all static checks and the tests before declaring done.

Watch what the agent does. The correct behavior is:

1. It writes the route handler.
2. It writes the Playwright test.
3. It runs `npm run lint`, `npm run typecheck`, `npm run knip`, and `npm run test`.
4. If any of them fail, it reads the error, fixes it, and re-runs.
5. It does not use `page.waitForTimeout`, does not use `page.locator` with a CSS selector, does not use UI login, does not read `userId` from the request body, does not leave dead code behind.

If the agent does any of the forbidden things, go look at why the static layer didn't catch it. That's the gap.

## Final acceptance

- [ ] The end-to-end prompt above completed with the agent running `npm run lint`, `npm run typecheck`, `npm run knip`, `npm run test`, and `npm run pre-push` without being reminded.
- [ ] No forbidden patterns made it into the final code.
- [ ] If you opened a pull request, it is clean.
- [ ] Every single checkbox in Parts 1 through 6 is ticked.

## Stretch goals

- Add a Claude-specific `PostToolUse` hook that runs `npm run lint -- --quiet` after every edit, per the Claude hooks lesson.
- Add a pinned knip-count script to pre-push that fails if the unused count goes up from a committed baseline (the ratchet pattern).
- Configure dependency-cruiser with the `no-orphans` rule and, if your repository still has that boundary, the `legacy-auth` rule, and run it in pre-push.
- Write a tiny report at the end of the lab: which layer caught what, and which layer never fired. The layers that never fired might be too loose (or might just be working so well there's nothing to catch).

## The one thing to remember

The static layer is five tools and an hour of setup. Every one of them runs under everything else, catches a specific class of mistake at the cheapest possible moment, and compounds with the others. At the end of this lab, the agent is working under a feedback net so tight that most mistakes can't survive long enough to reach the tests we spent the morning building.

## Additional Reading

- [Solution](wire-the-static-layer-into-shelf-solution.md)
- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Dead Code Detection](dead-code-detection.md)
- [Git Hooks with Lefthook](git-hooks-with-lefthook.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
