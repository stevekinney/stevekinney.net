---
title: Git Hooks with Husky and Lint-Staged
description: Catch the cheap mistakes at the moment of commit, not the moment of CI. Plus a brief tour of Claude hooks as a tighter, agent-specific layer on top.
modified: 2026-04-09
date: 2026-04-06
---

Git hooks are the moment-of-commit layer. They run _after_ the agent writes the code and _before_ it goes to the remote, which makes them the last stop before a mistake becomes public. This is valuable real estate. Use it, but don't abuse it.

Abuse looks like: running the whole test suite on every commit. The team starts hating git commits, starts using `--no-verify`, and now the hook does nothing because nobody runs it. I have seen this happen on every team I've worked on that tried to put "everything" in a pre-commit hook.

Correct use looks like: running the fast, deterministic, high-signal checks on only the files that changed. Lint. Format. Secret scanning. Maybe a quick targeted unit test on a hot file. That's it. Full typecheck usually belongs in pre-push or CI unless you have a genuinely fast incremental command.

The tools are [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged). Both are ancient by JavaScript standards, both are boring and reliable, both are what everyone uses.

## Husky, the minimum version

Husky manages your `.git/hooks` directory so your hooks are version-controlled and install automatically for the team.

```sh
bun add -D husky
bunx husky init
```

This creates `.husky/pre-commit` and wires up a `prepare` script in your `package.json`. The pre-commit file is a shell script that runs on every `git commit`. Out of the box it runs `npm test`. Don't keep that. It's too slow.

Replace with:

```sh
#!/usr/bin/env sh
bun run pre-commit
```

And add to `package.json`:

```json
{
  "scripts": {
    "pre-commit": "lint-staged"
  }
}
```

Now we need lint-staged to do the actual work.

## Lint-staged, the glue

Lint-staged runs commands against only the files git is about to commit. It's the key reason this pattern is fast enough to live in pre-commit.

```sh
bun add -D lint-staged
```

Configure it in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,svelte}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{js,mjs,cjs}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

When you run `git commit`, lint-staged:

1. Looks at the files in the commit.
2. Filters them by the glob patterns.
3. Runs each command in sequence on the matching files.
4. If any command fails, the commit is aborted.
5. If any command modifies files (e.g., `prettier --write`), the changes are restaged automatically.

The result: formatted code, passing lint, and clean staged files ready to push. And because it's only running on staged files, it takes a few seconds instead of a few minutes.

## The pre-push hook for the slightly slower stuff

Some checks don't belong in pre-commit because they're too slow, but they do belong _somewhere_ before the code leaves your machine. Pre-push is where that stuff goes.

```sh
# .husky/pre-push
#!/usr/bin/env sh
bun run typecheck
bun run knip
bun test
```

Now before any push, the full typecheck runs, dead code is scanned, and unit tests run. If you push every ten minutes, this is still acceptable. If you push once an hour, even better.

The rule I use: pre-commit takes under ten seconds, pre-push takes under two minutes. Anything slower than two minutes belongs in CI.

## Secret scanning in the hook

If you take one thing from this lesson, take this one. Add gitleaks (next lesson covers it in depth) to the pre-commit hook.

```json
{
  "lint-staged": {
    "*": ["npx tsx scripts/run-gitleaks-staged.ts"]
  }
}
```

In the current Shelf workshop repo, that helper script materializes the exact staged snapshot into a temporary directory and runs Gitleaks against it. This is slightly more work than shelling out directly, but it avoids version-specific surprises around staged-file handling and newly added files. If Gitleaks' direct staged mode is reliable in your environment, fine. The important part is that the pre-commit hook is scanning the staged content, not the whole working tree.

If Gitleaks finds something, the commit is blocked with a report of what and where. Zero agents and zero humans have any business committing secrets, and this hook is the mechanism that makes it mechanically difficult to do by accident.

I'll go deeper on gitleaks in the next lesson. For now, just know it belongs in pre-commit and nowhere else—secrets detected after push are already a mitigation exercise, not a prevention one.

