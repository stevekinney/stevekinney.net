---
title: Git Hooks with Lefthook
description: Wire fast, staged-only checks into every commit and push using Lefthook—a single YAML file that replaces Husky, lint-staged, and half the shell scripts in your repo.
modified: 2026-06-23
date: 2026-04-10
---

If you've done the git hook dance before, you know how it usually goes: install [Husky](https://typicode.github.io/husky/), install [lint-staged](https://github.com/lint-staged/lint-staged), wire up a `.husky/pre-commit` shell script that calls a `package.json` script that calls lint-staged that calls the actual linter. Three packages, two config surfaces, one shell script, and a `prepare` hook to glue it all together.

It works. I've shipped it on plenty of projects. But, every time I set it up I think: this is a lot of indirection for "run ESLint on the files I'm about to commit."

![Left Hook](assets/left-hook.png)

[Lefthook](https://github.com/evilmartians/lefthook) is the tool that made me stop thinking that. It's a single binary (written in Go, distributed via npm if you want it) that replaces Husky _and_ lint-staged in one configuration file. One YAML file. No shell scripts. No `prepare` hook. No second package to manage staged-file filtering—Lefthook handles that natively with its `glob` and `run` options.

I'm covering it early in the day because the rest of the workshop assumes you have a working hook layer. The Shelf starter ships a lefthook configuration, and the static-layer lab later in the day assumes that's what you're wiring up. If you already have Husky wired up on your own project and you're happy with it, that's fine — the concepts below port directly. But if you're starting fresh, Lefthook is the one I'd reach for now.

## Installation

```sh
npm install --save-dev lefthook
npx lefthook install
```

That's it. `lefthook install` writes the hook scripts into `.git/hooks/` so they fire on the right lifecycle events. No `prepare` script needed—though you can add one if you want automatic installation when teammates run `npm install`.

```json
{
  "scripts": {
    "prepare": "lefthook install"
  }
}
```

In npm, [`prepare`](https://docs.npmjs.com/cli/v11/using-npm/scripts/) is a special lifecycle script. It runs on a local `npm install` and before `npm pack` or `npm publish`. In this case, that means "after dependencies are installed, make sure Lefthook writes the Git hook files into `.git/hooks/` again." You are not invoking `prepare` manually here. npm sees the script name and runs it at the right points in the package lifecycle.

> [!NOTE] Why `prepare` is optional
> Lefthook's `install` command is idempotent. Running it twice does nothing harmful. If your team all knows to run `npx lefthook install` after cloning, you can skip the `prepare` hook entirely. I add it out of habit because there's always someone who forgets.

## The configuration file

Lefthook reads a `lefthook.yml` at the root of your repository. Here's a minimal setup that covers the same ground as the Husky + lint-staged combination:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,svelte}'
      run: npx eslint --fix --max-warnings=0 {staged_files}
    format:
      glob: '*.{ts,tsx,svelte,json,md,yml,yaml}'
      run: npx prettier --write {staged_files}
```

`{staged_files}` is a Lefthook variable that expands to the list of staged files matching the `glob`. This is the lint-staged replacement: Lefthook filters the staged files for you, passes them as arguments, and restages any auto-fixed changes.

The `parallel: true` flag runs `lint` and `format` concurrently. If one fails, the commit is blocked.

> [!NOTE] `commands:` vs `jobs:`
> Lefthook also supports a newer `jobs:` key (list form) that you may see in current Lefthook docs and examples. Both `commands:` and `jobs:` are valid and supported; this lesson uses `commands:` because the named sub-keys (`lint:`, `format:`) are easier to read. Pick one style per repo and stay consistent.

## Adding a pre-push hook

Some checks are too slow for pre-commit but too important to skip entirely. Pre-push is where they go.

```yaml
pre-push:
  commands:
    checks:
      run: npm run pre-push
```

Same file, different lifecycle event. In the completed static-layer version of Shelf, `npm run pre-push` chains the slower local gates: typecheck, [knip](https://knip.dev/), and the unit test suite. If any of those fail, the push is blocked and you get the output right there in the terminal.

The rule I use: pre-commit takes under ten seconds, pre-push takes under two minutes. Anything slower belongs in CI.

## Secret scanning in the hook

This is the one I care about most. Add [Gitleaks](https://github.com/gitleaks/gitleaks) to the pre-commit hook so credentials never leave your machine:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,svelte}'
      run: npx eslint --fix --max-warnings=0 {staged_files}
    format:
      glob: '*.{ts,tsx,svelte,json,md,yml,yaml}'
      run: npx prettier --write {staged_files}
    secrets:
      run: gitleaks git --staged --no-banner
```

If Gitleaks finds a hardcoded API key or token in the staged diff, the commit is blocked. Zero agents and zero humans should be committing secrets, and this hook makes it mechanically difficult to do by accident. Some teams wrap the staged scan in a small shell or TypeScript helper for clarity — the [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md) lesson covers that pattern and the exact invocation to use for your Gitleaks version.

I'll go deeper on Gitleaks in the [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md) lesson. For now, just know it belongs in pre-commit.

## Why one file matters

The thing I like about Lefthook is that the entire hook configuration lives in one place. When a new team member asks "what runs on commit?", the answer is "read `lefthook.yml`." When the agent needs to know what gates it has to pass, you can point the agent rules at a single file.

Compare this to the Husky + lint-staged setup: the hook lives in `.husky/pre-commit`, the staged-file filtering lives in the `lint-staged` key of `package.json` (or `.lintstagedrc`), and the actual commands live in `scripts` inside `package.json`. Three files, three formats. Lefthook collapses all of that into one YAML file with a clear hierarchy: lifecycle event → command name → what to run.

That's not a knock on Husky. Husky is reliable, battle-tested, and used by half the JavaScript ecosystem. If you're already using it, there's no reason to migrate. But if you're setting up a new project and you want fewer moving parts, Lefthook is the simpler tool.

## Lifecycle events Lefthook supports

Lefthook hooks into every [Git hook](https://git-scm.com/docs/githooks) that Git supports. The ones I actually use:

- **`pre-commit`:** Lint, format, secret scan. Staged files only. Under ten seconds.
- **`commit-msg`:** Validate the commit message format, if you care about that. I mostly don't, but some teams do.
- **`pre-push`:** Typecheck, dead code scan, unit tests. The slightly-slower-but-still-local checks.
- **`post-merge`:** Run `npm install` automatically after pulling, so dependencies stay in sync. This one is underrated.
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

That instruction belongs in your agent instructions, whether that file is `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules`, but if you want an actual enforcement boundary, use the agent's hook or permissions system. The implementation differs quite a bit across tools.

## Stopping `--no-verify`

The goal here is simple: if an agent tries to run `git commit --no-verify`, block the command and tell it to fix the failing hook instead.

### Claude

[Claude Code hooks](https://docs.claude.com/en/docs/claude-code/hooks) are the cleanest option because a `PreToolUse` hook can inspect the full Bash command _before_ it runs and return `permissionDecision: "deny"`.

Add the hook to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/block-no-verify.mjs\""
          }
        ]
      }
    ]
  }
}
```

Then inspect the pending shell command. The slightly weird-looking `fs.readFileSync(0, 'utf8')` is not reading a project file from disk. In Unix processes, file descriptor `0` is stdin, and Claude Code sends the hook payload JSON there for command hooks:

```js
import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

