---
title: Deployment and Release Patterns
description: >-
  Deploying code and releasing features are two different decisions—here is how
  immutable assets, CDN caching, feature flags, canary rollouts, and preview
  environments let you separate them without losing sleep.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

If you've ever worked on a team where "deploying" and "releasing" mean the same thing, you've felt the tension. Deploying means pushing code to production infrastructure. Releasing means letting users see it. When those two actions are fused into one, every deploy is a public event, every rollback is an emergency, and nobody ships on Fridays because Fridays are for the brave or the reckless.

The whole point of modern delivery architecture is to pull those apart. You should be able to deploy code that's invisible to users, release features to 1% of traffic before anyone else sees them, roll back a bad release without touching the deployment pipeline, and give every pull request its own live environment for review. None of that is exotic anymore. It's table stakes for teams that ship fast without gambling on stability.

This lecture covers the deployment, release, and environment patterns that make that possible. For the CI pipeline mechanics, see the [GitHub Actions lecture](github-actions.md). For monorepo orchestration and caching, see the [Turborepo lecture](turborepo.md). For versioning, see [versioning and release management](versioning-and-release-management.md).

## Immutable Deployments and Content Hashing

The foundation of reliable frontend deployment is **immutable infrastructure** for static assets. Modern build tools generate content-hashed filenames—`app.a1b2c3.js`, `styles.d4e5f6.css`—where the hash changes when the source changes. That unique fingerprint makes every build artifact immutable. If the content changes, the URL changes. If the URL is the same, the content is guaranteed identical.

This one property unlocks three things that matter:

**Coexistence.** Hashed assets can be uploaded to a CDN without overwriting previous versions. Multiple releases can live side by side on the same origin. A deployment is just adding new files, not replacing old ones.

**Aggressive caching.** Hashed assets can be served with `Cache-Control: public, max-age=31536000, immutable`. The `immutable` directive tells browsers and CDN edges never to revalidate—since the URL changes when the content changes, the old URL is correct forever. This is the single most impactful caching header for frontend assets.

**Atomic rollouts.** A "deployment" reduces to two steps: upload the new hashed assets to the CDN, then update the `index.html` to reference the new entry points. The HTML file is the only mutable resource. Everything it points to is immutable. Rolling back means pointing the HTML at the previous set of hashes.

```text
deploy v1:
  /assets/app.abc123.js    ← immutable, cached forever
  /assets/styles.def456.css ← immutable, cached forever
  /index.html               ← references abc123 + def456

deploy v2:
  /assets/app.789xyz.js    ← new file, new hash
  /assets/styles.def456.css ← unchanged, same hash, already cached
  /index.html               ← updated to reference 789xyz + def456
```

The user's browser already has `styles.def456.css` cached from v1. It only downloads the new JavaScript bundle. The old JavaScript bundle stays on the CDN in case anyone has a tab open from before the deploy.

## CDN Caching and the Edge Cases That Bite

Content-hashed assets with immutable cache headers are the easy part. The hard part is the HTML.

### The Stale HTML Problem

If `index.html` is cached at the CDN edge with a long TTL, it can keep pointing to old JavaScript bundles after a deploy. Worse, if you _also_ aggressively clean up old assets from the origin, the cached HTML points to files that no longer exist. The user gets a white page.

The solution is to treat `index.html` as the single mutable entry point with a short or zero cache TTL. Hashed assets get `max-age=31536000, immutable`. The HTML gets `no-cache` or a very short `max-age` with `must-revalidate`, so CDN edges always check with the origin for freshness. That asymmetry is the whole model—long-lived cache for immutable assets, short-lived cache for the pointer that references them.

When you deploy, invalidate the HTML path immediately. Most CDN providers support targeted cache invalidation:

- **Single URL purge.** Invalidate just `/index.html` or `/` on deploy. Fast, surgical, and sufficient for most applications.
- **Cache tags (surrogate keys).** Tag all assets associated with a release. A single API call purges everything with that tag. Useful when a deploy touches multiple HTML pages or API responses.
- **Stale-while-revalidate.** The `stale-while-revalidate` directive tells the CDN to serve the cached version immediately and fetch a fresh copy in the background. Users see the previous version briefly, and the next request gets the update. This is a good default for non-critical pages where a few seconds of staleness is acceptable.

### Cache Stampedes

When a popular cached resource expires or gets invalidated, thousands of concurrent users can hit the origin simultaneously. This is a **cache stampede**, and it can take down your origin server during a deploy.

Two CDN-level mitigations:

