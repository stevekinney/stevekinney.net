---
title: GitHub Actions
description: >-
  GitHub's built-in automation system for CI, CD, and everything else humans keep
  trying to do by hand—how the workflow model works, where the security surface
  lives, and the footguns that look like features until they go off.
modified: 2026-03-17
date: 2026-03-01
---

GitHub Actions is GitHub's built-in automation system for CI, CD, release pipelines, repository housekeeping, security workflows, and the rest of the chores humans keep trying to do by hand. A [workflow][1] is a YAML file stored in `.github/workflows`, and it runs when a matching event happens in the repository, on a schedule, or when someone triggers it manually. A repository can have many workflows, each aimed at a different job.

The part that confuses people is that GitHub Actions is not one thing. It's a workflow engine, an execution platform, a packaging format for reusable actions, a runner fleet, a security surface, and a policy system. It looks like "some YAML and a couple of `uses:` lines," right up until you have forks, deployments, self-hosted runners, cloud credentials, cache correctness, and one teammate who thinks `pull_request_target` is a fun way to meet incident response.

## The Mental Model

The [core model][3] is straightforward. A **workflow** contains one or more **jobs**. Jobs run on **runners**, and each job contains **steps**. A step is either a shell command with `run:` or an action invoked with `uses:`. Jobs can run in parallel or be forced into sequence with `needs`. Each job runs on its own runner VM or in its own container context, which is why passing state across jobs is explicit instead of magical.

An [action][4] is a reusable building block. You can use actions from the same repository, from public repositories, or from Docker Hub images. GitHub also supports writing your own JavaScript, Docker, and composite actions, each described by an `action.yml` or `action.yaml` metadata file. Composite actions bundle steps; reusable workflows bundle whole jobs and workflow structure. Those are related ideas, but they're not the same thing, because apparently one reusable abstraction would have been too humane.

## The Anatomy of a Workflow

At the top level, the keys you'll care about most are `name`, `run-name`, `on`, `permissions`, `env`, `defaults`, `concurrency`, and `jobs`. The [workflow syntax reference][2] also defines job-level features like `if`, `strategy`, `container`, `services`, `outputs`, `uses`, `with`, and `secrets`, which is where most of the real work happens.

A good baseline workflow:

```yaml
name: CI

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/ci.yml'
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_ENV: test

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: true
      matrix:
        node: [20, 22]

    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: npm-${{ runner.os }}-${{ matrix.node }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-${{ matrix.node }}-
            npm-${{ runner.os }}-

      - run: npm ci
      - run: npm test

      - name: Save coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node-${{ matrix.node }}
          path: coverage/
          retention-days: 7
```

This example uses the features that matter in real repositories—event filters, least-privilege token permissions, concurrency control, a matrix, dependency caching, and artifacts. None of those are exotic. They're the difference between a toy workflow and one that doesn't waste money or set security traps for your future self.

## Triggers and Event Semantics

The `on:` block decides when the workflow starts. GitHub Actions can trigger on [repository activity, schedules, manual dispatch, workflow calls, workflow completions, and external events][6]. Common cases are `push`, `pull_request`, `workflow_dispatch`, `schedule`, `workflow_call`, and `workflow_run`. For repository events, you can narrow execution with activity `types`, branch filters, tag filters, and path filters. Manual workflows triggered with `workflow_dispatch` can be started from the Actions tab, GitHub CLI, or the REST API.

Path filters are worth using aggressively, especially in monorepos. If at least one changed path matches a `paths` rule, the workflow runs. This is the cheapest way to stop a docs edit from rebuilding your entire application stack, which is the kind of needless spectacle teams otherwise call "standard CI."