if (!/(^|\s)--no-verify(\s|$)/.test(command)) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Never bypass Git hooks with --no-verify. Fix the failing hook instead.',
    },
  }),
);

process.exit(0);
```

Because the hook sees the whole command string, this catches `--no-verify` even when it is not the first flag.

### Cursor

[Cursor](https://www.cursor.com/)'s CLI permissions still live in `.cursor/cli.json`, but
permissions are the wrong tool for a narrow "block only `git commit --no-verify`" policy.
For that, use Cursor's native [Hooks](https://cursor.com/docs/hooks) system. As of the
current Cursor Hooks API, a `beforeShellExecution` hook can inspect the full shell command
and deny it before it reaches the terminal.

Create a `.cursor/hooks.json` file at the root of your project:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "python3 .cursor/hooks/block-no-verify.py",
        "matcher": "git",
        "failClosed": true
      }
    ]
  }
}
```

The matcher is just a fast filter. The hook script still needs to inspect the command so
read-only Git commands and unrelated shell commands keep working. This example uses Python 3
because `shlex` is a better fit than guessing at shell quoting with a regular expression:

```python
#!/usr/bin/env python3
import json
import shlex
import sys

GIT_GLOBAL_OPTIONS_WITH_VALUES = {
    "-C",
    "-c",
    "--config-env",
    "--exec-path",
    "--git-dir",
    "--namespace",
    "--work-tree",
}

COMMIT_OPTIONS_WITH_VALUES = {
    "-C",
    "-F",
    "-S",
    "-c",
    "-m",
    "-t",
    "--author",
    "--cleanup",
    "--date",
    "--file",
    "--fixup",
    "--message",
    "--pathspec-from-file",
    "--reedit-message",
    "--reuse-message",
    "--squash",
    "--template",
    "--trailer",
}


def respond(permission, message=None):
    response = {"permission": permission}
    if message:
        response["user_message"] = "Agent blocked from bypassing pre-commit hooks."
        response["agent_message"] = message
    print(json.dumps(response))


def split_shell_words(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|")
    lexer.whitespace_split = True
    return list(lexer)


def command_segments(words):
    segments = []
    current = []

    for word in words:
        if word in {"&&", "||", ";", "|", "&"}:
            if current:
                segments.append(current)
                current = []
        else:
            current.append(word)

    if current:
        segments.append(current)

    return segments


def without_environment_prefix(words):
    while words and "=" in words[0] and not words[0].startswith("-"):
        words = words[1:]

    if not words or words[0] != "env":
        return words

    words = words[1:]
    while words:
        if words[0] in {"-u", "--unset", "-C", "--chdir"}:
            words = words[2:]
        elif words[0].startswith("-"):
            words = words[1:]
        elif "=" in words[0]:
            words = words[1:]
        else:
            break

    return words


def option_takes_value(option, options_with_values):
    return option in options_with_values or any(
        option.startswith(f"{known_option}=") for known_option in options_with_values
    )


def git_subcommand_index(words):
    if not words or words[0] != "git":
        return None

    index = 1
    while index < len(words):
        word = words[index]
        if not word.startswith("-"):
            return index

        if word in GIT_GLOBAL_OPTIONS_WITH_VALUES and "=" not in word:
            index += 2
        else:
            index += 1

    return None


def has_no_verify(args):
    index = 0
    while index < len(args):
        word = args[index]

        if word == "--":
            return False

        if word == "-n" or word.startswith("--no-verify"):
            return True

        if option_takes_value(word, COMMIT_OPTIONS_WITH_VALUES) and "=" not in word:
            index += 2
        else:
            index += 1

    return False


def blocks_hook_bypass(words):
    words = without_environment_prefix(words)
    subcommand_index = git_subcommand_index(words)
    if subcommand_index is None or words[subcommand_index] != "commit":
        return False

    return has_no_verify(words[subcommand_index + 1 :])


try:
    payload = json.load(sys.stdin)
    command = payload["command"]
    words = split_shell_words(command)
except Exception:
    respond("deny", "Cursor could not evaluate the pending command, so the hook failed closed.")
    raise SystemExit(0)

if any(blocks_hook_bypass(segment) for segment in command_segments(words)):
    respond(
        "deny",
        "Do not use --no-verify or -n. Run a standard git commit and fix hook failures instead.",
    )
else:
    respond("allow")
```

