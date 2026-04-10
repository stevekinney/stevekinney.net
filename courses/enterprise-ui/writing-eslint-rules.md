---
title: Writing Our Own ESLint Rules
description: >-
  How to write custom ESLint rules in the flat-config era—when a rule is the
  right tool, what the modern API actually looks like, and how to avoid building
  a brittle little policy goblin that everybody resents.
modified: 2026-03-17
date: 2026-03-01
---

Writing custom ESLint rules is one of those things that sounds much more mystical than it is. Underneath the ceremony, a [rule][1] is just code that walks an AST, decides whether something is wrong, and optionally reports a fix or suggestion. The trick isn't _how_ to write one. The trick is knowing when a custom rule is actually the right tool, how to write it in the current flat-config-era API, and how to avoid building a brittle little policy goblin that everybody resents.

## Start With the Cheapest Enforcement That Works

Don't begin by writing a plugin because one engineer had a spiritual experience in `node_modules`. ESLint's own [guidance][2] is to create a custom rule only when the built-in rules or community rules don't cover your use case, and even the custom-rule tutorial tells you to search for an existing solution first. A surprising number of "we need a custom rule" ideas are really just configuration, or a selector-based restriction with `no-restricted-syntax`.

A lot of rules that are purely syntactic should be expressed with [selectors][3] instead of code. ESLint supports CSS-like AST selectors such as `VariableDeclarator > Identifier`, attribute filters like `[name="foo"]`, sibling combinators, negation, `:matches()`, and `:exit`. Those selectors work inside custom rules, but they also work in configuration through `no-restricted-syntax`. If all you want is "ban this syntax shape," reach for selectors first. Nobody needs a bespoke plugin just to outlaw one AST pattern.

Custom rules become worth it when you need one of four things: project-specific policy, nontrivial context, safe autofix or suggestions, or TypeScript-aware semantic checks. That's where selectors stop being enough and an actual rule module earns its keep.

## The Current ESLint Reality

Writing rules _today_ means writing for the flat-config era. Flat config became the default in ESLint v9, and modern configuration lives in `eslint.config.js` or one of its module-format variants. Old posts that assume `.eslintrc` defaults, string-based plugin loading, or legacy `RuleTester` behavior are now excellent examples of technical archaeology.

The big API change for rule authors happened in [v9][5]. Function-style rules are no longer supported, so a rule must export an object with `meta` and `create()`. ESLint also moved many helpers off `context` and onto `SourceCode`, including scope and token helpers such as `getScope`, `getAncestors`, `getDeclaredVariables`, and `markVariableAsUsed`. If you see `TypeError: context.getScope is not a function`, that's not the universe punishing you. It means the rule or plugin is still using the pre-v9 API.

That change affects tests too. In the flat-config world, `RuleTester` uses flat-config defaults, which means `ecmaVersion: "latest"` and `sourceType: "module"` unless you override them. Test case config also uses `languageOptions` instead of old `parserOptions` at the top level. ESLint v9 also tightened `RuleTester` so it now enforces things that used to slip through, such as requiring `message` or `messageId`, requiring explicit suggestion assertions, and treating `output: null` as the way to assert "no autofix."

## The Shape of a Modern Rule

A modern rule module exports an object with two top-level parts: `meta` and `create()`. `meta` describes the rule. `create(context)` returns the visitor map ESLint uses while traversing the AST. ESLint's docs call out the main `meta` fields you'll actually care about: `type`, `docs`, `messages`, `fixable`, `hasSuggestions`, `schema`, `defaultOptions`, and deprecation metadata. The `type` should be one of `"problem"`, `"suggestion"`, or `"layout"`, and ESLint uses that classification for things like `--fix-type`.

A good baseline skeleton:

```js
// rules/no-window-fetch.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow window.fetch in application code',
      url: 'https://internal.example.com/eslint/no-window-fetch',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowInTests: true }],
    messages: {
      avoidWindowFetch: 'Use the shared API client instead of window.fetch().',
      replaceWithApiClient: 'Replace with apiClient.fetch().',
    },
  },

  create(context) {
    const [{ allowInTests }] = context.options;
    const isTestFile = /(^|[\\/])(.*\.)?(test|spec)\.[jt]sx?$/.test(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      "CallExpression[callee.type='MemberExpression'][callee.object.name='window'][callee.property.name='fetch']"(
        node,
      ) {
        context.report({
          node: node.callee,
          messageId: 'avoidWindowFetch',
          suggest: [
            {
              messageId: 'replaceWithApiClient',
              fix(fixer) {
                return fixer.replaceText(node.callee, 'apiClient.fetch');
              },
            },
          ],
        });
      },
    };
  },
};
```

