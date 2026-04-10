---
title: Dead Code Detection
description: Agents leave orphans behind. Knip and dependency-cruiser find them before the orphans rot into a half-working codebase.
modified: 2026-04-07
date: 2026-04-06
---

I have a specific grievance with agents and I want to get it out of the way at the top of this lesson.

Agents love to leave dead code behind. You ask them to rewrite a module, they write the new version, and the old version is still there, unreferenced, in a file that nobody will delete because nobody notices. You ask them to rename a function, they create the new name, they use the new name in the places they know about, and the old name still exists somewhere and is still exported from a barrel file and still getting imported by some test you forgot about. You ask them to remove a feature, they remove the UI for it and leave the API handler, or they remove the API handler and leave the database column.

This is not a moral failure on the agent's part. It is a predictable consequence of how agents work—they make _additive_ changes efficiently, and they make _subtractive_ changes only to the specific things they were told to change. The result is a codebase that accretes orphaned code at roughly the rate the agent is working, and if you're not catching the orphans, you're drowning in them within a month.

The answer is dead code detection. Run it continuously. Treat orphans as a quality gate, not a cleanup task. This is the module where we turn orphan-detection into a first-class citizen of the loop.

## The tools

Two that I use, in order of how much I lean on them.

**[knip](https://knip.dev/)** is the comprehensive one and it's the default I reach for. It understands the entire module graph of your project and tells you about unused files, unused exports, unused dependencies, unused types, and unused `devDependencies`. It's configurable but it has sensible defaults for most stacks (including SvelteKit).

```sh
bun add -D knip
bunx knip
```

First run on Shelf: you'll probably see a dozen findings. Most of them will be legitimate. A few will be false positives—things knip thinks are unused but are actually dynamically referenced. Configure knip to ignore those specific cases and move on.

> [!NOTE]
> You may run across older articles recommending `ts-prune` as a peer of knip. Skip it. The project is no longer maintained and its own README points readers at knip as the replacement.

**[dependency-cruiser](https://github.com/sverweij/dependency-cruiser)** is the architectural one. It understands your module graph deeply enough to enforce rules like "nothing under `src/lib/server/` may be imported from `src/routes/`'s client-side code" or "the `legacy-auth/` directory is not allowed to have any incoming edges from outside itself." This is not primarily a dead-code tool—it's a circular-dependency, boundary-enforcement, architectural-rules tool—but it catches dead code as a side effect because orphaned modules are easy to spot in a graph.

```sh
bun add -D dependency-cruiser
bunx depcruise --init
```

Not everyone needs dependency-cruiser. It's worth it when your codebase has architectural boundaries you care about. For Shelf, I'm using it mainly to lock down the `legacy-auth/` directory so nothing imports from it and we can tell when it's safe to delete.

## Running knip for real

Knip's config lives in `knip.json` (or `knip.jsonc`). A reasonable Shelf starting point:

```jsonc
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": [
    "src/app.html",
    "src/hooks.server.ts",
    "src/routes/**/+*.{ts,svelte}",
    "tests/**/*.{test,spec}.ts",
    "scripts/*.ts",
  ],
  "project": ["src/**/*.{ts,svelte}", "tests/**/*.ts", "scripts/**/*.ts"],
  "ignore": ["src/lib/legacy-auth/**"],
}
```

`entry` is the list of files knip treats as roots of the import graph—anything not transitively imported from an entry is unused. For SvelteKit, the entries are the route files, the hooks, and the app template. Tests are entries too, otherwise knip will flag test files as unused.

`project` is the scope of what knip analyzes. `ignore` skips files we deliberately don't care about.

Run it:

```sh
bunx knip
```

Read the output. Delete the things that are actually dead. Configure the things that are false positives. This first pass is the slowest one—after this, each subsequent run is fast and boring.

## What to do with the findings

For each finding, you have three options:

1. **Delete it.** Most findings should be deletes. The export is dead because the code that used it got refactored six weeks ago and nobody cleaned up. `rm` the file (or the export), rerun tests, commit. If you feel nervous, git will remember it forever.
2. **Use it.** Sometimes the finding reveals that you forgot to wire something up. The export exists, the implementation is there, but nobody is importing it. Either because the feature is half-built or because an agent wrote both halves separately and never connected them. Fix the wiring.
3. **Configure it as allowed.** Some things are legitimately used but knip can't see the usage—dynamic imports, reflection-heavy code, framework magic. Add the specific file or pattern to knip's ignore list with a _comment explaining why_. This is the key detail: ignored entries rot over time, and a comment is the only way future-you knows whether the ignore is still needed.

Don't just mute findings. Every ignore is a future bug.

## Wiring dead code detection into the loop

The trick with dead code detection is running it _often enough_ that orphans don't accumulate. Options, in order of tightness:

- **On every CI run.** Block merge if knip reports new findings.
- **On every commit via a git hook.** The lint-staged / husky lesson has the details.
- **On every save, via a file watcher.** Knip doesn't have an editor extension, but you can wire `bunx knip --no-progress` into a `chokidar` watcher if you want findings without leaving the editor.
- **On a nightly job** that opens a cleanup PR. This is the lowest-friction version—nobody is blocked, but the cleanup happens automatically.

My default is "on every CI run, with a pinned count." The script:

```sh
# package.json
"knip": "knip --reporter compact",
"knip:check": "knip --reporter compact | tee .knip-output && ...compare to baseline..."
```

Approach: commit the current count to a `.knip-baseline` file. CI fails if the count goes up. Devs can lower it at will. Agents see the check fail, go find the orphan they just created, and clean it up. Over time, the baseline ratchets down to zero.

Alternative approach, simpler: fail CI if knip finds anything at all. This is strict but it forces cleanup on the PR that introduced the orphan, which is the cheapest possible time to fix it. I prefer this on new codebases and the ratchet approach on old ones.

## `CLAUDE.md` rules

```markdown
## Dead code

- Run `bun run knip` before declaring a task done. It must report zero
  findings in files you touched.
- If knip reports a file or export you added as unused, either:
  (a) complete the wiring so it's actually used, or
  (b) delete it. Do not ignore it in `knip.json` without a written
  justification.
- Do not leave old code "for reference" after a refactor. Git history
  is the reference. Delete the old code.
- When removing a feature, search for every reference to the feature
  and remove them all in one commit. Do not leave the API handler
  behind after deleting the UI, or vice versa.
```

That last rule is the one I break most often on projects without dead code detection. The static layer exists so that the rule is enforced mechanically instead of relying on me to notice.

## The architectural layer: dependency-cruiser for directory boundaries

Dependency-cruiser's killer feature for our purposes is enforcing "nothing imports from `legacy-auth/`." Here's a minimal config:

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Orphaned modules are almost always dead code.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // config dotfiles
          '\\.d\\.ts$', // type declarations
        ],
      },
      to: {},
    },
    {
      name: 'no-legacy-auth-imports',
      severity: 'error',
      comment: 'legacy-auth/ is scheduled for deletion. Nothing new should import from it.',
      from: { pathNot: '^src/lib/legacy-auth' },
      to: { path: '^src/lib/legacy-auth' },
    },
  ],
};
```

Two rules. `no-orphans` flags any file that isn't reachable from the graph. `no-legacy-auth-imports` enforces the directory boundary. Run `bunx depcruise src` and both rules fire on any violation.

I don't always run dependency-cruiser in the fast local loop—it's slower than knip. I usually run it in CI and let CI fail on violations. The local loop catches most orphans via knip; dependency-cruiser is the safety net for structural regressions.

## When orphan detection gets noisy

Sometimes you'll hit a phase where knip is flagging things you know are fine, and the noise makes the signal invisible. A few recovery patterns:

- **Triage once, aggressively.** Block out an hour, go through every finding, resolve each one as delete, fix, or ignore-with-comment. The baseline-after-triage should be close to zero.
- **Fail on new findings, not existing ones.** The baseline-ratchet approach. New code is clean, old code gets cleaned up opportunistically.
- **Tighten the entry list.** Many false positives come from knip not knowing your entry points. Audit the `entry` list in `knip.json` and make sure it's accurate.
- **Ignore framework magic explicitly.** SvelteKit, Next.js, and similar frameworks have files that knip can't see as entries (route layouts, error pages). Add them to `entry` explicitly.

Don't let noise become the reason you turn orphan detection off. The whole point is that it's _annoying_—annoyance is the signal that something needs to be fixed.

## The one thing to remember

Agents accrete dead code faster than humans do because additive edits are the cheap path and subtractive edits aren't. Dead code detection is the anti-accretion force. Run it on every CI build, treat orphans as a gate instead of a cleanup, and your codebase doesn't drift into tech debt just because the agent has been productive for two weeks straight.

## Additional Reading

- [Lint and Types as Guardrails](lint-and-types-as-guardrails.md)
- [Git Hooks with Husky and Lint-Staged](git-hooks-with-husky-and-lint-staged.md)
