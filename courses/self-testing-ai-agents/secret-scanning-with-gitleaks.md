---
title: Secret Scanning with Gitleaks
description: Agents commit fake API keys. Sometimes they commit real ones. Gitleaks is the boring tool that prevents the latter with almost no configuration.
modified: 2026-04-09
date: 2026-04-06
---

Short lesson. Important lesson.

I mentioned in Module 1's lab that Shelf ships with a `sample-config.json` containing a fake API key. That's on purpose. It's bait. The bait is there because an agent will, given half a chance, copy a "real example" secret from one file to another file that's about to be committed, and I want us to see the feedback loop fire on a fake before you ever deploy to a real project.

This is not hypothetical. I have personally watched Claude Code, Cursor, and Codex all commit credentials in the last year. Every time, the fix was the same: install gitleaks, configure the hook, and the mistake becomes impossible to repeat. Every time, the reason it happened in the first place was that secret scanning wasn't installed.

Install it now. Before the agent commits something you actually have to rotate.

## What Gitleaks does

[Gitleaks](https://github.com/gitleaks/gitleaks) is a single binary. It scans files (or git history) for patterns that match known secret formats: AWS keys, GitHub tokens, Slack tokens, Stripe keys, OpenAI API keys, private keys, JWTs, generic "looks like a secret" strings. When it finds one, it fails loudly with the file path, line number, and a redacted preview of the match.

It has two practical modes in this workshop:

- **Full repository or history scan.** Current Gitleaks releases expose this via commands like `gitleaks git ...`, and older tutorials often show `gitleaks detect ...`. Run the full scan once when you install it, and again in CI as a safety net.
- **Staged-content scan.** In the current Shelf starter, this is a repo-local helper script that snapshots the exact git index and runs `gitleaks dir` on that temporary directory. Fast. Use this in the pre-commit hook.

The combination catches both "the agent is about to commit a secret" and "a secret has already snuck in through some other path."

## Installing Gitleaks

Gitleaks is a Go binary, not an npm package. Install it with your OS package manager:

```sh
# macOS
brew install gitleaks

# Linux (various)
# See https://github.com/gitleaks/gitleaks#installing
```

There's also a Docker image and a [GitHub Action](https://docs.github.com/en/actions). I prefer the binary because it runs fast locally. Check gitleaks is on your `$PATH`:

```sh
gitleaks version
```

## Wiring it into the pre-commit hook

Add to `lint-staged` config:

```json
{
  "lint-staged": {
    "*": ["npx tsx scripts/run-gitleaks-staged.ts"]
  }
}
```

In the validated Shelf repo, that script materializes the exact staged snapshot into a temporary directory and runs `gitleaks dir` on it. That is more reliable than depending on whichever staged-file flags your installed Gitleaks version happens to support this month.

Test it:

```sh
echo "AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" > fake.env
git add fake.env
git commit -m "testing secret scanner"
```

You should see a gitleaks report and an aborted commit. Clean up:

```sh
git reset HEAD fake.env
rm fake.env
```

If the hook didn't fire, double-check gitleaks is installed and lint-staged is wired correctly.

## Running it on history, once

If you're adding Gitleaks to an existing project, run a full scan over the repository or git history first. There are almost always findings.

```sh
# Current releases usually expose this as:
gitleaks git --redact

# Older tutorials may show:
gitleaks detect --redact
```

For each finding:

1. **Was it real?** If yes, rotate the credential _immediately_. That's step one, before anything else. A committed secret is compromised, period, even if nobody "found" it. Rotate the key, then deal with the git history.
2. **Scrub history.** Use `git filter-repo` or `bfg` to remove the secret from every past commit. This rewrites history, which means everyone on the team has to re-clone. Coordinate.
3. **Document the incident.** Not blame. Incident. "On this date, this credential was exposed, we rotated it, we scrubbed it from history, here's the gitleaks rule that would have caught it." This becomes the training data for why you have the hook.

If the finding is a false positive—a placeholder like `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`—add an allowlist entry for the specific pattern so gitleaks stops flagging it. More on the allowlist below.

## The `.gitleaks.toml` config

Most of the time you don't need a config file—gitleaks' defaults are good. But two use cases justify one.

**Allowlisting false positives.** Shelf's `sample-config.json` contains a deliberately fake API key. The Module 8 lab walks through this in two beats: first, you run gitleaks _without_ any config so the bait file gets flagged—that's the point of the bait, to prove the scanner works on a known-bad input. Then, _after_ you've seen the failure, you add `sample-config.json` to the allowlist so the team isn't tripping the rule on the same intentional file forever after. The config below is the "after the lab" version:

```toml
# .gitleaks.toml
[extend]
# Use gitleaks' default rules as a base.
useDefault = true

[allowlist]
description = "Global allowlist"
paths = [
  '''sample-config\.json$''',
  '''tests/fixtures/.*''',
]
```

The `paths` list skips files that match. `sample-config.json` is excluded _after_ the lab demonstrates the bait getting caught. `tests/fixtures/` is excluded because fixtures routinely contain realistic-looking-but-fake data.

**Adding custom rules.** If your organization uses a proprietary token format that gitleaks' defaults don't cover, you can add a rule:

```toml
[[rules]]
id = "shelf-internal-token"
description = "Shelf internal service token"
regex = '''shelf_tok_[a-zA-Z0-9]{40}'''
tags = ["token", "shelf"]
```

Gitleaks will now flag anything matching that pattern. Useful for "we have an internal secret format nobody else knows about."

## The `.gitleaksignore` file

Sometimes Gitleaks flags a specific finding that you genuinely want to keep. Maybe it's an example in documentation, maybe it's a literal constant that happens to match a secret pattern. For one-off exemptions, use `.gitleaksignore`:

```
# .gitleaksignore
path/to/file.md:generic-api-key:42
```

Current releases generally expect the fingerprint format Gitleaks prints in its own output, not a hand-typed bare line number. Copy the exact identifier from the report instead of inventing it. Much finer-grained than the path allowlist, which skips entire files.

Do not let `.gitleaksignore` become a dumping ground. Every line is a promise you made to keep ignoring a finding, and every promise should be checked periodically. Review the file on a schedule.

## CI as the safety net

Even with a rock-solid pre-commit hook, run gitleaks in CI too. The pre-commit hook can be bypassed (`--no-verify`), can fail to install (new team member didn't run `bun install`), can be misconfigured in a way that passes locally but not in CI. The CI run is the catch-all.

In GitHub Actions (we'll go deeper on CI in Module 9):

```yaml
# .github/workflows/security.yml
- name: Scan for secrets
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The official action is the easy path. It runs Gitleaks on every push and PR, fails the build on any finding, and gives you a clean CI gate even when someone bypasses the local hook.

> [!NOTE]
> Check the current licensing and setup requirements for `gitleaks/gitleaks-action@v2` before you standardize on it for organization repos. If the official action is a bad fit for your plan, invoke the CLI directly in a shell step instead. The important part is the CI gate, not the wrapper.

## `CLAUDE.md` rules

```markdown
## Secrets

- Never commit a real API key, access token, password, or private key
  to this repository. Real secrets live in `.env.local` (gitignored)
  or in the deployment environment's secret manager.
- Sample configuration files (`sample-config.json`, `.env.example`)
  may contain placeholder values that look like credentials. Use
  obviously-fake values like `your_api_key_here`, not values that could
  be mistaken for real keys.
- Gitleaks runs in the pre-commit hook. If it flags your commit, do
  not bypass it. Remove the secret and replace it with a placeholder.
- If you believe a gitleaks finding is a false positive, add an
  allowlist entry in `.gitleaks.toml` with a comment explaining why.
  Do not add to `.gitleaksignore` without a comment.
```

The "obviously-fake values" rule is specifically to prevent the agent's favorite move: copying `AKIAIOSFODNN7EXAMPLE` out of a tutorial and pasting it into a real config file, where gitleaks then flags it because it looks real. Use obviously-fake values that don't pattern-match any known secret format. `placeholder_value`, `replace_me`, `your_key_here`—all fine, all unambiguously not real.

## The 30-second version of this whole lesson

1. Install gitleaks.
2. Add the staged-snapshot helper script to `lint-staged`.
3. Run a full Gitleaks scan once on your existing history. Rotate anything real that it finds.
4. Add the gitleaks GitHub Action to your CI as a safety net.
5. Never bypass the hook. If gitleaks says it found a secret, it found a secret.

That's the whole thing. Five steps, most of a Tuesday morning, and the problem of "the agent committed an API key" disappears from your life.

## The one thing to remember

Secret scanning is the cheapest, highest-value thing in this entire module. The hook catches mistakes before they're public, the CI run catches mistakes the hook missed, and the allowlist lets you keep false positives out of the way. Install it this afternoon. Thank me later.

## Additional Reading

- [Git Hooks with Husky and Lint-Staged](git-hooks-with-husky-and-lint-staged.md)
- [Lab: Wire the Static Layer into Shelf](lab-wire-the-static-layer-into-shelf.md)