That one example already shows the core ideas that matter. The rule is object-style. It uses `meta.messages` and `messageId` instead of hard-coded strings. It declares `hasSuggestions: true` because it emits suggestions. It declares a schema because it accepts options. It uses a selector listener instead of a giant nested pile of `if` statements because the pattern is mostly syntactic. And it uses `defaultOptions` so the runtime logic can assume an option shape without hand-merging defaults every time. ESLint documents all of those pieces directly, including the requirement that suggestion-producing rules set `hasSuggestions`, and the recursive merge behavior of `meta.defaultOptions`.

## Visitors, Selectors, and Code-Path Events

The object returned by `create()` is a **visitor map**. If a key is a node type, ESLint runs that callback when it enters that node. If the key ends in `:exit`, ESLint runs it on the way back up. If the key is a selector, ESLint applies the callback when a node matches that selector. And if the key is one of the code-path events, ESLint invokes it during code-path analysis. ESLint's docs explicitly show all three styles, including `FunctionExpression:exit` and `onCodePathStart` / `onCodePathEnd`.

[Selectors][3] are the underused superpower here. ESLint supports node types, wildcards, attribute existence and comparison, nested attributes, fields, descendants, children, siblings, negation, and `:matches()` / `:is()`. In practice, selector listeners often make a rule smaller, more local, and easier to reason about than broad `Program()` scans. Use them when the pattern is structural. Use ordinary node listeners when the logic is easier to express in code. Use code-path events only when you actually need reachability or control-flow information.

When you're not sure what the AST looks like, use ESLint Code Explorer. The docs point to it directly, and that's the right move. Guessing node shapes from memory is how people end up writing rules against syntax they didn't actually parse.

## The `context` Object and `SourceCode`

`context` is the rule's view of the current lint run. ESLint documents the most useful properties: `id`, `filename`, `physicalFilename`, `cwd`, `options`, `sourceCode`, `settings`, and `languageOptions`. `languageOptions` tells you the effective parse mode and parser configuration for the current file. `filename` and `physicalFilename` diverge in processor scenarios such as code blocks, which matters more than people expect once Markdown or other extracted content enters the picture.

`context.sourceCode` is now the main utility surface. That's where you get source text, tokens, comments, scopes, ancestors, declared variables, and parser services. ESLint documents methods such as `getText()`, `getCommentsBefore()`, `getCommentsAfter()`, `getCommentsInside()`, `getAncestors()`, `getDeclaredVariables()`, `getScope()`, and `markVariableAsUsed()`. The default parser provides no parser services, but custom parsers can, and TypeScript rules rely on exactly that.

There's a practical pattern hidden in those APIs. Reach for AST data first. Reach for `SourceCode` text and token APIs when the AST doesn't tell you enough, especially for layout-sensitive rules involving commas, semicolons, whitespace, or comment placement. ESLint's docs explicitly recommend `sourceCode.getText()` for these cases, and they note that comment queries are calculated on demand, which is a good hint not to spray comment scans across every hot visitor unless you actually need them.

Shared `settings` are also available to every rule through `context.settings`. Flat config supports a `settings` object specifically for information shared across rules, and ESLint's example shows a plugin rule reading `context.settings.sharedData`. Use that when several rules need the same global plugin setting. Use rule options when a behavior is rule-specific. Mixing those up is how plugin configuration turns into folklore.

## Reporting Problems Properly

The core act of a rule is `context.report()`. ESLint's docs recommend `messageId` over inline `message` strings because it centralizes messages in `meta.messages`, reduces duplication in tests, and makes message changes less painful. A report needs at least a `node` or a `loc`, and it can include `data` for message placeholders. That's the default, boring, correct pattern.

A clean example:

```js
context.report({
  node,
  messageId: 'avoidWindowFetch',
  data: {
    callee: 'window.fetch',
  },
});
```

