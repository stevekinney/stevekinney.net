# Course Dry-Run Workflow

Use this workflow when you need to validate or publish the **Self-Testing AI Agents** course against the current `shelf-life` starter.

## Default contract

- **Default mode:** `audit-and-fix`.
- **Publish mode:** only when the prompt explicitly says `publish`, `reconcile main`, `ship to main`, or an equivalent phrase that clearly authorizes `main` mutation.
- **Manifest source:** always derive the course workload from `courses/self-testing-ai-agents/index.toml`. Never hard-code counts.
- **First-class content:** lessons, labs, and solution pages all count. A lab passing is not enough if the paired lesson or solution snippet drifted.

## Repositories and shared artifacts

- **Starter repository:** `/Users/stevekinney/Developer/shelf-life`
- **Course repository:** `/Users/stevekinney/Developer/stevekinney.net`
- **Session root:** `tmp/dry-run/<session-slug>/`
- **Canonical artifacts:**
  - `manifest.json`
  - `validation-results.json`
  - `summary.md`

Generate the manifest first:

```sh
node tools/course-dry-run/scripts/build-course-manifest.mjs \
  --course-root courses/self-testing-ai-agents \
  --out tmp/dry-run/<session-slug>/manifest.json
```

Then run the audit:

```sh
node tools/course-dry-run/scripts/audit-course-content.mjs \
  --manifest tmp/dry-run/<session-slug>/manifest.json \
  --out-dir tmp/dry-run/<session-slug>
```

## Phase 0: preflight

- Confirm both repositories are present and readable.
- Treat the starter as `local-only` unless the prompt explicitly authorizes remote writes.
- In `audit-and-fix`, stop before mutating `main`, deleting branches, or opening pull requests.
- If you need to touch visual-regression baselines, CI workflow YAML, or `lefthook.yml`, read `pitfalls.md` first.

## Phase 1: execute labs

Walk the manifest in order and execute every lab the reader can execute locally.

- Classify each lab as `local-only`, `github-remote`, `third-party-saas`, or `hosted-deploy`.
- Execute local labs inside isolated worktrees under `tmp/dry-run/<session-slug>/`.
- Use `tools/course-dry-run/references/dry-run.env.template` for the worktree bootstrap instead of `.env.example`.
- Record lab execution into `validation-results.json` under the lab entry's `labExecution` field.
- For remote-gated labs, record a degraded result such as `blocked-by-external` or `manual-continuation-logged` instead of pretending the lab passed.

## Phase 2: validate snippets

After lab execution, validate fenced blocks across every lesson, lab, and solution page.

- Use `snippet-validation.md` as the decision matrix.
- For blocks that claim to show the real shipped shape, compare them against the referenced starter file.
- For executable snippets, run the lightest trustworthy check:
  - syntax parse
  - shell parse
  - typecheck in temp space
  - compare against shipped file content
- If a snippet is intentionally partial, it must be marked as `illustrative-partial` and the surrounding prose must point at the shipped file that fills in the omitted context.

## Phase 3: audit the content

Audit every manifest entry on three axes:

1. `code-coverage`: does the lesson introduce the files, commands, and configuration the lab asks the reader to write?
2. `success-visibility`: does the content show what success looks like when a visual reference would reduce ambiguity?
3. `reader-friction`: does the content force repeated setup, unnecessary boilerplate, or context switches that should move into the starter or be rewritten as a walkthrough?

Every `reader-friction` finding must end in one of these dispositions:

- `delete-step`
- `pre-ship-scaffold`
- `rewrite-as-walkthrough`
- `cross-reference-existing-section`

## Phase 4: apply fixes

Apply the smallest truthful fix.

- **Starter fix:** when the shipped code is wrong, missing, or should absorb repetitive scaffold.
- **Course fix:** when the prose drifted, omitted context, or asks the reader to invent glue.
- **Walkthrough rewrite:** when the starter already ships the final shape and asking the reader to recreate it adds ceremony without teaching value.

Record fixes in each entry's `fixes` array:

- `target`: `starter` or `course`
- `reason`
- `requiredBefore`
- `publishImpact`

## Phase 5: publish mode only

Only run this phase when the prompt explicitly requests publish mode.

- Create the safety tag.
- Reconcile the validated starter changes onto the integration branch.
- Re-run the four quality gates.
- Fast-forward or otherwise update `main` only after explicit authorization.
- Verify clean-clone behavior and hosted CI by SHA.
- Leave the canonical audit trail in the session directory, not on `main`.