Because `failClosed` is `true`, Cursor blocks the matched command if the script crashes,
returns invalid JSON, or cannot be executed. That is what you want for a policy hook, but it
also means `python3` needs to be available wherever Cursor runs the hook.

This keeps general read-only Git tasks like `git status` and `git diff` available while
blocking the bypass you actually care about, including `git commit --no-verify`,
`git commit -n`, and common forms like `git -C path commit --no-verify`.

### Codex

[Codex hooks](https://developers.openai.com/codex/hooks) can intercept `Bash` in `PreToolUse`, which makes them the right tool for a flag-level policy like this. [`prefix_rule`](https://developers.openai.com/codex/rules) is great for prefix-based outside-sandbox policy, but `--no-verify` can appear later in the argument list, so a hook is the precise solution.

Enable hooks in `.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Then register a `PreToolUse` hook in `.codex/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/.codex/hooks/block-no-verify.mjs\"",
            "statusMessage": "Checking for --no-verify"
          }
        ]
      }
    ]
  }
}
```

And inspect `tool_input.command` before the shell command runs. Same deal here: `0` means stdin, which is where Codex delivers the hook event payload for command hooks:

```js
import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

if (!/(^|\s)--no-verify(\s|$)/.test(command)) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'Do not use --no-verify. Fix the failing hook instead.',
    },
  }),
);

process.exit(0);
```

If you want a broader Codex policy, use a `.rules` file to forbid `git commit` outside the sandbox entirely and reserve hooks for the more precise "spot this flag anywhere in the command" case.

## The one thing to remember

Lefthook replaces Husky and lint-staged with a single YAML file. One file, one tool, all lifecycle events. Pre-commit for the fast stuff—lint, format, secret scan. Pre-push for the medium stuff—typecheck, dead code, tests. Everything else goes in CI. The hook that nobody runs is worse than the slower hook that still catches things, so keep it fast and keep it scoped.

## Additional Reading

- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