## Claude hooks: the agent-specific layer

One short detour before we move on.

Claude Code has its own [hook system](https://code.claude.com/docs/en/hooks) that's distinct from git hooks. A Claude hook fires on agent-specific events such as `PostToolUse` and `Stop`, and can run arbitrary shell commands whose output gets fed back into the agent's context.

The two I find useful:

**`PostToolUse` → `bun run lint --quiet`**—after the agent edits a file, silently run lint. If it passes, nothing happens. If it fails, the lint output is attached to the agent's next turn, so the agent sees the error immediately without you having to ask "did you run lint?" This closes the feedback loop inside a single conversation.

**`Stop` → `bun run pre-commit && bun run knip`**—right before the turn finishes, run the pre-commit suite. Same logic. Same tight feedback.

Project-level hook config now lives in `.claude/settings.json` (or `~/.claude/settings.json` for a user-wide setup). A minimal example:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-lint.sh"
          }
        ]
      }
    ]
  }
}
```

The `run-lint.sh` script can be as small as `bun run lint --quiet || true`. The `|| true` is deliberate. We don't want the hook to block the agent, we just want the output attached. The agent decides whether to fix.

My honest take on Claude hooks: they're a tighter loop than git hooks for one specific agent (Claude Code), and they're complementary, not a replacement. The git hook fires for all commits, by anyone, using any agent. The Claude hook fires only for Claude Code's own edits, but fires _during_ the conversation instead of at commit time. Use both. The combination beats either alone.

Cursor, Codex, and Copilot have their own equivalents. The patterns port but the config files don't. Don't go all-in on Claude hooks if you care about being portable across agents—keep the git hook as the portable layer and use the agent-specific hooks as an optional tightening.

## Hooks I do _not_ recommend

A list of things I've seen people put in pre-commit that they later regretted:

- **Full Playwright suite.** Too slow. Every commit takes five minutes. People use `--no-verify`.
- **Full test suite (unit + integration).** Same problem, smaller scale. Use lint-staged + pre-push instead.
- **Build.** `bun run build` in pre-commit adds 30+ seconds per commit and catches almost nothing that lint and typecheck don't already catch.
- **Git history checks.** "Make sure commit messages match Conventional Commits." These are fine in a commit-msg hook, not in pre-commit. They're also brittle and inspire rage.
- **Large-file detection.** Useful on a team that keeps accidentally committing videos, not useful in general.
- **Prettier on _every_ file.** This runs prettier on files you haven't touched. Use lint-staged to limit it to staged files only.

If you remember nothing else about hooks: fast + staged-only + auto-fix when possible. Anything else belongs in CI or nowhere.

## Bypassing hooks

People will ask. "Can I skip the hook for this one commit?" The answer is yes, with `git commit --no-verify`, and you should not feel bad about it as long as it's a real emergency (rescue commit, WIP push to share with a colleague, etc.). The rule is that `--no-verify` is a conscious decision, not a reflex.

When the team (or the agent) starts reaching for `--no-verify` regularly, that's a signal the hook is too strict. Tune it. Don't fight the team. The hook that never runs is worse than the slower hook that still catches things.

Corollary rule for agents:

```markdown
## Git hooks

- Never use `--no-verify` when committing. If a hook is failing, fix
  the code the hook is complaining about, not the hook.
- The pre-commit hook is designed to complete in under 10 seconds. If
  you see commits taking longer, report it—the hook has drifted.
- If you believe a hook is wrong, say so explicitly and wait for a
  human to agree before bypassing it.
```

## The one thing to remember

Git hooks are the final checkpoint before mistakes leave your machine. Use them for fast, staged, auto-fixable checks—lint, format, secret scan. Save the slow stuff for pre-push or CI. And layer Claude hooks (or their equivalent in your agent) on top for tighter feedback during the conversation, without replacing the portable git-level check that fires for everyone.

## Additional Reading

- [Dead Code Detection](dead-code-detection.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
