---
title: Husky and lint-staged
description: >-
  Git hooks are just scripts, but managing them across a team is where things get
  interesting—Husky wires native hooks into version control, lint-staged runs
  tasks only on staged files, and together they keep pre-commit fast enough that
  nobody reaches for --no-verify.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Husky and lint-staged solve related but different problems. Git already has native hooks—`pre-commit`, `commit-msg`, `pre-push`—and those hooks are just executable programs in Git's hooks directory, or in whatever directory [`core.hooksPath`][1] points to. Husky is the thin layer that manages those native hooks for a JavaScript project. lint-staged is the thing you usually run _inside_ `pre-commit` to execute commands only on staged files instead of on the whole repo.

That distinction matters. Husky is hook wiring. lint-staged is staged-file task orchestration. If you blur them together, you end up debugging the wrong layer, which is a very human pastime.

## Git Hooks

Git hooks are just scripts. By default they live under `$GIT_DIR/hooks`, but Git can use another directory through `core.hooksPath`. Hooks without the executable bit are ignored. In a normal non-bare repo, Git runs hooks from the root of the working tree, not from whatever subfolder your package lives in.

The three client-side hooks most teams actually care about are `pre-commit`, `commit-msg`, and `pre-push`. `pre-commit` runs before Git creates the commit and can be bypassed with `git commit --no-verify`. `commit-msg` runs on the proposed commit message file and can also be bypassed with `--no-verify`. `pre-push` runs during `git push` and can block the push. `prepare-commit-msg` is a special case: it edits the message before the editor opens, and it is _not_ suppressed by `--no-verify`.

That already tells you the policy story. Hooks are a local speed-and-feedback tool, not a perfect enforcement boundary, because developers can bypass many of them. CI is still the final authority. Humans remain imaginative when deadlines and `--no-verify` meet.

## What Husky Actually Does

Husky is deliberately small. It uses `core.hooksPath`, supports all 13 client-side Git hooks, and works across macOS, Linux, Windows, Git GUIs, custom hook directories, nested projects, and monorepos. The important part is that it stays close to Git's native hook model instead of inventing its own hook runtime.

So, Husky is not a task runner and not a linter. It creates and manages real hook files in `.husky/`, and those files are just shell scripts. "Using Husky" mostly means "letting Husky set `core.hooksPath` and storing your hook scripts in version control."

## The Modern Setup

The current recommended setup is very simple: install Husky as a dev dependency and run `husky init`. That creates a `pre-commit` script in `.husky/` and updates the `prepare` script in `package.json`. Husky explicitly aligns this with [npm best practices][4] around `prepare`.

A clean baseline looks like this:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
```

Why `prepare`? Because npm defines it as a lifecycle script that runs on local `npm install` without package arguments, and in workspaces it can run concurrently across packages. That's convenient for setting up hooks automatically, but it also means you should usually keep Husky's `prepare` lightweight and define it at the repo root package, not spray it into every workspace unless you enjoy surprising install-time behavior.

## Writing Hook Files

Husky hook files are shell scripts. The [docs][5] recommend POSIX-compliant shell for compatibility, especially because not every machine has Bash in the way you expect, and Windows users exist to remind everyone that assumptions are a disease. If you need Node, Python, or another runtime, the recommended pattern is to keep the hook as a tiny shell entrypoint and call your real script from there.

```sh
# .husky/pre-commit
node .husky/pre-commit.mjs
```

```js
// .husky/pre-commit.mjs
import { execSync } from 'node:child_process';