The `pull_request` family has gotchas people learn too late. A `pull_request` workflow [won't run][7] if the pull request has merge conflicts, while `pull_request_target` will. On `pull_request`, `GITHUB_SHA` is the last merge commit of the PR merge branch, not necessarily the latest commit on the contributor's head branch. If you need the contributor's actual head SHA, use `github.event.pull_request.head.sha`.

`pull_request_target` and `workflow_run` are privileged triggers and need real caution. GitHub's [security docs][8] warn that using them with untrusted code checkout can lead to cache poisoning and unintended access to write privileges or secrets. The safe default is simple—don't check out untrusted PR code under a privileged trigger unless you're absolutely sure you know what you're doing, which most people don't.

## Jobs, Steps, and Data Flow

Jobs are where orchestration happens. By default, independent jobs can run in parallel. Add `needs` to force sequencing, use `if:` to gate execution, and use job outputs when data has to cross job boundaries. Inside a job, steps execute in order, and each step can be either a command or an action.

Passing data inside a job and across jobs uses different tools. Within a job, write environment variables to `GITHUB_ENV` so later steps can read them. To expose a step output, write to `GITHUB_OUTPUT`, then map step outputs to job outputs with `jobs.<job_id>.outputs`, and finally consume those values in downstream jobs through the [`needs` context][10].

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.meta.outputs.tag }}
    steps:
      - id: meta
        run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.image_tag }}"
```

This step-output-to-job-output pattern is the normal way to move structured data through a workflow. It's much cleaner than writing temp files everywhere and hoping the next job sees them, which it won't, because jobs are isolated.

## Contexts, Expressions, and Variables

[Contexts][11] are GitHub Actions' runtime objects. The important ones are `github`, `env`, `vars`, `job`, `steps`, `runner`, `matrix`, `needs`, `inputs`, and `secrets`. The `github` context contains workflow-run metadata, while `vars` exposes configuration variables defined at the organization, repository, or environment level.

GitHub also sets a large set of [default environment variables][12] on every run. Those variables are available to steps, but they're not defined through the workflow's `env` map, which is why you generally access their workflow-time values through contexts such as `${{ github.ref }}` rather than through `${{ env.GITHUB_REF }}`. GitHub's docs also note that you can't overwrite `GITHUB_*` or `RUNNER_*` default variables.

Variable precedence is easy to get wrong. For plain `env`, the most specific scope wins—step overrides job, and job overrides workflow. For configuration variables in `vars`, the lowest level wins—environment overrides repository, which overrides organization. There's one nasty nuance: environment-level configuration variables only become available after the job starts executing, so they don't overwrite values already resolved in the `env` and `vars` contexts during workflow processing.

[Expressions][13] are the other half of the model. `fromJSON()` is useful for turning strings into booleans, integers, arrays, or full matrix objects. `toJSON()` is good for debugging contexts. `hashFiles()` is what you use for stable cache keys based on lockfiles or dependency manifests.

```yaml
jobs:
  define-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set.outputs.matrix }}
    steps:
      - id: set
        run: echo 'matrix={"include":[{"node":20},{"node":22}]}' >> "$GITHUB_OUTPUT"

  test:
    needs: define-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJSON(needs.define-matrix.outputs.matrix) }}
    steps:
      - run: echo "Node version is ${{ matrix.node }}"
```

That dynamic-matrix trick is one of the few advanced patterns that's actually worth knowing. It lets one job discover work and another fan out over it, which is useful in monorepos, generated target lists, and multi-environment deploy pipelines.

## Runners

A [runner][14] is the machine that executes a job. GitHub-hosted runners are the default managed VMs. Larger runners are GitHub-hosted runners with more CPU, RAM, and disk. Self-hosted runners are your machines. Actions Runner Controller, or ARC, is the Kubernetes operator for orchestrating and autoscaling self-hosted runners as runner scale sets.

Targeting runners happens through [`runs-on`][15]. For self-hosted infrastructure, GitHub recommends using an array of labels beginning with `self-hosted`, then more specific labels like `linux` or `ARM64`. A job will only run on a runner matching all specified labels. You can also target runner groups. One wrinkle the docs call out explicitly is that Actions Runner Controller doesn't support multiple labels and doesn't support the `self-hosted` label in the same way repository or organization self-hosted runners do.

Self-hosted runners buy control, but they also buy risk. For [Docker container actions][16] or service containers on self-hosted runners, you need Linux and Docker installed. GitHub's enterprise policy docs also warn that self-hosted runners aren't guaranteed to be clean, ephemeral machines, and that untrusted pull requests can compromise them if you expose them carelessly. That's why the sane pattern is ephemeral runners for sensitive or semi-untrusted workloads, not one immortal snowflake VM that every branch in the company gets to scribble on.

## Jobs in Containers and Service Containers

A job can run directly on the runner host, or you can wrap it in a [job container][17] with `jobs.<job_id>.container`. When you do that, ordinary `run:` steps execute inside that container, while any container actions run as sibling containers on the same network with the same volume mounts. One edge case many people miss—the default shell inside a job container is `sh`, not `bash`, unless you override it.

[Service containers][18] are the built-in answer for dependencies like PostgreSQL or Redis during tests. When the job itself runs in a container, GitHub puts the job container and the service containers on a user-defined bridge network, and you can reach a service by the label you gave it, which becomes its hostname. When the job runs directly on the runner host instead, you generally need to publish ports from the service container to the host.

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    container:
      image: node:20-bookworm

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
```