- **Request collapsing.** The CDN holds duplicate requests for the same resource while the first one fetches from the origin. Only one request actually hits the origin; the rest wait for that result. [Vercel's CDN][1] uses this approach, and most major CDN providers support it.
- **Origin shielding.** An additional cache layer sits between edge locations and the origin. All edge misses route through the shield first, which collapses requests before they reach your backend. This is especially useful for globally distributed CDNs where dozens of edge locations could each independently cache-miss at the same time.

## Release Strategies

With immutable deployments in place, you can deploy code to production infrastructure without users seeing it. The release is a separate decision—controlled by routing, feature flags, or traffic splitting—about _who_ sees the new version and _when_.

### Blue/Green

Run two identical production environments. Deploy the new version to the "green" environment while "blue" continues serving traffic. Validate green, then switch the router (DNS, load balancer, or CDN configuration) to point at green. If something breaks, switch back to blue. Zero downtime, instant rollback.

The tradeoff is cost—you maintain two full production environments—and complexity around stateful resources like databases, which can't simply be swapped. For stateless frontend assets served from a CDN, blue/green is natural because both versions already coexist on the same CDN, and the "switch" is just updating which HTML file the CDN serves at the root URL.

### Canary

Instead of switching all traffic at once, route a small percentage—1%, 5%, 10%—to the new version. Monitor error rates, latency, and business metrics for the canary group. If the numbers look healthy, gradually expand to 100%. If something goes wrong, route the canary traffic back to the stable version.

Canary deployments are the operational sweet spot for most teams. They reduce the blast radius of a bad release to a small user population, and they give you real production data about the new version before it reaches everyone. The [GitHub Actions lecture](github-actions.md) covers the CI mechanics; the canary logic typically lives in the CDN or load balancer configuration, or in a deployment platform like Vercel, Cloudflare Pages, or AWS CloudFront with Lambda@Edge.

Uber takes this further with tiered rollouts. Changes deploy first to less-critical services (Tier 5), soak there to verify stability, and only then propagate to mission-critical services (Tier 0). Their [engineering blog][2] describes an asynchronous state machine that manages rollout ordering—if a change triggers alerts in the early tiers, all downstream rollouts for that commit are automatically halted.

### A/B Testing at the Deployment Layer

A/B tests split traffic between two variants to measure business impact—conversion rates, engagement, revenue. Unlike canary deploys, which focus on _safety_ (does the new version break anything?), A/B tests focus on _experimentation_ (does the new version improve something?).

At the infrastructure level, A/B tests and canary deploys look similar—both involve traffic splitting. The difference is intent and measurement. Canary deploys compare error rates and latency. A/B tests compare business metrics. Feature flag platforms like LaunchDarkly and Statsig handle both cases, which is why the line between them often blurs in practice.

## Feature Flags

Feature flags are the mechanism that makes trunk-based development viable at scale. With flags, incomplete code can be merged to main, deployed to production, and remain invisible to users until someone flips a switch. No long-lived feature branches. No merge conflicts that require an archaeology degree to resolve. No "big bang" releases where three months of work ship at once and nobody knows which change broke what.

### How They Decouple Deployment from Release

The pattern is straightforward. Wrap the new code path in a conditional:

```tsx
function Dashboard() {
  const showNewChart = useFeatureFlag('new-analytics-chart');

  return (
    <div>
      <Header />
      {showNewChart ? <NewAnalyticsChart /> : <LegacyChart />}
      <Footer />
    </div>
  );
}
```

The code for `NewAnalyticsChart` ships to production with every deploy. It's in the bundle. It's on the CDN. But, nobody sees it until the flag is enabled. You can enable it for internal users first (a "dark launch"), then for 5% of users, then 50%, then 100%. If something goes wrong, disable the flag. The "rollback" is instant and requires no deployment.

### Flag Lifecycle and the Problem of Flag Debt

Feature flags are easy to create and easy to forget. A flag that was supposed to be temporary becomes permanent. The code behind it becomes the only code path anyone uses, but the conditional and the old path stay in the codebase forever. This is **flag debt**, and it accumulates the same way technical debt does—quietly, until someone asks why there are 400 feature flags in the system and nobody knows which ones are still active.

The discipline that actually works:

- **Ownership.** Every flag has an owner—a person, not a team. Someone is responsible for cleaning it up.
- **Expiration dates.** Set a "kill date" when the flag is created. After that date, the monitoring system or CI pipeline alerts that the flag should be removed. Some teams enforce this with lint rules that flag stale toggles.
- **Governance for production changes.** In enterprise environments, modifying a flag in production should require approval (the "four-eyes principle") and produce an audit log. This isn't bureaucracy—it's the same rigor you'd apply to any production configuration change.

### Choosing a Flag Platform

| Platform     | Core strength                           | Delivery model                  | Self-hostable |
| ------------ | --------------------------------------- | ------------------------------- | ------------- |
| LaunchDarkly | Release governance, enterprise controls | Streaming (sub-200ms updates)   | No            |
| Statsig      | Unified experimentation and flags       | Cloud-hosted                    | No            |
| Unleash      | Privacy, self-hosting, open source      | Polling (configurable interval) | Yes           |
| Flagsmith    | Open-source alternative to LaunchDarkly | Cloud or self-hosted            | Yes           |
| Custom       | Zero external dependency                | Whatever you build              | By definition |

The architectural choice that matters most is **streaming versus polling**. Streaming platforms push flag updates to connected clients in near real-time. Polling clients check for updates on an interval—every 15 seconds, every 60 seconds. During a flag change, polling creates a window where different users see different versions of a feature, which is either a minor inconvenience or a data-integrity problem depending on what the flag controls.

For high-traffic applications where flag consistency matters (feature rollouts, kill switches, experiment assignments), streaming is the safer default. For internal tools or lower-traffic applications, polling with a short interval is usually fine.

The cost model also matters at scale. Flag platforms are typically priced by seat count and evaluation volume. At enterprise scale with millions of daily active users, evaluation volume dominates. Client-side caching (evaluate flags once per session, not per render) and server-side evaluation (reduce client-side payload and evaluation count) are the standard mitigations.

## Preview Environments

A shared staging server is a bottleneck. When three teams are trying to test three different features on the same staging instance, nobody's testing anything cleanly. **Preview environments** solve this by spinning up an isolated, temporary instance of the application for every pull request.

### How They Work

The basic flow:

- A pull request is opened or updated.
- The CI pipeline builds the application from the PR branch.
- A new environment is provisioned with its own URL—something like `pr-123.preview.example.com`.
- Stakeholders review the live change without needing a local dev setup.
- When the PR is merged or closed, the environment is automatically destroyed.

For frontend applications deployed to platforms like Vercel, Netlify, or Cloudflare Pages, preview environments are essentially free—the platform builds each PR branch and gives it a unique URL, and idle environments consume no compute. For more complex architectures involving backend services or databases, preview environments are usually built on Kubernetes with GitOps tooling like ArgoCD, where each PR gets its own namespace.

### Managing the Cost

The cost of preview environments scales linearly with the number of open pull requests. For a team with 50 active PRs, that's 50 environments consuming compute and networking resources. Mitigations:

- **Serverless targets.** Platforms like Vercel and Cloudflare Pages charge nothing for idle preview deployments. If your architecture supports them, preview costs approach zero.
- **Hybrid dependencies.** Instead of replicating the entire backend per PR, connect the preview frontend to a shared staging backend. Only isolate the specific service or database being changed.
- **Auto-teardown.** Destroy environments automatically when the PR is merged, closed, or inactive for more than 48 hours. Stale preview environments are the most common source of unnecessary cost.
- **Build only what changed.** In monorepos, build only the affected packages plus the shell, not every remote and every service. The [Turborepo lecture](turborepo.md) covers affected-target detection for exactly this scenario.

For [microfrontend architectures](module-federation.md), a composed preview requires orchestrating the modified remote alongside the shell and any other remotes it interacts with. The simplest approach is to build the changed remote from the PR branch and compose it with the latest stable versions of everything else.

## Environment Management

The staging environment is supposed to answer the question "will this work in production?" If staging doesn't actually resemble production, it's answering a different question—"will this work in a slightly fictional environment that used to resemble production three months ago?"

### Staging-Production Parity

**Environment drift** is the silent killer of release confidence. Staging drifts from production through a hundred small decisions: someone patches a dependency on staging but not prod, a configuration value gets hardcoded during debugging, a database migration runs in a different order, an infrastructure upgrade ships to prod but not staging.

The mitigations are boring but effective:

- **Infrastructure as Code.** Use Terraform, Pulumi, or similar tools to define infrastructure declaratively. The staging and production definitions should differ only in scale and in secrets, not in topology or service versions.
- **Automated configuration sync.** Periodically sync non-secret configuration from production to staging. This catches drift before it catches you.
- **Anonymized data.** Staging should use data that resembles production in volume and complexity, but with personally identifiable information scrubbed or replaced with synthetic data. Testing against an empty database tells you nothing about performance under load. Testing against real PII tells regulators something about your judgment.
- **Environment-specific feature flags.** Maintain separate flag configurations per environment. A feature might be 100% enabled in development, 50% in staging for QA, and 0% in production until the team is ready. The flag platform becomes the translation layer between "this code exists" and "this feature is visible."

### Reliability Rituals

The teams that trust their staging environment treat it like infrastructure, not a suggestion.

- **Regular refreshes.** Automate the sync of configurations and anonymized data from production. Weekly is a reasonable cadence. Monthly is when drift starts to matter.
- **Practiced rollbacks.** Test the rollback procedure in staging during every release cycle. If you've never practiced a rollback, you don't have a rollback procedure—you have a theory.
- **Load testing.** Run production-level traffic volumes against staging before major releases. The performance characteristics of an empty staging environment tell you nothing about how the application will behave under real load.

## Microfrontend Deployment Coordination

Microfrontends introduce a deployment coordination problem that monoliths don't have. Each remote is deployed independently, but the composed application only works when the shell and all its remotes are compatible. The [Module Federation lecture](module-federation.md) covers the runtime composition model. This section covers the deployment patterns that keep independently deployed remotes from breaking the assembled page.

### Versioned Manifests

The shell fetches a manifest at runtime that maps remote names to their current entry-point URLs. Deploying a new version of a remote means updating its URL in the manifest. Rolling back means pointing the manifest at the previous URL. No code change to the shell, no redeploy of the remote—just a metadata update.

This is the simplest and most reliable coordination mechanism. The manifest is the single source of truth for "which version of each remote is currently live," and it's small enough to cache with a short TTL so updates propagate quickly.

### Defensive Loading

The shell should assume that any remote can fail to load at any time. A CDN outage, a botched deploy, a DNS hiccup—the remote's entry point becomes unreachable, and the shell needs to handle it gracefully instead of showing a white page.

The [error boundaries and Module Federation lecture](error-boundaries-and-federation.md) covers the failure timeline in detail. The short version: wrap remote imports in error handling so a dead remote costs one empty panel, not a dead application. Use Module Federation's `errorLoadRemote` hook for loader-level fallbacks, and React error boundaries for render-level recovery.

### Per-Remote Performance Budgets

In a federated architecture, each team owns its remote's bundle size. Without coordination, one team's heavy remote becomes a performance liability for the entire platform. American Express reportedly enforced a strict budget of roughly 250 KB per microfrontend, using externals and dynamic imports to stay within it.

The [performance budgets lecture](performance-budgets.md) covers the mechanics of setting and enforcing budgets in CI. The organizational pattern is the same: define a per-remote weight budget, enforce it in the remote's CI pipeline, and make the numbers visible to the platform team.

## Case Studies

### Uber

With over 1,000 commits per day across multiple language-specific monorepos and 3,000 engineers, Uber's deployment challenge is _blast radius control_. A single commit to a core library can affect thousands of microservices. Their [engineering blog][2] describes a tiered rollout system where services are grouped from Tier 0 (mission-critical) to Tier 5 (less critical). Changes deploy to Tier 5 first and soak there. Only after health signals remain positive does the orchestrator unblock the next tier. If a change triggers failures above a threshold in the early cohorts, all downstream deployments for that commit halt automatically.

Uber also uses SubmitQueue to manage merge ordering in their monorepo—batch-testing changes before they land on main to prevent the "broken trunk" problem that high-velocity monorepos are prone to.

### Airbnb

Airbnb migrated from a monolithic deployment tool to [Spinnaker][3] as they moved to a service-oriented architecture with over 1,000 services. Their "OneTouch" framework lets engineers manage application code and infrastructure configuration in a single commit within the same directory. Spinnaker provides templated pipelines with automated canary analysis out of the box, so new services get performance regression detection for free.

The interesting part of Airbnb's story is the migration itself. To move the last 15% of legacy services off the old tool, they added friction to the old path (banners, warnings, deprecation notices) and used an internal "Refactorator" tool to send automated pull requests that migrated service pipelines to the new standard. The combination of making the old way annoying and making the new way automatic is a pattern worth stealing.

### Meta

Meta uses trunk-based development with a massive monorepo. Their [engineering blog][4] describes a push hierarchy: code lands in main, gets deployed to Meta employees first, and only propagates to the global user base once health signals remain positive. Their build system (Buck) runs thousands of concurrent tests, including static analysis with Infer for memory leaks and resource issues, before code ever reaches main.

The key insight from Meta's system is that the regular push cycle is fast enough that "hotfixes" are just regular releases. There's no special emergency process because the normal process is already fast enough to deliver fixes. That's the end state of continuous delivery—when the pipeline is fast and safe enough that the emergency path and the normal path are the same thing.

## Pipeline Economics

Build and deployment pipelines are one of the larger variable infrastructure costs for frontend teams. Understanding the cost drivers lets you make informed tradeoffs.

**CI compute** is the dominant cost. In a monorepo with 200 packages, a "build everything" pipeline might consume 60 minutes of compute per pull request. With affected-target detection and remote caching, that drops to 5–10 minutes—a 6–12x reduction in spend. For teams running 500+ pull requests per week, the savings are substantial. The [Turborepo lecture](turborepo.md) covers affected-target detection and remote caching in detail.

**Feature flag platforms** are priced by seats and evaluation volume. At enterprise scale, evaluation volume dominates. Client-side caching and server-side evaluation are the standard mitigations. Self-hosted alternatives like Unleash and Flagsmith trade platform costs for operational overhead.

**Preview environments** scale linearly with open pull requests. Serverless targets (Vercel, Cloudflare Pages) where idle environments cost nothing are the most cost-effective approach for frontend-only previews. For full-stack previews, auto-teardown and hybrid dependencies (shared staging backend, isolated frontend) keep the cost manageable.

The meta-pattern is that _speed optimizations_ and _cost optimizations_ are usually the same thing. Faster builds mean less compute time. Smarter caching means fewer redundant builds. Affected-target detection means less wasted work. The pipeline that's cheapest to run is almost always the one that's also fastest for developers, which is one of those rare cases where the interests of the finance team and the engineering team point in the same direction.

## The Short Version

Deploy code often. Release features deliberately. Use content-hashed immutable assets with aggressive caching and short-lived HTML. Control releases through feature flags, canary rollouts, or traffic splitting—not through deployment timing. Give every pull request a preview environment. Keep staging honest through infrastructure as code and automated configuration sync. Treat pipeline cost like any other infrastructure cost—measure it, optimize the big levers, and stop pretending "we'll fix CI later" is a plan.

The organizations that ship fast and break little aren't the ones with the most sophisticated tooling. They're the ones that separated the decision to deploy from the decision to release, and built the infrastructure to make both decisions cheap, reversible, and observable.

[1]: https://vercel.com/blog/cdn-request-collapsing 'Preventing the stampede: Request collapsing in the Vercel CDN'
[2]: https://www.uber.com/blog/controlling-the-rollout-of-large-scale-monorepo-changes/ 'Controlling the Rollout of Large-Scale Monorepo Changes | Uber Blog'
[3]: https://airbnb.tech/infrastructure/continuous-delivery-at-airbnb/ 'Continuous Delivery at Airbnb'
[4]: https://engineering.fb.com/2017/08/31/web/rapid-release-at-massive-scale/ 'Rapid release at massive scale | Engineering at Meta'

---

## Slides

### Slide: Separate Deployment from Release

> Deployment is putting code on servers. Release is exposing it to users.

- **Immutable deployments** — every build produces a unique, content-hashed bundle. Never overwrite a deployed artifact.
- **Feature flags** decouple when code ships from when users see it.
- **Deploy daily. Release when ready.**

```
Deploy v2.3.1 → 0% of users see it (feature flag off)
                → QA verifies in production
                → 5% canary rollout
                → 50% rollout
                → 100% general availability
```

---

### Slide: Release Strategies

> Graduated exposure to limit blast radius.

| Strategy          | How it works                      | Best for                       |
| ----------------- | --------------------------------- | ------------------------------ |
| **Blue/Green**    | Two environments, swap traffic    | Zero-downtime deploys          |
| **Canary**        | Route % of traffic to new version | Risk-sensitive changes         |
| **Feature flags** | Toggle features per user/segment  | Decoupling deploy from release |
| **A/B testing**   | Route by experiment cohort        | Measuring impact               |

**Microfrontend-specific:**

- Each remote can deploy independently — but coordinate shared dependency upgrades.
- Version manifest: a JSON file listing which version of each remote is "live."
- Rollback = point the manifest back to the previous version.

---

### Slide: Preview Environments

> Every PR gets its own deployed environment.

- Spin up ephemeral environments per pull request.
- Run E2E tests against the actual deployed artifact, not just the CI build.
- Kill the environment on merge.

**Benefits:**

- Designers and PMs review real deployments, not screenshots.
- Integration issues surface before merge.
- Reduces "works on my machine" to near-zero.

**Tools:** Vercel preview deploys, Netlify deploy previews, custom Kubernetes namespaces per PR.
