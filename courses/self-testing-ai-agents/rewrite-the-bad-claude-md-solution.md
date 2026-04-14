---
title: 'Rewrite the Bad CLAUDE.md: Solution'
description: Walkthrough of the Shelf CLAUDE.md—why every section exists, what makes it mechanically enforceable, and how to verify it.
modified: 2026-04-14
date: 2026-04-10
---

The current `CLAUDE.md` in Shelf is the one I actually use when I point Claude Code at the repo. It is not a reference answer to memorize—it is a working artifact that evolved through exactly the kind of tightening this lab asks you to do. Your version will differ, and that is fine. What matters is that every line passes two tests: can the agent act on it mechanically, and would you notice if it didn't?

Let me walk through what the shipped file does and why.

## What the current repo shows

The file lives at the repository root as `CLAUDE.md`. Open it and follow along.

### The opener

```markdown
# Shelf Starter Instructions

Shelf is the starter repository for the **Self-Testing AI Agents** course.
It is a real SvelteKit + TypeScript book application, not a generated scaffold.
```

Two sentences. The agent now knows this is a real app, not a throwaway template. That one word—"not a generated scaffold"—prevents the agent from treating the codebase as disposable. It is a framing rule disguised as a description.

### "What done means"

```markdown
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
```

Three named commands, ordered. The rule says "not done until all three exit zero, in this order." No wiggle room, no "you should probably run." The ordering matters: typecheck catches the cheapest errors first, then lint, then the full test suite. The agent runs them top to bottom and stops at the first failure. Later in the course, the static-layer lab will add a dead-code detection step (`npm run knip`) between lint and test.

Every one of those commands exists in `package.json`. You can verify that yourself:

```sh
for cmd in typecheck lint test; do
  grep -q "\"$cmd\":" package.json && echo "$cmd: found" || echo "$cmd: MISSING"
done
```

### Routes

The file names exact paths—`/`, `/login`, `/design-system`, `/search`, `/shelf`—and says which ones are public and which are protected. It also says _how_ protection works: "gate server-side on `locals.user`, never with client guards." That is a specific implementation constraint, not a vague "secure your routes" instruction.

The line "Do not reintroduce `src/routes/demo/`" is the kind of rule that sounds petty until the agent generates a demo page at 2 AM and you spend twenty minutes figuring out where it came from.

### How tests get written

```markdown
- Write a failing test before the implementation. Commit the test first.
- Unit tests live next to the file under test as `<name>.test.ts` and run with Vitest.
- End-to-end tests live in `tests/end-to-end/` and run with Playwright.
```

Three rules, each naming a specific file pattern or directory. The agent knows where to put tests without asking, and it knows the TDD order without you reminding it mid-task.

### Playwright locator rules

```markdown
- `getByRole` first. `getByLabel` or `getByText` second.
  `data-testid` only when semantics genuinely don't exist.
```

This names three specific Playwright APIs in priority order. It is not "use accessible locators"—it is "use `getByRole`, then `getByLabel`, then `data-testid`." The agent can pattern-match against its own output and self-correct.

The ban on `page.waitForTimeout` and `waitForLoadState('networkidle')` is reinforced here _and_ in the ESLint config. Belt and suspenders. The agent hits the lint rule even if it skips reading `CLAUDE.md`.

### Playwright authentication (added later)

After the storage-state lab, the file will name the auth setup file the lab produces (something like `tests/authentication.setup.ts`). The rule "never log in from inside a regular test" prevents the most common Playwright anti-pattern—and gives the agent a concrete diagnostic: "if a test redirects to `/login`, the setup file is broken." The day-one starter has no auth setup file and no section for it.

### Database seeding and isolation (added later)

After the deterministic-state lab, the file will name `tests/helpers/seed.ts`, `tests/data/users.json`, `src/lib/server/users.ts`, `resetShelfContent`, and `seedFreshDatabase`. Every noun in this section is a file or a config value the agent can verify. The rule about not resetting users inside individual specs is the kind of thing that takes an hour to debug the first time you hit it—and zero seconds to prevent with a single sentence. The seed helpers exist in the repo today, but the `CLAUDE.md` section about them is earned by the lab.

### HAR recording (added later)

After the HAR-recording lab, the file will carry a rule that looks roughly like this:

```markdown
- HARs live in `tests/fixtures/` and replay through `page.routeFromHAR`
  with `notFound: 'abort'`.
```

Specific directory, specific API, specific option. The "never commit a new HAR without a human reviewing it" rule is the kind of guardrail that only matters once—and when it matters, it _really_ matters, because HARs can contain session cookies. `tests/fixtures/` does not exist in the day-one starter; the HAR lab is what introduces it.

### Accessibility (added later)