That setup is tidy because networking is simpler when both the job and the services live in containers. It also tends to be more reproducible than pretending the runner host's ambient state is part of the test contract.

## Reusing Logic

| Reuse mechanism    | Scope           | Invoked with         | Runner context     | Secrets access                   | Best for                           |
| ------------------ | --------------- | -------------------- | ------------------ | -------------------------------- | ---------------------------------- |
| Action (JS/Docker) | Single step     | `uses:` in `steps`   | Caller's runner    | Via `with:` inputs               | Reusable single-step operations    |
| Composite action   | Bundle of steps | `uses:` in `steps`   | Caller's runner    | Via `with:` inputs               | Multi-step recipes as one step     |
| Reusable workflow  | Whole jobs      | `uses:` at job level | Own runner per job | `secrets:` or `secrets: inherit` | Full job patterns (build + deploy) |

You can reuse logic at three levels. Use an action when you want a reusable step. Use a [composite action][19] when you want a bundle of steps that still behaves like one step. Use a reusable workflow when you want to reuse whole jobs, permissions, environments, matrices, or deployment structure. GitHub's own docs put composite actions and reusable workflows side by side for exactly this reason.

Actions themselves can live in the same repository, in a public repository, or in a Docker Hub image. GitHub doesn't support redirects for actions or reusable workflows, so if an action or workflow is renamed or moved, old references fail. Local actions use a relative path from `github.workspace`, which is why you almost always need `actions/checkout` first before calling a local action.

[Custom actions][20] come in three types. JavaScript actions are usually the fastest and simplest for ordinary logic. Docker actions package their own environment and are useful when you need very specific tooling, but GitHub notes they're slower because the container has to be built or retrieved. Composite actions are ideal when all you really want is "these five steps together, every time."

[Reusable workflows][21] are invoked at the job level with `uses:`—not inside `steps`. Inputs are passed with `with`, secrets with `secrets`, and the called workflow must declare `on: workflow_call`. Inputs in a called workflow are accessed through the `inputs` context, not injected as environment variables automatically. You can pass all available secrets with `secrets: inherit` when the caller and callee are in the same organization or enterprise.

Reusable workflows also have some sharp edges. You can nest at most ten levels of workflows. Permissions can only be maintained or reduced through the chain—never elevated. Secrets only move one hop at a time, so if A calls B and B calls C, C only gets a secret from A if A passed it to B and B passed it onward to C. Workflow outputs must be mapped from step outputs to job outputs and then from job outputs to workflow outputs.

Organization-level [workflow templates][22] are a separate feature. If you put templates in an organization-owned `.github` repository under `workflow-templates/`, GitHub can offer them when people create new workflows. The template metadata lives in a matching `.properties.json` file. Useful for standardizing bootstrap workflows across many repositories without forcing everything through one giant reusable workflow file.

## Caches, Artifacts, and Summaries