execSync('npx lint-staged', { stdio: 'inherit' });
```

That approach keeps the hook portable and keeps complicated logic out of shell. Shell is wonderful right up until it isn't, which is usually five minutes after you add conditionals.

## When to Use Which Hook

| Hook                 | When it runs             | Bypass with `--no-verify` | Best for                                 | Speed requirement     |
| -------------------- | ------------------------ | ------------------------- | ---------------------------------------- | --------------------- |
| `pre-commit`         | Before commit is created | Yes                       | Formatting, linting staged files         | Fast (seconds)        |
| `commit-msg`         | After message is written | Yes                       | Message validation, conventional commits | Fast                  |
| `pre-push`           | During `git push`        | Yes                       | Full test runs, broader checks           | Moderate (minutes OK) |
| `prepare-commit-msg` | Before editor opens      | No                        | Template insertion, ticket prefixing     | Fast                  |

Use `pre-commit` for **fast, staged-file-only work**. That's where lint-staged belongs. Use `commit-msg` for commit-message validation or normalization. Use `pre-push` for slower checks that are too expensive or too repo-wide for `pre-commit`, such as a fuller test run. Git's [hook semantics][1] line up exactly with that division.

A practical setup might look like this:

```sh
# .husky/pre-commit
npx lint-staged
```

```sh
# .husky/commit-msg
node scripts/validate-commit-message.mjs "$1"
```

```sh
# .husky/pre-push
npm test
```

The rule of thumb is simple. Keep `pre-commit` fast enough that people don't hate it. If you stuff a whole-project test suite or a slow build into it, developers will use `--no-verify`, which Git and Husky both make trivial. That's not a character flaw. That's a predictable system response.

## Skipping Hooks, CI, and Production Installs

Husky supports the normal Git skip path and its own environment-based skip path. For a single commit, `git commit -n` or `--no-verify` skips eligible hooks. More broadly, setting `HUSKY=0` disables Husky hooks, and [Husky documents this][5] both for single commands and for longer periods like rebases. It's also the recommended way to avoid installing or running hooks in CI servers and Docker.

That leads to an important install-time edge case. If you install only production dependencies, a plain `"prepare": "husky"` can fail because Husky is a dev dependency and therefore missing. Husky's docs offer two fixes: make the script tolerant with `"prepare": "husky || true"`, or use a tiny install script that exits early in production or CI.

A production-safe version:

```js
// .husky/install.mjs
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

const husky = (await import('husky')).default;
console.log(husky());
```

```json
{
  "scripts": {
    "prepare": "node .husky/install.mjs"
  }
}
```

That's the grown-up pattern if your CI image or production install omits dev dependencies.

## GUIs, Node Version Managers, and PATH

One of Husky's most useful docs is the one about [Git GUIs and Node version managers][5]. If developers installed Node through `nvm`, `fnm`, `asdf`, `volta`, and friends, hook execution in a GUI can fail with `command not found` because GUIs often don't initialize the shell startup files that set up the right `PATH`. Husky's solution is `~/.config/husky/init.sh`, which Husky sources before each hook.

```sh
# ~/.config/husky/init.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

If your team uses GUIs and somebody says "it works in Terminal but not in SourceTree / Tower / VS Code / whatever," this is the first place to look.

## Nested Packages and Monorepo-Adjacent Setups

Git runs hooks from the repo root, and Husky doesn't install into parent directories for security reasons. If your `package.json` is inside a subdirectory but `.git/` is above it, Husky's docs recommend changing directories in `prepare`—for example `cd .. && husky frontend/.husky`—and then changing back inside the hook before running your project command.

```json
{
  "scripts": {
    "prepare": "cd .. && husky frontend/.husky"
  }
}
```

```sh
# frontend/.husky/pre-commit
cd frontend
npm test
```

This matters in split frontend/backend repos, nested apps, and monorepo corners where someone put the JavaScript app somewhere "logical," which in practice means "inconvenient."

## What lint-staged Actually Does

lint-staged is much simpler than many teams make it. Its job is to take the set of [staged files][6], match them against glob patterns, and run commands only for the matching files. By default it's meant to run from `pre-commit`, and the docs explicitly show `.husky/pre-commit` calling `npx lint-staged` with _no path arguments_, because lint-staged appends the matched staged files for you.

Think of lint-staged as a **staged-file router**, not as a generic "pre-commit shell script manager." It's excellent for `eslint --fix`, `prettier --write`, `stylelint`, image optimization, and similar file-local tasks. It's a bad wrapper for tools that fundamentally want to run on the whole project.

## The Configuration Model

lint-staged can be configured in `package.json`, `.lintstagedrc` files, or dedicated config files such as `lint-staged.config.js`, `.mjs`, `.cjs`, and even `.ts` when your Node environment supports it. The config is an object whose keys are glob patterns and whose values are commands to run. JavaScript config files can also export functions for advanced behavior.