That structure also helps tests. Modern `RuleTester` wants explicit `message` or `messageId`, and it will now complain if placeholders were left unsubstituted. The tool has become stricter on purpose, which is good. Rules are easier to trust when the tests are less willing to shrug.

## Autofixes Versus Suggestions

Autofixes and suggestions are not the same thing, and teams blur them constantly. An **autofix** is something ESLint may apply automatically with `--fix`. A **suggestion** is an editor-facing or user-invoked fix that appears as an optional helper. ESLint requires `meta.fixable` for autofixing rules and `meta.hasSuggestions` for rules that emit suggestions. If you omit those fields and still try to fix or suggest, ESLint throws.

ESLint's own best-practice guidance for fixes is strict for a reason. Avoid fixes that could change runtime behavior, make fixes as small as possible, and keep it to one conceptual fix per message. ESLint reruns rules after a fix pass, so a rule doesn't need to style-polish its own fix to satisfy every other rule in one go. That's also why suggestion fixes should be focused and shouldn't try to conform to user style preferences. Suggestions are standalone changes, not miniature formatters.

That gives you a simple decision rule. If a change is obviously safe and mechanical, autofix it. If a change could alter behavior, depends on intent, or has multiple valid outcomes, make it a suggestion. ESLint's suggestion docs call out exactly those cases: behavior-changing fixes and situations with multiple valid resolutions.

## Options and Schemas

Rules with options need a real schema now. ESLint [v9][5] made this non-optional in practice: if users pass options to a rule without `meta.schema`, ESLint throws. The schema is JSON Schema, specifically Draft-04, and ESLint validates the _options array after severity_, not the severity itself. That means your schema never sees `"error"` or `"warn"` and can't validate them.

There are two schema styles. The shorthand array form validates `context.options` positionally. The full JSON Schema form validates the entire options array and is required if you want things like `$ref`, `oneOf`, or `anyOf` across the full option structure. ESLint also warns about an easy mistake: the top-level schema must still describe an array of options, not a bare object, or the rule becomes impossible to enable. That's a special kind of own goal.

`meta.defaultOptions` is worth using for any rule with real configuration. ESLint recursively merges user-provided option elements on top of the defaults, validates the merged result against the schema, and then exposes that merged array on `context.options`. That lets your rule logic treat options as already normalized.

A sane pattern:

```js
meta: {
  schema: [
    {
      type: "object",
      properties: {
        allowInTests: { type: "boolean" },
      },
      additionalProperties: false,
    },
  ],
  defaultOptions: [{ allowInTests: true }],
},
create(context) {
  const [{ allowInTests }] = context.options;
}
```

Option normalization belongs in metadata, not smeared through the visitor logic.

## Scope, Variables, and "Used" Bookkeeping

If your rule needs to reason about identifiers semantically rather than syntactically, `SourceCode` scope APIs are the right tool. ESLint documents `sourceCode.getScope(node)` for scope lookup, `sourceCode.getDeclaredVariables(node)` for variable declarations, and `sourceCode.markVariableAsUsed(name, refNode)` for cases where your custom access pattern should satisfy `no-unused-vars`. That last API is particularly useful for frameworks or macros that reference variables indirectly.

This is also the specific v9 migration trap that catches old rules. What used to be `context.getScope()` is now `sourceCode.getScope(node)`, and what used to be `context.markVariableAsUsed(name)` is now `sourceCode.markVariableAsUsed(name, node)`. If you're updating internal rules, fix those first before you start swearing at the parser.

## Testing Rules With `RuleTester`

Every custom rule should have tests. Not because testing is virtuous. Because ESLint rules are tiny compilers with just enough surface area to be subtly wrong in irritating ways. ESLint provides `RuleTester`, and the custom-rules docs explicitly call it the standard way to test rules. In the flat-config era, `RuleTester` defaults to `ecmaVersion: "latest"` and `sourceType: "module"` unless you override them.

A normal test file now looks like this:

```js
import { RuleTester } from 'eslint';
import rule from '../rules/no-window-fetch.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('no-window-fetch', rule, {
  valid: [
    "apiClient.fetch('/users')",
    {
      code: "window.fetch('/users')",
      options: [{ allowInTests: true }],
      filename: 'api.test.ts',
    },
  ],
  invalid: [
    {
      code: "window.fetch('/users')",
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'avoidWindowFetch',
          suggestions: [
            {
              messageId: 'replaceWithApiClient',
              output: "apiClient.fetch('/users')",
            },
          ],
        },
      ],
      output: null,
    },
  ],
});
```

That `output: null` matters. In modern `RuleTester`, `output` means "this case expects an autofix." If there's no autofix, omit `output` or set it to `null`. ESLint v9 also now requires tests to be explicit about whether suggestions exist, and suggestion assertions need `output` and either `desc` or `messageId`. So, the old habit of writing vague invalid cases and hoping the rule does the right thing is no longer tolerated quite as much. A shame for chaos, really.

## TypeScript-Specific Rules

If your codebase is TypeScript-heavy, plain ESLint rule authoring still works, but the recommended tooling changes. [typescript-eslint recommends][7] `@typescript-eslint/utils` for writing rules, `ESLintUtils.RuleCreator` for strongly typed rule modules, and `@typescript-eslint/rule-tester` for tests. The reason is simple: the plain `eslint` types are based on plain ESTree and don't understand TypeScript-specific nodes and properties properly.

A typed rule usually starts like this:

```ts
import { ESLintUtils } from '@typescript-eslint/utils';
import * as ts from 'typescript';

const createRule = ESLintUtils.RuleCreator((name) => `https://internal.example.com/eslint/${name}`);

export default createRule({
  name: 'no-enum-for-of',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow for...of over enums',
    },
    schema: [],
    messages: {
      noEnum: 'Do not iterate over enums with for...of.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ForOfStatement(node) {
        const services = ESLintUtils.getParserServices(context);
        const type = services.getTypeAtLocation(node.right);

        if (type.symbol && (type.symbol.flags & ts.SymbolFlags.Enum) !== 0) {
          context.report({
            node: node.right,
            messageId: 'noEnum',
          });
        }
      },
    };
  },
});
```

That pattern is straight from the typescript-eslint model. `getParserServices(context)` gives you the bridge from ESLint nodes to TypeScript nodes and type information, including helpers like `getTypeAtLocation()` and `getSymbolAtLocation()`. If you need the raw compiler API, you can also use `services.program.getTypeChecker()`.

The design warning from typescript-eslint is also worth following: don't silently change rule behavior depending on whether type information happens to be available. They explicitly recommend against rules that do one thing with `services.program` and another thing without it. If a rule truly requires type information, document that, gate it behind an explicit option, or split it into a separate rule or config. Otherwise users get a weird Schrödinger lint rule that changes personality based on config accidents.

For testing typed rules, use `@typescript-eslint/rule-tester` and enable type-aware mode with `parserOptions.projectService`, usually with `allowDefaultProject` for test files and a `tsconfigRootDir`. That's the current recommended path for type-aware tests. The typescript-eslint tester also supports some conveniences beyond ESLint core, such as array-form `output` for multi-pass fixes and dependency constraints for version-conditioned tests.

## Packaging Rules Into a Plugin

A [plugin][8] is just an object. ESLint's plugin docs define the main surface as `meta`, `configs`, `rules`, and `processors`. For rule plugins, the essential part is the `rules` object mapping rule names to rule modules. The docs also recommend a root `meta` object with `name`, `version`, and `namespace` for easier debugging and more effective plugin caching, and they note that `meta.namespace` helps `defineConfig()` find your plugin even if a user assigns it a different namespace in config.

A clean plugin entrypoint:

```js
import noWindowFetch from './rules/no-window-fetch.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-acme',
    version: '0.1.0',
    namespace: 'acme',
  },
  rules: {
    'no-window-fetch': noWindowFetch,
  },
  configs: {},
};

Object.assign(plugin.configs, {
  recommended: [
    {
      plugins: {
        acme: plugin,
      },
      rules: {
        'acme/no-window-fetch': 'error',
      },
    },
  ],
});