| Aspect          | Cache                                   | Artifact                              |
| --------------- | --------------------------------------- | ------------------------------------- |
| Purpose         | Reuse dependencies across runs          | Preserve or transfer build outputs    |
| Keyed by        | Deterministic key (e.g., lockfile hash) | Name + run ID                         |
| Lifetime        | Evicted by key match or 7-day default   | Configurable `retention-days`         |
| Cross-job use   | Restored by key in any job              | Downloaded by name in downstream jobs |
| Typical content | `node_modules`, `.cache`, build deps    | Coverage, binaries, screenshots, logs |

[Caches and artifacts][23] solve different problems. A cache is for reusing dependencies or intermediate files across workflow runs, keyed by a deterministic cache key. An [artifact][24] is a named file bundle produced by a workflow run—things like coverage reports, test results, binaries, screenshots, or build outputs you want to keep, inspect, or hand to a downstream job. Confusing the two is one of the classic GitHub Actions mistakes.

For caching, the important mechanic is the search order. `actions/cache` looks for an exact `key` first, then tries `restore-keys` from most specific to least specific, and on partial matches it uses the most recently created cache. That makes lockfile hashes the normal base for cache keys, with broader prefixes as fallbacks.

Artifacts are uploaded with `actions/upload-artifact` and downloaded with `actions/download-artifact`. You can name them, set `retention-days`, download all artifacts from a run or just one named artifact, and use artifacts to move files between jobs. If you want to download artifacts from a different run or workflow, you need a token and a run identifier.

GitHub Actions also supports [job summaries][9] through `GITHUB_STEP_SUMMARY`. When a job finishes, GitHub groups step summaries into a single job summary on the workflow run page. Great for human-readable reports—test totals, coverage percentages, links, deployment notes—so people don't have to spelunk through logs like mole people.

## Matrices, Parallelism, and Concurrency Control

[Matrices][25] are how you fan out one logical job over many combinations of variables like OS, runtime version, region, or target environment. You can refine them with `include` and `exclude`, and `include` is processed after `exclude`, which means you can deliberately add back special cases. You can also control behavior with `fail-fast` and `continue-on-error`. `fail-fast` defaults to `true`, so one hard failure can cancel queued or in-progress sibling matrix jobs.

You can also throttle a matrix with `max-parallel`, which is useful when your runners are scarce or the job hits an external rate limit. GitHub also documents a hard matrix limit of 256 jobs per workflow run, so the answer to "can I generate a 900-way matrix because it looks elegant" is, mercifully, no.

[`concurrency`][26] is the other big control surface. A concurrency group ensures that only one workflow or job in that group runs at a time, and a new run with the same key can cancel the old one. This is especially useful for deployments, branch-based CI, or long-running workflows where only the latest run matters.

## Deployments and Environments

[Environments][27] are GitHub Actions' deployment guardrails. You can attach a job to an environment, store environment-specific secrets and variables, and enforce deployment protection rules like manual approvals, wait timers, branch restrictions, and even custom protection rules via GitHub Apps. A job that references an environment must satisfy those rules before it can run or access the environment's secrets.

This is where GitHub Actions becomes an actual deployment platform instead of "CI with shell access." You can separate `staging` from `production`, require reviewers for prod, and serialize environment usage with `concurrency`. GitHub's [limits docs][35] also note that workflow runs can wait up to 30 days on environment approvals, which is either a useful enterprise feature or a monument to organizational indecision, depending on your office.

A typical deployment job:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test
    environment: production
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v5
      - name: Authenticate to cloud with OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-prod
          aws-region: us-east-1
      - run: ./deploy.sh