A normal setup:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{md,json,yml,yaml}": "prettier --write"
  }
}
```

Or, if you want a separate config file:

```js
// lint-staged.config.mjs
export default {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{md,json,yml,yaml}': 'prettier --write',
};
```

By default lint-staged appends matched staged files to the command it runs. So, if your config says `"*.js": "eslint --fix"`, lint-staged will effectively run something like `eslint --fix file1.js file2.js`. Supported commands can be local or global executables, but lint-staged explicitly discourages globals because they're not reproducible across machines.

## File Matching and Paths

lint-staged uses [micromatch][6] for glob matching. If a glob has no slash, it matches basenames anywhere, so `"*.js"` matches both `test.js` and `foo/bar/test.js`. If it contains a slash, path matching applies, so `"foo/**/*.js"` only matches under `foo/`.

lint-staged automatically resolves the git root, selects staged files inside the project directory, filters them with the glob, and passes **absolute paths** to tasks by default. That absolute-path default is easy to miss and surprisingly useful—it avoids ambiguity when your `.git` directory and `package.json` aren't in the same place. If your tool truly wants relative paths, use `--relative` or a function config that rewrites the filenames yourself.

## Ignoring Files

lint-staged's own docs are clear about this: ignoring files should usually be handled by the underlying tool, not by lint-staged. If Prettier should ignore `vendor/`, put that in `.prettierignore`. lint-staged will still pass staged files in `vendor/`, but Prettier will ignore them according to its own rules.

If you truly need lint-staged-level filtering, use a JavaScript config and filter the filenames yourself with `micromatch.not()` or your own logic. That's the exception, not the default. Most of the time, if you're fighting lint-staged to ignore something, the actual ignore config belongs in ESLint, Prettier, Stylelint, or whatever real tool is doing the work.

## Auto-Staging, Stashing, and Partially Staged Files

By default, lint-staged is protective. It creates a backup stash before running tasks, and if tasks make modifications successfully, lint-staged automatically stages those modifications for the commit. That's why you should _not_ add `git add` manually in task commands anymore. lint-staged has handled that itself since v10 specifically to avoid race conditions when multiple tasks edit the same files.

The partially staged file behavior is the part people almost never think about until it bites them. By default, lint-staged hides unstaged changes from partially staged files, runs the tasks, and then restores those unstaged changes. If you disable that with `--no-hide-partially-staged`, those unstaged changes can end up committed too.

There's also `--fail-on-changes`, which flips the normal formatter workflow. Instead of auto-staging task edits and letting the commit continue, lint-staged exits with code 1 when tasks change files and leaves those edits in the working tree for manual restaging. That's useful for teams that want formatting to be explicit rather than silently amended into the commit.

## Concurrency and Race Conditions

lint-staged runs configured tasks concurrently by default. That's fine when globs don't overlap or when commands only read files. It becomes a mess when overlapping globs both _write_ to the same file set. The docs call this out directly with the classic bad idea: `"*": "prettier --write"` plus `"*.ts": "eslint --fix"`. Now both commands may rewrite the same TypeScript files at the same time. Congratulations on your tiny race-condition generator.

The fix is either to make the globs non-overlapping or to use array syntax inside one glob so commands run in order for that same file set:

```js
export default {
  '!(*.ts)': 'prettier --write',
  '*.ts': ['eslint --fix', 'prettier --write'],
};
```

If you need less parallelism globally, lint-staged supports `--concurrent <number>` or `--concurrent false`.

## Function Config as the Escape Hatch

Function-based config is the real power tool. It lets you build commands dynamically, run custom Node logic, filter file lists yourself, and—most importantly—stop lint-staged from appending filenames when a tool should run once without file arguments. lint-staged's docs show this explicitly for `tsc`, because appending filenames can make TypeScript ignore `tsconfig.json`. The fix is `() => 'tsc --noEmit'`, not `"tsc --noEmit"`.

```js
// lint-staged.config.mjs
export default {
  '*.{ts,tsx}': [() => 'tsc -p tsconfig.json --noEmit', 'eslint --fix', 'prettier --write'],
};
```

Function config is also how you handle custom path rewriting, build your own file grouping, or filter files before handing them to a tool. It's the right escape hatch when plain glob-to-command mapping stops being enough.

One more easy-to-miss detail: task commands don't expand environment variables the way your shell normally might. lint-staged's docs specifically say to use something like `cross-env` if you need that behavior.

## Monorepos

The official lint-staged guidance for monorepos is very specific: install lint-staged at the repo root, then add separate configuration files in each package if different packages need different rules. lint-staged will always use the configuration file _closest_ to the staged file. Those configs are treated as isolated. That means a root config does _not_ automatically "fill in" missing globs for a closer package config.

That isolation surprises people all the time. If `packages/frontend/.lintstagedrc.json` exists and only matches `*.js`, then a staged `packages/frontend/README.md` will _not_ fall back to a root `*.md` rule. The nearer config wins even if it has no matching glob for that file. The docs explicitly recommend using JS files to extend a base config if you want shared behavior plus package-specific additions.

A healthy monorepo setup:

```sh
# .husky/pre-commit
pnpm exec lint-staged
```

```js
// .lintstagedrc.mjs at repo root
export default {
  '*.md': 'prettier --write',
};
```

```js
// packages/frontend/lint-staged.config.mjs
import base from '../../.lintstagedrc.mjs';