After the accessibility lab, the file will name `tests/accessibility.spec.ts` and the smoke-checklist doc the lab produces. Two files, clear responsibilities: the spec catches what automation can prove, the checklist documents what it cannot. Neither file exists in the day-one starter.

### When a test fails (added later)

After the failure-dossier lab, Shelf will have a five-step diagnostic procedure section. Step one will name a specific command (`npm run dossier`, added by that lab); step five will name a specific tool (`npx playwright show-trace <path>`). The rule "do not fix a failing test by changing the assertion" prevents the single most common agent failure mode I have seen in the wild. The starter `CLAUDE.md` already carries the narrower form of that rule ("do not fix a failing Playwright test by changing the assertion to match broken UI"); the full diagnostic procedure is added once the dossier lab is done.

### UI copy

```markdown
- User-facing copy stays about books, shelves, and reading.
  Do not mention Playwright, seeded fixtures, test IDs, HARs,
  or course material in rendered page copy.
```

This is the "keep the product product-shaped" rule. Without it, the agent will happily render "Seeded test book #3" on a page that is supposed to look like a real reading tracker.

### Static layer (added later)

After the static-layer lab, the file will name concrete config files by path: `eslint.config.js` and `tsconfig.json` live at the repo root today, and the lab will add `knip.json`. The section lists the exact TypeScript compiler flags that are enabled and says "do not bypass with `@ts-expect-error`." The agent then knows the strictness level without reading `tsconfig.json` itself—though it should still check. None of this section is present in the starter.

### Git hooks and secrets (added later)

Once the static-layer and hooks labs are complete, Shelf will carry a section that names `lefthook` and `gitleaks` by name, points at the hook config file (`lefthook.yml`), and references the staged-snapshot wrapper the lab produces. The rule about intentional "bait" fixtures prevents the agent from "fixing" a planted test fixture. None of this is in the day-one `CLAUDE.md`—the section is earned by the lessons that introduce those tools.

### "Do not"

Four specific bans in the shipped file: no `any` or `@ts-expect-error`, no `eslint-disable`, no unflagged dependency additions, and no hand-editing generated artifacts. Each one names the exact thing not to do. No ambiguity, no interpretation required. Later in the course, the hook lab will add a `--no-verify` ban to this list—at that point the file will carry five bans.

## What you still need to run

The lab's acceptance criteria are all mechanically checkable. Here is every verification command:

```sh
# Line count (must be 60 or fewer)
wc -l CLAUDE.md

# Banned vague words
grep -iE 'clean|best practices|good|appropriate' CLAUDE.md

# Commands exist in package.json
for cmd in typecheck lint test; do
  grep -q "\"$cmd\":" package.json && echo "$cmd: ok" || echo "$cmd: MISSING"
done

# Playwright locator API named
grep -E 'getByRole|getByLabel|getByText|data-testid' CLAUDE.md

# Specific file path named (pick any path mentioned, verify it resolves)
ls tests/
ls tests/data/

# Linting and tests still pass
npm run typecheck
npm run lint
npm run test
```

And the commit:

```sh
git add CLAUDE.md
git commit -m 'lab(rewrite-the-bad-claude-md): tighten instructions for mechanical enforcement'
```

## A note about the 60-line constraint

The lab asks you to keep the file under 60 lines. The shipped `CLAUDE.md` is roughly 46 lines today, and it stays tight on purpose. Later labs—accessibility, HAR recording, database seeding, the static layer—each earn their own section when you reach them, so the file will grow as rules prove their value. The file you write _today_ should be under 60 lines. The file you end the course with will be longer, because more rules have earned their place.

If you are doing this lab in isolation, trim to 60. If you are reading this after completing several later lessons, your file will have accumulated additions beyond the shipped starter. Both are correct for their moment.

## Patterns to take away

- **Name the command, not the concept.** "`npm run typecheck`" is enforceable. "Make sure types are correct" is not.
- **Name the file, not the principle.** "Put Playwright specs in `tests/`" survives copy-paste into a task. "Follow the testing conventions" does not.
- **Ban the specific thing.** "Do not use `@ts-expect-error`" is a grep away from verification. "Maintain type safety" is a judgment call the agent will make differently than you would.
- **Shorter is louder.** Every line you delete makes the remaining lines more likely to be read. A 200-line `CLAUDE.md` is a suggestion. A 60-line one is an order.
- **The file is a living document.** You will add to it as the codebase grows. The discipline is not "write it once perfectly"—it is "earn every line."

## Additional Reading

- [Lab: Rewrite the Bad CLAUDE.md](lab-rewrite-the-bad-claude-md.md)
- [Instructions That Wire the Agent In](instructions-that-wire-the-agent-in.md)
