---
title: Lint and Types as Guardrails
description: ESLint's recommended rules are a starting point, not a finish line. The rules that actually help agents are the ones you write for your own codebase.
modified: 2026-04-06
date: 2026-04-06
---

[ESLint](https://eslint.org/)'s recommended config is fine. [TypeScript](https://www.typescriptlang.org/)'s [strict mode](https://www.typescriptlang.org/tsconfig/#strict) is good. If you do nothing else, turn both on and you've already closed the door on whole categories of agent mistakes. I won't spend time justifying either—if you're here, you already believe in them.

What I want to talk about is the rules _beyond_ the defaults: the ones you write because your own codebase has its own failure modes, and because the agent keeps making the same mistake until a lint rule shouts at it.

## The custom rule mindset

Every rule from this morning is a candidate lint rule. That's the frame.

- Locators: `page.waitForTimeout` is banned. Lint it.
- Locators: `page.locator` with a CSS selector is discouraged. Lint it.
- Authentication: `page.goto('/login')` in a non-setup test file is banned. Lint it.
- Screenshots: adding a new screenshot baseline without a commit message that mentions it is suspicious. Lint it.
- API handlers: reading `userId` from the request body is banned. Lint it.
- Route handlers: `catch` that returns 200 is banned. Lint it.

Not every one of those is a lint rule today. Some are. Some need a custom rule. Some need a different tool. But the mindset is: _anything I keep finding in PR review that I could describe mechanically is something I can lint, and I should._

This is the cheap end of the self-correcting loop. Every rule you add is a future mistake the agent catches and fixes without you.

## The ESLint rules worth enabling by default

A short list of [ESLint](https://eslint.org/) rules that pay for themselves in an agent-driven codebase, beyond what `@eslint/js/recommended` already covers:

- [`no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax)—the swiss army knife of custom rules. Use it to ban `waitForTimeout`, `networkidle`, `goto('/login')` in tests, and anything else you can describe with an AST selector.
- `@typescript-eslint/no-floating-promises`—every unawaited promise in an agent's code is a race condition waiting to happen. Hard error.
- `@typescript-eslint/no-misused-promises`—`await`ing in a boolean context, passing an async function to a callback that expects sync, etc. Hard error.
- `@typescript-eslint/strict-boolean-expressions`—forces explicit null checks instead of `if (user)`, which catches a class of "the empty string is falsy" bugs. Worth it.
- `no-console` with an allowlist for `error` and `warn`—prevents the `console.log` littering I warned about in the Module 6 lesson on dossiers.
- `eslint-plugin-unicorn` has a bunch of opinionated rules that catch subtle modern-JavaScript mistakes. I don't enable all of them, but `prefer-node-protocol`, `no-null`, and `error-message` all catch things.

Your mileage varies on the last few based on team aesthetics. The first four are non-negotiable for me.

## Writing a `no-restricted-syntax` rule

This is the rule that earns its keep. `no-restricted-syntax` takes an ESLint selector (a mini AST query language) and reports any node that matches. You can ban specific function calls, specific patterns, specific API usages, without writing a whole plugin.

Ban `page.waitForTimeout`:

```js
// eslint.config.js
export default [
  {
    files: ['tests/end-to-end/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            'page.waitForTimeout is banned. Use expect(locator).toBeVisible() or page.waitForResponse instead. See CLAUDE.md → Playwright waiting.',
        },
      ],
    },
  },
];
```

Notice the error message. It names the violation, offers the alternatives, and points at `CLAUDE.md`. When the agent trips this rule, the error message is a self-contained fix prompt—it tells the agent what to do next. Write your lint messages like prompts because they _are_ prompts.

Now extend the same rule to ban raw CSS selectors in locators:

```js
{
  files: ['tests/end-to-end/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='waitForTimeout']",
        message: 'page.waitForTimeout is banned. Use expect(locator).toBeVisible() or page.waitForResponse instead.',
      },
      {
        selector: "CallExpression[callee.property.name='locator'][arguments.0.type='Literal']",
        message: 'page.locator with a string selector is discouraged. Use page.getByRole, getByLabel, getByText, or getByTestId. See CLAUDE.md → Playwright locators.',
      },
    ],
  },
},
```

Two rules, one config file, both firing on every save. The next time the agent reaches for a banned pattern, the editor underlines it in red and the fix is one step away.

## The tricky one: banning `any` gradually

`@typescript-eslint/no-explicit-any` is a rule I want on, but flipping it to `error` in an existing codebase is suicide—every `any` everywhere erupts at once and the team hates me. The solution is gradual tightening.

- Start with `@typescript-eslint/no-explicit-any`: `warn`. The agent sees warnings but isn't blocked.
- Pair it with `@typescript-eslint/no-unsafe-assignment`, `no-unsafe-member-access`, and `no-unsafe-call` as `warn`. These catch the _downstream_ effects of `any`—where `any` leaks into other code.
- Set a "new files" rule via [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) or a simple `files: ['src/new-module/**']` override that flips the rules to `error` in new code.
- Track the warning count in CI and refuse to merge PRs that increase it. I use a `bun run lint --max-warnings=<current-count>` script that pins the count.

The effect: new code is strictly typed, old code gets cleaned up opportunistically, and the agent—which writes mostly new code—sees hard errors in its work but doesn't drown in pre-existing warnings. This is the pattern that lets you enable strict rules on a 10,000-file codebase without burning it down.

## TypeScript: strict mode, with receipts

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

`strict: true` gets you most of these automatically. The ones worth naming explicitly because they're off by default even under strict:

- **[`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)**—this is the one that turns `array[0]` into `T | undefined`. It's annoying. It's also the rule that catches "the agent assumed the array had an element at index 0 and it didn't." Keep it on. Swallow the annoyance.
- **`exactOptionalPropertyTypes`**—this distinguishes `{ x?: number }` from `{ x: number | undefined }`, which is subtle but matters for API contracts.
- **`noUnusedLocals` / `noUnusedParameters`**—catches dead imports and forgotten parameters. Bonus: it often catches half-written refactors where the agent renamed something and left the old reference behind.

All of these are cheap to enable on a new codebase and expensive to enable on an old one. If Shelf is new, turn everything on. If your real project is older, use the gradual tightening pattern from the `any` section above.

## The `CLAUDE.md` hookup

The lint rules are worth nothing if the agent doesn't run them. Update the instructions file:

```markdown
## Static checks

Run these before declaring a task done. They must exit zero:

- `bun run lint`—ESLint with strict custom rules
- `bun run typecheck`—TypeScript strict mode

If lint fails, read the error message. It names the violation, the
file, and the fix. Do not add `eslint-disable` comments to bypass. Do
not change a rule from `error` to `warn`. Fix the code.

If typecheck fails, fix the types. Do not use `any`. Do not use
`@ts-expect-error`. If you truly cannot type something (rare), ask
before silencing.
```

The "do not use `@ts-expect-error`" rule is specifically to prevent the agent's favorite escape hatch. When an agent can't make TypeScript happy, it will default to `@ts-expect-error` with a vague comment and move on. That's a silent regression in your type safety. Block it at the rules level.

## The one thing to remember

ESLint's defaults are a floor, not a target. Every recurring agent mistake is a candidate custom rule, and `no-restricted-syntax` is expressive enough to encode most of them. Write the error messages like prompts, because they're the first thing the agent reads when it trips the rule. Tight static checks pay back almost immediately—they're the cheapest, fastest feedback loop in the whole stack.

## Additional Reading

- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
- [Dead Code Detection](dead-code-detection.md)