```

The important part isn't the cloud action itself. It's the shape—explicit environment, explicit concurrency, and explicit token permissions. That's the grown-up version of deployment automation.

## Security

GitHub Actions security starts with the `GITHUB_TOKEN`. GitHub recommends granting it the minimum permissions required, and their [secure use reference][29] explicitly says a good default is read-only access to repository contents, then raising permissions only for the jobs that truly need more. Another easy-to-miss rule—if you specify any permission explicitly, any permission you don't specify becomes `none`.

Also, an action can access the `GITHUB_TOKEN` through `github.token` even if you didn't explicitly pass `secrets.GITHUB_TOKEN` to it. That's why job-level `permissions:` blocks matter so much. The token is there whether you remember it or not. GitHub also [downgrades][30] forked-PR permissions to read-only in the common case, and Dependabot-triggered pull request workflows run as if they came from a fork—read-only `GITHUB_TOKEN`, no secrets.

[Secrets][31] deserve slightly less trust than people give them. GitHub says secrets are variables stored at the organization, repository, or environment level, and workflows only get access when you explicitly include them. But GitHub also warns that automatic redaction isn't guaranteed in all transformations, and their secure-use guidance notes that anyone with write access to the repository has read access to all repository secrets. For generated or non-secret values that still need masking, use `::add-mask::`.

[Script injection][32] is the next big trap. GitHub's security docs explicitly warn that attacker-controlled data can flow through contexts like `github.event.issue.title` or `github.event.pull_request.body`. If you interpolate those values directly into a shell script, GitHub evaluates the expression first and then the shell interprets the result, which is how command injection happens. The safer pattern is to pass untrusted values as action inputs or through environment variables and quote them correctly.

Third-party actions and workflows are a supply-chain risk. GitHub's secure use reference is blunt—one compromised third-party action can expose repository secrets and abuse the `GITHUB_TOKEN`. Their recommended mitigation is to pin actions to a full-length commit SHA, which they call the only immutable release form for an action. Tags are convenient, but movable. GitHub also lets organizations and repositories enforce policies limiting which actions and reusable workflows are allowed, and even require full-length SHA pinning.

`CODEOWNERS` is worth using for `.github/workflows`. GitHub explicitly recommends it as a way to require review for workflow changes. One of the cheapest ways to keep "tiny YAML edits" from quietly changing your security model.

[OIDC][33] is the right default for cloud authentication now. GitHub's docs say workflows can use OIDC tokens instead of long-lived cloud secrets, and the setup requires two broad changes—configure the cloud provider to trust GitHub as a federated identity, and update the workflow to request the ID token and exchange it through the provider's action or equivalent logic. In practice that means `permissions: id-token: write` on the job that needs cloud access.

GitHub also supports [artifact attestations][34] for build provenance. To generate them in Actions, GitHub requires the right permissions, including `id-token: write`, `contents: read`, and `attestations: write`, then a step using `actions/attest-build-provenance`. Useful when you want signed provenance for binaries, container images, or SBOMs rather than just vibes and a release note.

## Limits That Matter in Practice

GitHub Actions has real [platform limits][35], and pretending otherwise is how people end up discovering them in production. A workflow run can last up to 35 days total. Environment approval waits can last up to 30 days. A GitHub-hosted job can run for up to 6 hours, and a self-hosted job for up to 5 days. A matrix can generate at most 256 jobs. Cache operations also have rate limits, and `GITHUB_TOKEN` has its own API rate limit—1,000 requests per hour per repository, or 15,000 for resources belonging to a GitHub Enterprise Cloud account.

Those limits should shape your design. Very large test matrices should be pruned or sharded. Deploy jobs should use concurrency groups. Long-running work shouldn't live on standard GitHub-hosted runners unless it fits inside the time box. And if you have an action or script that hammers the GitHub API, rate limiting isn't a theoretical concern—it's a scheduling bug waiting to happen.

## Practical Patterns That Hold Up

For ordinary CI, use separate workflows for separate concerns—one for CI, one for release, one for deployment, one for scheduled maintenance—instead of one giant do-everything file. GitHub's event model, path filters, and reusable workflows are good enough that "single mega-workflow" is usually just a failure of restraint, not a platform requirement.

For organization standards, prefer reusable workflows for full job patterns like "build and scan," "deploy to environment," or "publish package," and use composite actions for small step bundles like "set up toolchain and authenticate package registry." That division maps well to the way GitHub designed the features, and it keeps your reuse model from turning into abstract YAML sculpture.

For security, start with restricted `GITHUB_TOKEN` permissions, pin third-party actions to full SHAs, avoid privileged triggers with untrusted checkout, move cloud auth to OIDC, and put CODEOWNERS on `.github/workflows`. That's not overkill. That's the baseline for not handing write access and secrets to whatever random marketplace action looked popular at 2 a.m.

For performance, use path filters, matrices only where they buy real coverage, caches keyed by lockfiles, concurrency groups for branch and deploy workflows, and artifacts only for things you truly need to keep. Caches are for reuse across runs. Artifacts are for preservation and transfer. Mixing those mental models is how workflows get slower and harder to reason about at the same time. A remarkable human achievement.

## Common Footguns

**Assuming `pull_request` runs on the contributor's exact head commit.** It usually doesn't—`GITHUB_SHA` points at the merge commit for the PR merge branch. If you need the contributor's head SHA, use `github.event.pull_request.head.sha`.

**Assuming everything in a called reusable workflow shows up as environment variables.** It doesn't. `jobs.<job_id>.with` inputs passed to a reusable workflow are available through the `inputs` context in the called workflow, not as environment variables by default.

**Assuming `env:` behaves like a scripting language.** It doesn't. In the workflow syntax, variables in the same `env` map can't be defined in terms of one another, and GitHub uses the most specific scope when names collide.

**Forgetting that local actions live under `github.workspace`.** If you want `uses: ./.github/actions/my-action`, you need the repository checked out first, and the path is relative to the checked-out workspace, not to your workflow file.

**Assuming action renames are harmless.** GitHub explicitly doesn't support redirects for actions or reusable workflows, so if the owner or name changes, old workflow references fail. One more reason to pin dependencies deliberately and not treat marketplace references like permanent natural laws.

**Assuming secrets automatically flow through reusable workflow chains.** They don't. Secrets pass only to directly called workflows unless explicitly forwarded along each hop.

**Assuming container jobs behave like normal Linux hosts.** In a container job, the default shell for `run:` is `sh`, not `bash`, which is a very efficient way to discover how much your scripts depended on Bashisms you swore were portable.

## The Bottom Line

GitHub Actions is easy to begin and serious to operate. At small scale it's a pleasant YAML-based automation tool. At larger scale it becomes workflow design, runner strategy, token scoping, supply-chain hygiene, cloud federation, and deployment policy—all disguised as a CI system. The teams that do well with it aren't the ones that write the cleverest YAML. They're the ones that treat Actions like production infrastructure, because it is.

[1]: https://docs.github.com/actions/using-workflows/about-workflows 'Workflows - GitHub Docs'
[2]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions 'Workflow syntax for GitHub Actions - GitHub Docs'
[3]: https://docs.github.com/articles/getting-started-with-github-actions 'Understanding GitHub Actions - GitHub Docs'
[4]: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/using-pre-written-building-blocks-in-your-workflow 'Using pre-written building blocks in your workflow - GitHub Docs'
[5]: https://docs.github.com/actions/using-workflows/triggering-a-workflow 'Triggering a workflow - GitHub Docs'
[6]: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows 'Events that trigger workflows - GitHub Docs'
[7]: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows 'Events that trigger workflows - GitHub Docs'
[8]: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/security/secure-use 'Secure use reference - GitHub Enterprise Cloud Docs'
[9]: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands 'Workflow commands for GitHub Actions - GitHub Docs'
[10]: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/passing-information-between-jobs 'Passing information between jobs - GitHub Docs'
[11]: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts 'Contexts reference - GitHub Docs'
[12]: https://docs.github.com/en/actions/reference/workflows-and-actions/variables 'Variables reference - GitHub Docs'
[13]: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/expressions 'Evaluate expressions in workflows and actions - GitHub Docs'
[14]: https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners 'GitHub-hosted runners - GitHub Docs'
[15]: https://docs.github.com/actions/using-jobs/choosing-the-runner-for-a-job 'Choosing the runner for a job - GitHub Docs'
[16]: https://docs.github.com/actions/sharing-automations/creating-actions/creating-a-docker-container-action 'Creating a Docker container action - GitHub Docs'
[17]: https://docs.github.com/actions/using-jobs/running-jobs-in-a-container 'Running jobs in a container - GitHub Docs'
[18]: https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers 'Communicating with Docker service containers - GitHub Docs'
[19]: https://docs.github.com/actions/creating-actions/creating-a-composite-action 'Creating a composite action - GitHub Docs'
[20]: https://docs.github.com/actions/creating-actions/about-custom-actions 'About custom actions - GitHub Docs'
[21]: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows 'Reuse workflows - GitHub Docs'
[22]: https://docs.github.com/actions/sharing-automations/creating-workflow-templates-for-your-organization 'Creating workflow templates for your organization - GitHub Docs'
[23]: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching 'Dependency caching reference - GitHub Docs'
[24]: https://docs.github.com/en/actions/tutorials/store-and-share-data 'Store and share data with workflow artifacts - GitHub Docs'
[25]: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow 'Running variations of jobs in a workflow - GitHub Docs'
[26]: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs 'Control the concurrency of workflows and jobs - GitHub Docs'
[27]: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments 'Deployments and environments - GitHub Docs'
[28]: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment 'Managing environments for deployment - GitHub Docs'
[29]: https://docs.github.com/en/actions/reference/security/secure-use 'Secure use reference - GitHub Docs'
[30]: https://docs.github.com/actions/reference/authentication-in-a-workflow 'Use GITHUB_TOKEN for authentication in workflows - GitHub Docs'
[31]: https://docs.github.com/en/actions/concepts/security/secrets 'Secrets - GitHub Docs'
[32]: https://docs.github.com/en/actions/concepts/security/script-injections 'Script injections - GitHub Docs'
[33]: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect 'OpenID Connect - GitHub Docs'
[34]: https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds 'Using artifact attestations to establish provenance for builds - GitHub Docs'
[35]: https://docs.github.com/en/actions/reference/limits 'Actions limits - GitHub Docs'

---

## TL;DR

### The Mental Model

> Workflows contain jobs. Jobs contain steps. Jobs run in isolation on separate runners.

- **Workflow:** Triggered by an event. Lives in `.github/workflows/`.
- **Job:** Runs on a fresh runner. Passes state to other jobs explicitly via `outputs` and `needs`.
- **Step:** Runs sequentially inside a job. Shares the filesystem with other steps in the same job.
- State flows _within_ a job via `GITHUB_ENV` and `GITHUB_OUTPUT`. State flows _between_ jobs via `needs.job_id.outputs`.

---

### Trigger Semantics

> Not all triggers are created equal.

| Trigger               | Runs on          | Has secrets? | Risk level |
| --------------------- | ---------------- | ------------ | ---------- |
| `push`                | Pushed commit    | Yes          | Low        |
| `pull_request`        | Merge commit SHA | Read-only    | Low        |
| `pull_request_target` | Base branch      | Full         | High       |
| `workflow_dispatch`   | Manual trigger   | Yes          | Low        |

- `pull_request` uses the _merge commit_, not the head commit. That's why the SHA doesn't match what you pushed.
- `pull_request_target` runs with full secrets on the _base_ branch—never checkout untrusted code here.

---

### Reuse Mechanisms

> Three levels of reuse, each with different tradeoffs.

| Mechanism             | Scope       | Secrets access | Defined in           |
| --------------------- | ----------- | -------------- | -------------------- |
| **Action**            | Single step | Caller's       | `action.yml`         |
| **Composite action**  | Multi-step  | Caller's       | `action.yml`         |
| **Reusable workflow** | Full job(s) | Caller's + own | `.github/workflows/` |

- Actions are the smallest unit—one step, one concern.
- Composite actions bundle multiple steps but can't define jobs or secrets.
- Reusable workflows can define entire job graphs with their own `permissions` blocks.

---

### Security Essentials

> The defaults are permissive. Tighten them.

- Set `permissions` to `read-all` or narrower at the workflow level. Don't rely on repo defaults.
- Pin third-party actions to full commit SHAs, not tags. Tags are mutable.
- Never run `pull_request_target` with `actions/checkout` pointed at `github.event.pull_request.head.ref`.
- Use OIDC for cloud auth instead of long-lived credential secrets.
- Treat `${{ github.event.*.title }}` and other user-controlled fields as injection vectors—always use intermediate environment variables.