export default {
  ...base,
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
};
```

If you truly want to run lint-staged only in one package, the official escape hatch is `--cwd`.

## Running lint-staged in CI

lint-staged is primarily a pre-commit tool, but it can run in CI if you tell it what diff to use. The `--diff` option replaces the normal `git diff --staged` source of files and implies `--no-stash`.

```bash
npx lint-staged --diff="origin/main...HEAD"
```

But, the architectural point is still the same: Husky hooks are developer ergonomics. CI is the enforcement boundary. In CI, disable Husky with `HUSKY=0` and run the actual commands you care about, optionally using lint-staged with `--diff` when that file-selection behavior is valuable.

## Troubleshooting

If hooks aren't running at all, [Husky's troubleshooting guide][7] says to check three things first: the filename must be a real hook name like `pre-commit`, `core.hooksPath` should point to `.husky/_` or your chosen hooks directory, and Git should be newer than 2.9. It also notes that `precommit` and `pre-commit.sh` are invalid hook names. That kind of error is embarrassing, but also extremely common.

If hook output looks strange, duplicated, or colorless, lint-staged documents a Git 2.36 hook-TTY regression that was fixed in Git 2.37. If hooks work in Terminal but fail in a GUI, fix `PATH` initialization with `~/.config/husky/init.sh`. If they fail only in CI or production installs, fix the `prepare` script and/or set `HUSKY=0`. If they fail in nested repos, remember Git runs hooks from repo root and Husky won't install into parent directories.

That's most of the mystery right there, minus a few artisanal Windows problems.

## What Not to Do

Don't run full-project tools through lint-staged if those tools are designed to lint the whole project. lint-staged's own docs explicitly call out `ng lint` as a bad fit for staged-file execution and recommend putting it directly in the hook instead. That general rule applies well beyond Angular.

Don't make overlapping mutating globs race each other. Don't manually add `git add` in lint-staged tasks. Don't rely on globally installed executables. Don't make `pre-commit` so slow that everybody reaches for `--no-verify`. And don't pretend local hooks replace CI, because Git and Husky both give people multiple ways around them.

## The Setup I'd Actually Recommend

Use Husky to manage native Git hooks through `.husky/`. Keep `prepare` at the repo root. Put lint-staged in `pre-commit`. Keep `pre-commit` limited to fast, file-local, staged-only tasks such as formatting, ESLint autofix, Stylelint, and maybe a lightweight type or test check when it truly runs quickly. Put message validation in `commit-msg`. Put slower repo-wide tests in `pre-push` or CI. In monorepos, run one root lint-staged process and use per-package configs only when packages really need different staged-file policies.

The boring default wins here. Husky for native hook wiring. lint-staged for fast staged-file work. CI for final enforcement. That setup survives growth much better than the classic alternative, which is shoving your whole quality program into `pre-commit` and then acting surprised when everyone starts committing with the digital equivalent of "don't tell mom."

[1]: https://git-scm.com/docs/githooks 'Git - githooks Documentation'
[2]: https://typicode.github.io/husky/ 'Husky'
[3]: https://typicode.github.io/husky/get-started.html 'Get started | Husky'
[4]: https://docs.npmjs.com/cli/v11/using-npm/scripts/ 'Scripts | npm Docs'
[5]: https://typicode.github.io/husky/how-to.html 'How To | Husky'
[6]: https://github.com/lint-staged/lint-staged 'GitHub - lint-staged/lint-staged'
[7]: https://typicode.github.io/husky/troubleshoot.html 'Troubleshoot | Husky'