export default plugin;
```

That follows the current plugin guidance exactly: export a plugin object, then hang shared configs off `plugin.configs`. If you need to support both flat config and legacy config, ESLint recommends shipping both shapes from the `configs` object and using names like `legacy-recommended` or `flat/recommended` to make the distinction obvious.

For TypeScript-aware plugins specifically, [typescript-eslint recommends][9] `@typescript-eslint/utils` as a runtime dependency, `@typescript-eslint/rule-tester` as a dev dependency, and peer dependencies on `eslint`, `typescript`, and `@typescript-eslint/parser` plus any other parser you expect consumers to use. They also recommend keeping all `@typescript-eslint` packages on the same semver line.

## Using Internal Rules Without Publishing Anything

For company-only rules, flat config makes this much nicer than the old `--rulesdir` dance. ESLint supports loading a local plugin object from a file, or defining a [virtual plugin][10] inline in `eslint.config.js`. That means you can keep repo-local rules close to the codebase and wire them in directly without inventing an npm package just to make one team stop using `window.fetch`.

The lightest-weight setup is a virtual plugin:

```js
// eslint.config.js
import { defineConfig } from 'eslint/config';
import noWindowFetch from './tools/eslint/rules/no-window-fetch.js';

export default defineConfig([
  {
    plugins: {
      local: {
        rules: {
          'no-window-fetch': noWindowFetch,
        },
      },
    },
    rules: {
      'local/no-window-fetch': 'error',
    },
  },
]);
```

ESLint documents this directly as a virtual plugin pattern. It's the best starting point for private rules because it keeps feedback fast and ceremony low. Publish later if the rules become broadly reusable. Not every internal convention deserves its own package registry lore.

## Performance and Debugging

Custom rules run a lot, so performance matters. ESLint has a built-in timing mode: set `TIMING=1` to see the ten slowest rules, `TIMING=all` for a longer list, and combine it with `--no-config-lookup --rule ...` when you want to isolate one rule. ESLint also points to the `--stats` option for more granular per-file, per-rule timing. That's the official way to stop guessing which rule is slow.

In practice, the biggest performance wins are boring. Use narrow visitors instead of broad whole-tree work. Prefer selector listeners when they let ESLint do the matching work precisely. Cache regexes and one-time setup outside hot node callbacks. Avoid repeated full-text or comment scans when a node-local query will do, especially since comment queries are calculated on demand. None of that is glamorous, but neither is waiting three extra seconds for every lint pass because one rule got ambitious.

## Naming, Docs, and Maintainability

ESLint's core [naming conventions][11] are still a good default even for private rules: use dashes, use `no-` for prohibitions, and use short imperative names for affirmative requirements. That makes a rule pack feel like ESLint instead of a random internal DSL. Also include `docs.url` whenever you can, because editors use it to surface helpful links on violations.

Two maintainability rules matter more than the rest. First, don't build on top of ESLint core rule implementations. ESLint explicitly warns that core rules aren't public API and aren't designed to be extended. If you need "the same rule but slightly different," copy the file and own it. Second, don't leave options untyped and undocumented. `meta.schema`, `meta.defaultOptions`, tests, and a real doc page aren't busywork. They're what turns a rule from a clever hack into infrastructure.

For TypeScript-aware plugins, it's also worth splitting configs clearly. typescript-eslint recommends either making `recommended` require type information or publishing a separate config such as `recommendedTypeChecked`, and they advise documenting that strategy explicitly. That prevents users from enabling your ruleset and then discovering half of it only works when a project service is configured correctly.

## When a Rule Is the Wrong Extension Point

Not every lint need is a rule. [Plugins][10] can also export processors and languages. Processors are what you want when JavaScript needs to be extracted from another file type, such as Markdown code blocks. Languages are the newer extension point for linting non-JavaScript languages through plugins. If your real problem is "lint code inside Markdown" or "lint JSON as a first-class language," that's not a custom-rule problem. That's a processor or language problem.

Similarly, if the syntax itself is nonstandard JavaScript, that's usually a [parser concern][12] rather than a rule concern. Rules inspect the tree they're given. They're not in charge of inventing a tree for syntax the parser doesn't understand.

## The Default Approach I'd Use

For an internal codebase, the sensible path is very boring. Start by seeing whether selectors and `no-restricted-syntax` are enough. If not, write a local rule as a virtual plugin in `eslint.config.js`. Use object-style rules only. Put all messages in `meta.messages`. Add a real `schema` and `defaultOptions` for anything configurable. Prefer suggestions over autofixes until a change is obviously safe. Test every rule with `RuleTester`, including "no autofix," suggestions, and edge cases. Then, only when the ruleset becomes genuinely reusable across repos, promote it into a published plugin with named configs.

That's the whole game. ESLint rule authoring isn't hard. It's just easy to do sloppily, and sloppy lint infrastructure has a special talent for annoying every engineer in the company at once.

[1]: https://eslint.org/docs/latest/extend/custom-rules 'Custom Rules - ESLint'
[2]: https://eslint.org/docs/latest/extend/custom-rule-tutorial 'Custom Rule Tutorial - ESLint'
[3]: https://eslint.org/docs/latest/extend/selectors 'Selectors - ESLint'
[4]: https://eslint.org/docs/latest/use/configure/migration-guide 'Configuration Migration Guide - ESLint'
[5]: https://eslint.org/docs/latest/use/migrate-to-9.0.0 'Migrate to v9.x - ESLint'
[6]: https://eslint.org/docs/latest/extend/custom-rules 'Custom Rules - ESLint'
[7]: https://typescript-eslint.io/developers/custom-rules/ 'Custom Rules | typescript-eslint'
[8]: https://eslint.org/docs/latest/extend/plugins 'Create Plugins - ESLint'
[9]: https://typescript-eslint.io/developers/eslint-plugins/ 'ESLint Plugins | typescript-eslint'
[10]: https://eslint.org/docs/latest/use/configure/plugins 'Configure Plugins - ESLint'
[11]: https://eslint.org/docs/latest/contribute/core-rules 'Contribute to Core Rules - ESLint'
[12]: https://eslint.org/docs/latest/extend/custom-parsers 'Custom Parsers - ESLint'

---

## TL;DR

### When to Write a Custom Rule

> The decision tree.

- Can you solve it with an existing rule or plugin? → Use that.
- Is it a convention specific to _your_ codebase? → Write a custom rule.
- Does it enforce an architectural boundary? → Definitely write a rule.

**Examples of custom rules worth writing:**

- No direct imports from another team's internal packages
- Enforce event naming conventions across microfrontends
- Require error boundaries around federated remote imports
- Ban specific API patterns that cause production issues

---

### Rule Anatomy

> Every ESLint rule is an AST visitor.

```javascript
export default {
  meta: {
    type: 'problem', // 'problem' | 'suggestion' | 'layout'
    docs: { description: '...' },
    schema: [], // options the rule accepts
    fixable: 'code', // can auto-fix? 'code' | 'whitespace' | null
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        // Runs every time the parser encounters an import statement
        if (isForbiddenImport(node.source.value)) {
          context.report({
            node,
            message: 'Do not import from {{source}}',
            data: { source: node.source.value },
          });
        }
      },
    };
  },
};
```

---

### The AST Visitor Pattern

> You declare which node types you care about. ESLint walks the tree.

```
Program
├── ImportDeclaration          ← "import X from 'Y'"
│   ├── ImportDefaultSpecifier ← "X"
│   └── Literal                ← "'Y'"
├── FunctionDeclaration        ← "function foo() {}"
│   └── BlockStatement
│       └── ReturnStatement
└── ExportDefaultDeclaration   ← "export default ..."
```

- Use [AST Explorer](https://astexplorer.net) to see what nodes your code produces.
- Visitor keys match node type names: `ImportDeclaration`, `CallExpression`, `MemberExpression`.
- You can also use CSS-like selectors: `CallExpression[callee.name="require"]`.

---

### Testing Rules with RuleTester

> Rules are pure functions. Test them like pure functions.

```javascript
const { RuleTester } = require('eslint');
const rule = require('./no-cross-team-imports');

const ruleTester = new RuleTester();

ruleTester.run('no-cross-team-imports', rule, {
  valid: [`import { Button } from '@design-system/ui'`, `import { utils } from './local-utils'`],
  invalid: [
    {
      code: `import { internal } from '@team-checkout/internals'`,
      errors: [{ message: /Do not import from/ }],
    },
  ],
});
```

- Every valid case must not report. Every invalid case must report exactly the expected errors.
- Test edge cases: re-exports, dynamic imports, type-only imports.
