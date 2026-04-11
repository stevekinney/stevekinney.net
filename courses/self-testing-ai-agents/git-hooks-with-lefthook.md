---
title: Git Hooks with Lefthook
description: Wire fast, staged-only checks into every commit and push using Lefthook—a single YAML file that replaces Husky, lint-staged, and half the shell scripts in your repo.
modified: 2026-04-11
date: 2026-04-10
---

If you've done the git hook dance before, you know how it usually goes: install [Husky](https://typicode.github.io/husky/), install [lint-staged](https://github.com/lint-staged/lint-staged), wire up a `.husky/pre-commit` shell script that calls a `package.json` script that calls lint-staged that calls the actual linter. Three packages, two config surfaces, one shell script, and a `prepare` hook to glue it all together.

It works. I've shipped it on plenty of projects. But, every time I set it up I think: this is a lot of indirection for "run ESLint on the files I'm about to commit."

![Left Hook](assets/left-hook.png)

[Lefthook](https://github.com/evilmartians/lefthook) is the tool that made me stop thinking that. It's a single binary (written in Go, distributed via npm if you want it) that replaces Husky _and_ lint-staged in one configuration file. One YAML file. No shell scripts. No `prepare` hook. No second package to manage staged-file filtering—Lefthook handles that natively with its `glob` and `run` options.

I'm covering it early in the day because the rest of the workshop assumes you have a working hook layer. The Shelf starter ships a lefthook configuration, and the static-layer lab later in the day assumes that's what you're wiring up. If you already have Husky wired up on your own project and you're happy with it, that's fine — the concepts below port directly. But if you're starting fresh, Lefthook is the one I'd reach for now.

## Installation

```sh
bun add -D lefthook
bunx lefthook install
```

That's it. `lefthook install` writes the hook scripts into `.git/hooks/` so they fire on the right lifecycle events. No `prepare` script needed—though you can add one if you want automatic installation when teammates run `bun install`.

```json
{
  "scripts": {
    "prepare": "lefthook install"
  }
}
```

> [!NOTE] Why `prepare` is optional
> Lefthook's `install` command is idempotent. Running it twice does nothing harmful. If your team all knows to run `bunx lefthook install` after cloning, you can skip the `prepare` hook entirely. I add it out of habit because there's always someone who forgets.

## The configuration file

Lefthook reads a `lefthook.yml` at the root of your repository. Here's a minimal setup that covers the same ground as the Husky + lint-staged combination:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,svelte}'
      run: bunx eslint --fix --max-warnings=0 {staged_files}
    format:
      glob: '*.{ts,tsx,svelte,json,md,yml,yaml}'
      run: bunx prettier --write {staged_files}
```

`{staged_files}` is a Lefthook variable that expands to the list of staged files matching the `glob`. This is the lint-staged replacement: Lefthook filters the staged files for you, passes them as arguments, and restages any auto-fixed changes.

The `parallel: true` flag runs `lint` and `format` concurrently. If one fails, the commit is blocked.

## Adding a pre-push hook

Some checks are too slow for pre-commit but too important to skip entirely. Pre-push is where they go.

```yaml
pre-push:
  commands:
    typecheck:
      run: bun run typecheck
    dead-code:
      run: bun run knip
    test:
      run: bun test
```

Same file, different lifecycle event. Before any push, the full typecheck runs, [knip](https://knip.dev/) scans for dead code, and the unit tests run. If any of those fail, the push is blocked and you get the output right there in the terminal.

The rule I use: pre-commit takes under ten seconds, pre-push takes under two minutes. Anything slower belongs in CI.

## Secret scanning in the hook

This is the one I care about most. Add [Gitleaks](https://github.com/gitleaks/gitleaks) to the pre-commit hook so credentials never leave your machine:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,svelte}'
      run: bunx eslint --fix --max-warnings=0 {staged_files}
    format:
      glob: '*.{ts,tsx,svelte,json,md,yml,yaml}'
      run: bunx prettier --write {staged_files}
    secrets:
      run: gitleaks git --staged --no-banner
```

If Gitleaks finds a hardcoded API key or token in the staged diff, the commit is blocked. Zero agents and zero humans should be committing secrets, and this hook makes it mechanically difficult to do by accident.

I'll go deeper on Gitleaks in the [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md) lesson. For now, just know it belongs in pre-commit.

## Why one file matters

The thing I like about Lefthook is that the entire hook configuration lives in one place. When a new team member asks "what runs on commit?", the answer is "read `lefthook.yml`." When the agent needs to know what gates it has to pass, you can point `CLAUDE.md` at a single file.

Compare this to the Husky + lint-staged setup: the hook lives in `.husky/pre-commit`, the staged-file filtering lives in the `lint-staged` key of `package.json` (or `.lintstagedrc`), and the actual commands live in `scripts` inside `package.json`. Three files, three formats. Lefthook collapses all of that into one YAML file with a clear hierarchy: lifecycle event → command name → what to run.

That's not a knock on Husky. Husky is reliable, battle-tested, and used by half the JavaScript ecosystem. If you're already using it, there's no reason to migrate. But if you're setting up a new project and you want fewer moving parts, Lefthook is the simpler tool.

## Lifecycle events Lefthook supports

Lefthook hooks into every [Git hook](https://git-scm.com/docs/githooks) that Git supports. The ones I actually use:

- **`pre-commit`:** Lint, format, secret scan. Staged files only. Under ten seconds.
- **`commit-msg`:** Validate the commit message format, if you care about that. I mostly don't, but some teams do.
- **`pre-push`:** Typecheck, dead code scan, unit tests. The slightly-slower-but-still-local checks.
- **`post-merge`:** Run `bun install` automatically after pulling, so dependencies stay in sync. This one is underrated.
- **`post-checkout`:** Same idea—reinstall dependencies when switching branches that might have different lockfiles.

You _can_ hook into `pre-rebase`, `post-rewrite`, and a dozen others. I've never needed to. If you're tempted to put logic in `pre-rebase`, you're probably solving a process problem with a technical tool.

## Skipping hooks

Same as with Husky: `git commit --no-verify` skips the hook. And the same rules apply: use it for real emergencies, not as a reflex. If the team starts reaching for `--no-verify` regularly, the hook is too strict. Tune it. Don't fight the team.

For agents, the rule is simpler:

```markdown
## Git hooks

- Never use `--no-verify` when committing. If a hook is failing, fix
  the code the hook is complaining about, not the hook.
- The pre-commit hook completes in under 10 seconds. If you see commits
  taking longer, report it.
```

## The one thing to remember

Lefthook replaces Husky and lint-staged with a single YAML file. One file, one tool, all lifecycle events. Pre-commit for the fast stuff—lint, format, secret scan. Pre-push for the medium stuff—typecheck, dead code, tests. Everything else goes in CI. The hook that nobody runs is worse than the slower hook that still catches things, so keep it fast and keep it scoped.

## Additional Reading

- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
