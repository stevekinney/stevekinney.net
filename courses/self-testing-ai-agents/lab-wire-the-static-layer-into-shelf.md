---
title: 'Lab: Wire the Static Layer into Shelf'
description: Install and configure the whole stack—ESLint custom rules, TypeScript strict, knip, husky, lint-staged, gitleaks—and prove each layer fires on the right mistake.
modified: 2026-04-06
date: 2026-04-06
---

Longest lab of the day. Multi-part. Pace yourself—each part is a self-contained check, and you can stop between parts if you need to.

## The task

Wire the complete static layer into Shelf and verify every piece fires on a planted bad input.

## Part 1: ESLint custom rules

Update `eslint.config.js` to include a `no-restricted-syntax` block that bans:

- `page.waitForTimeout` (anywhere in `tests/end-to-end/`). Selector: `CallExpression[callee.property.name='waitForTimeout']`. Message: `"page.waitForTimeout is banned. See CLAUDE.md → Playwright → Waiting."`
- `page.locator` called with a string argument (anywhere in `tests/end-to-end/`). Selector: `CallExpression[callee.property.name='locator'][arguments.0.type='Literal']`. Message: `"Use a getByRole/getByLabel locator. See CLAUDE.md → Playwright → Locators."`
- `page.waitForLoadState('networkidle')` (anywhere). Selector: `CallExpression[callee.property.name='waitForLoadState'] > Literal[value='networkidle']`. Message: `"networkidle is unreliable. Wait on a real signal."`
- Reading `userId` from a request body in a route handler. Selector: `MemberExpression[object.type='MemberExpression'][object.property.name='body'][property.name='userId']`. Message: `"Read userId from the session, not the request body. See CLAUDE.md → Auth."`

Each rule should set both the `selector` and the `message` exactly as listed so the acceptance criteria below can grep for them.

### Acceptance for Part 1

- [ ] `eslint.config.js` contains the four restricted-syntax rules above (selector + message).
- [ ] Running `bun run lint` on the current (clean) Shelf repo exits zero.
- [ ] Adding a `page.waitForTimeout(1000)` line to any file under `tests/end-to-end/` makes `bun run lint` exit non-zero, and the output contains the substring `page.waitForTimeout is banned`.
- [ ] Adding a `page.locator('.foo')` line to any file under `tests/end-to-end/` makes `bun run lint` exit non-zero, and the output contains the substring `Use a getByRole/getByLabel locator`.
- [ ] Reverting the test changes restores a clean lint (`bun run lint` exits zero).

## Part 2: TypeScript strict mode

Update `tsconfig.json` to enable every strict flag from the lesson, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

### Acceptance for Part 2

- [ ] `tsconfig.json` has `strict: true`.
- [ ] `tsconfig.json` explicitly enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`.
- [ ] `bun run typecheck` exits zero on the current Shelf source.
- [ ] Adding `const x: string = items[0]` (without a guard) to any file produces a typecheck error.

## Part 3: Dead code detection

Install knip. Configure it per the lesson. Run it on Shelf.

### Acceptance for Part 3

- [ ] `knip.json` exists with sensible `entry` and `project` globs.
- [ ] `bun run knip` exits zero on the current Shelf repo.
- [ ] Adding an unreferenced `.ts` file under `src/lib/` causes `bun run knip` to report it as unused.
- [ ] Removing the file restores clean knip output.
- [ ] The `src/lib/legacy-auth/` directory is listed in `ignore` (per the lesson).

## Part 4: Husky and lint-staged

Install husky and lint-staged. Wire pre-commit and pre-push hooks per the lesson.

### Acceptance for Part 4

- [ ] `.husky/pre-commit` exists and runs `bun run pre-commit`.
- [ ] `.husky/pre-push` exists and runs at least `bun run typecheck` and `bun run knip`.
- [ ] `package.json` has `pre-commit` and `lint-staged` configuration.
- [ ] Making a change with a lint error and running `git commit` aborts the commit with the lint error visible.
- [ ] Auto-fixable issues (formatting) get fixed and restaged automatically.

## Part 5: Secret scanning

Install gitleaks. Wire it into `lint-staged`. Run it against history.

### Acceptance for Part 5

- [ ] `gitleaks version` runs on your machine.
- [ ] `lint-staged` has a gitleaks entry.
- [ ] `.gitleaks.toml` allowlists `sample-config.json` and `tests/fixtures/`.
- [ ] `gitleaks detect` runs cleanly on the current Shelf history (zero findings).
- [ ] Attempting to commit a file containing `AKIAIOSFODNN7EXAMPLE` triggers the hook and blocks the commit.
- [ ] The `sample-config.json` file can still be committed without issue (the allowlist works).

## Part 6: the `CLAUDE.md` update

Add sections to `CLAUDE.md` that reflect every layer you wired up. At minimum:

- A "static checks" section listing `bun run lint`, `bun run typecheck`, and `bun run knip` as mandatory pre-done commands.
- Rules about `@ts-expect-error`, `eslint-disable`, and `--no-verify`.
- A secrets section per the gitleaks lesson.
- A reference back to the Playwright rules from Module 3 (locators, waiting, auth) so the custom lint rules are connected to the same source of truth.

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
3. It runs `bun lint`, `bun typecheck`, `bun knip`, `bun test`, `bun playwright test`.
4. If any of them fail, it reads the error, fixes it, and re-runs.
5. It does not use `page.waitForTimeout`, does not use `page.locator` with a CSS selector, does not use UI login, does not read `userId` from the request body, does not leave dead code behind.

If the agent does any of the forbidden things, go look at why the static layer didn't catch it. That's the gap.

## Final acceptance

- [ ] The end-to-end prompt above completed with the agent running all five check commands without being reminded.
- [ ] No forbidden patterns made it into the final code.
- [ ] The PR (if you opened one) is clean.
- [ ] Every single checkbox in Parts 1 through 6 is ticked.

## Stretch goals

- Add a Claude-specific `post-tool-use` hook that runs `bun lint --quiet` after every edit, per the Claude hooks lesson.
- Add a pinned knip-count script to pre-push that fails if the unused count goes up from a committed baseline (the ratchet pattern).
- Configure dependency-cruiser with the `no-orphans` rule and the `legacy-auth` boundary rule, and run it in pre-push.
- Write a tiny report at the end of the lab: which layer caught what, and which layer never fired. The layers that never fired might be too loose (or might just be working so well there's nothing to catch).

## The one thing to remember

The static layer is five tools and an hour of setup. Every one of them runs under everything else, catches a specific class of mistake at the cheapest possible moment, and compounds with the others. At the end of this lab, the agent is working under a feedback net so tight that most mistakes can't survive long enough to reach the tests we spent the morning building.

## Additional Reading

- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Dead Code Detection](dead-code-detection.md)
- [Git Hooks with Husky and Lint-Staged](git-hooks-with-husky-and-lint-staged.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
