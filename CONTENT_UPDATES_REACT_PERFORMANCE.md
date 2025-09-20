## Part A — React Performance Course: Content Refactor Plan

Goal: produce a concise, comprehensive guide that avoids duplication, gives each topic a clear home, and routes related details to canonical pages. This plan inventories every file, flags duplication, proposes canonical placement, and calls out any content that should be broken out (without creating new duplication).

## ⚠️ REMINDER: Every Task Must Be Tracked

**Critical reminders before starting ANY work**:

- [ ] EVERY checkbox in this document represents a required action
- [ ] You MUST check off items `[x]` immediately upon completion
- [ ] If a task description is unclear, research and UPDATE it with explicit instructions
- [ ] Work sequentially - do not skip ahead without completing prior tasks
- [ ] The checkboxes are your PRIMARY progress tracking mechanism

### Process Checklist

- [ ] Establish canonical (primary/authoritative) pages for each topic cluster (below).
- [ ] For each file:
  - [ ] Remove/merge duplicative sections into the cluster's canonical page(s).
  - [ ] Keep unique examples, case studies, and code where they add value.
  - [ ] Break out embedded off-topic sections to their canonical home; replace with a summary + link.
  - [ ] Add cross-links between closely related topics where helpful.
- [ ] Maintain consistent terminology and avoid re-explaining the same API across multiple files unless context meaningfully differs (e.g., SSR vs client interactivity).

### Topic Clusters and Canonical Pages

**Terminology Guide**:

- **Canonical**: The primary, authoritative file for a topic (all other files link to it)
- **LCP**: Largest Contentful Paint (Core Web Vital)
- **CLS**: Cumulative Layout Shift (Core Web Vital)
- **INP**: Interaction to Next Paint (Core Web Vital replacing FID)
- **RUM**: Real User Monitoring (production performance tracking)
- **DCE**: Dead Code Elimination (removing unused code)
- **SSR**: Server-Side Rendering
- **RSC**: React Server Components
- **SW**: Service Worker

#### Content Organization by Topic

- **Loading & Delivery**: `code-splitting-and-lazy-loading` (canonical), `resource-preloading-apis`, `priority-hints-resource-loading`, `cdn-caching-immutable-assets`, `image-and-asset-optimization`, `service-worker-strategies`, `speculation-rules-bfcache`
- **Bundles & Build**: `bundle-analysis-deep-dive` (canonical), `tree-shaking-optimization`, `swc-speedy-web-compiler`
- **Monitoring, Budgets & Testing**: `performance-budgets-and-automation` (canonical for budgets/CI), `performance-budgets-and-monitoring` (merge into budgets + monitoring split), `production-performance-monitoring` (canonical for RUM/alerting), `measuring-performance-with-real-tools` (canonical for local tooling), `performance-testing-strategy`
- **Core Web Vitals & INP**: `core-web-vitals-for-react` (canonical), `inp-optimization-long-tasks`, `inp-production-monitoring` (fold into Web Vitals/Monitoring respectively)
- **React 19 + Compiler Era**: `react-19-compiler-guide` (canonical), `react-compiler-migration-guide`, `react-memo-react-19-and-compiler-era`, `usememo-usecallback-in-react-19`, `the-use-hook`, `react-cache-api`, `selective-hydration-react-19`
- Concurrency & Scheduling: `concurrent-react-scheduling` (canonical), `usetransition-and-starttransition`, `usedeferredvalue-patterns`
- Rendering & State Patterns: `colocation-of-state`, `lifting-state-intelligently`, `derived-vs-stored-state`, `separating-actions-from-state-two-contexts`, `context-api-performance-pitfalls`, `component-granularity-splitting`
- Render Stability & Memoization: `identity-stability-props`, `custom-equality-checks-areequal`, `react-memo-react-19-and-compiler-era`, `usememo-usecallback-in-react-19`, `key-stability-in-lists`, `avoiding-unnecessary-dependencies`, `avoiding-over-memoization`
- SSR & Server: `optimizing-server-side-rendering`, `streaming-ssr-optimization`, `react-server-components-rsc`
- Data & Realtime: `graphql-react-performance`, `real-time-data-performance`, `real-time-scale-strategies`
- Animation & UX: `animation-performance`, `view-transitions-api`, `gpu-acceleration-patterns`, `skeleton-screens-perceived-performance`, `windowing-and-virtualization`
- Off-main-thread & Graphics: `web-workers-with-react`, `offscreen-canvas-webgl`, `webassembly-integration`
- Memory: `memory-management-deep-dive` (canonical), `memory-leak-detection`
- Architecture: `virtual-dom-fiber-architecture`, `understanding-reconciliation-react-19`
- Diagnostics: `debugging-performance-issues` (playbook), `measuring-performance-with-real-tools` (tools)

- [ ] Confirm these clusters and file assignments are current; adjust membership if needed.

### Per-File Checklist (React Performance)

Also follow the SOP above for each action item.

- [ ] `content/courses/react-performance/_index.md`
  - [ ] Action: Update outline to reflect the clusters above; add canonical order and cross-links.

- [ ] `animation-performance.md`
  - **Duplication Found**: Overlaps with `view-transitions-api` (transition patterns) and `gpu-acceleration-patterns` (compositing tips).
  - [ ] **Action 1 - Consolidate GPU content**: Move GPU/compositor-specific sections to `gpu-acceleration-patterns.md`:
    - Identify GPU-specific sections (will-change, transform3d, compositing)
    - Copy content to GPU patterns file under "Animation Performance" heading
    - Replace with summary: "For GPU optimization details, see [gpu-acceleration-patterns.md](./gpu-acceleration-patterns.md)"
  - [ ] **Action 2 - Link to View Transitions**: Add cross-reference to `view-transitions-api.md` for route/DOM transitions
  - [ ] **Action 3 - Extract embedded content**: If file contains "view transitions" walkthrough:
    - Move complete walkthrough to `view-transitions-api.md`
    - Leave 2-3 sentence summary with link
  - [ ] **Action 4 - Verify focus**: Ensure file focuses on high-level animation patterns and performance principles

- [ ] `avoiding-over-memoization.md`
  - Duplication: Overlaps with `react-memo-react-19-and-compiler-era` and `usememo-usecallback-in-react-19`.
  - [ ] Action: Keep decision framework and anti-patterns here; strip API explanations duplicated elsewhere. Link to compiler-era memoization guidance.

- [ ] `avoiding-unnecessary-dependencies.md`
  - Duplication: Overlaps with `identity-stability-props`, `custom-equality-checks-areequal`.
  - [ ] Action: Focus on dependency arrays and stability techniques; link to identity/equality pages for deeper rationale.

- [ ] `bundle-analysis-deep-dive.md`
  - **Duplication Found**: Overlaps with `tree-shaking-optimization` (DCE techniques) and `swc-speedy-web-compiler` (minification/SWC specifics).
  - [ ] **Action 1 - Keep core content**: Retain webpack-bundle-analyzer usage, methodology, CI report diffs
  - [ ] **Action 2 - Move tree-shaking content**:
    - Identify all Dead Code Elimination (DCE) sections
    - Move to `tree-shaking-optimization.md` under "Bundle Analysis Integration" heading
    - Replace with: "For tree-shaking details, see [tree-shaking-optimization.md](./tree-shaking-optimization.md)"
  - [ ] **Action 3 - Move SWC content**:
    - Extract SWC configuration and minification specifics
    - Move to `swc-speedy-web-compiler.md`
    - Add cross-reference link
  - [ ] **Action 4 - Extract dependency patterns**: If contains "replace heavy libs" heuristics:
    - Create new section "Dependency Optimization Patterns"
    - Make it reusable and link from other relevant pages

- [ ] `cdn-caching-immutable-assets.md`
  - Duplication: Overlaps with `image-and-asset-optimization` (CDN strategies) and `service-worker-strategies` (cache freshness).
  - [ ] Action: Make this the canonical CDN caching guide (immutable fingerprints, cache-control, stale-while-revalidate); remove CDN sections from image guide; cross-link SW strategies.

- [ ] `code-splitting-and-lazy-loading.md`
  - Duplication: Minor overlap with `bundle-analysis-deep-dive` (chunking) and `resource-preloading-apis` (preload/prefetch for split chunks).
  - [ ] Action: Keep react-specific patterns (`React.lazy`, route-level splitting). Link out to preloading, analyzer, and priority hints.

- [ ] `colocation-of-state.md`
  - Duplication: Overlaps with `lifting-state-intelligently`, `derived-vs-stored-state`.
  - [ ] Action: Keep guidance on co-locating to reduce renders; cross-link to lifting/derived tradeoffs; dedupe repeated “derived vs stored” explanation.

- [ ] `component-granularity-splitting.md`
  - Duplication: Overlaps with `windowing-and-virtualization` and memoization docs when discussing render costs per component.
  - [ ] Action: Keep granularity heuristics; link to virtualization for large lists and to memoization for expensive subtrees.

- [ ] `concurrent-react-scheduling.md`
  - Duplication: Overlaps with `usetransition-and-starttransition`, `usedeferredvalue-patterns`.
  - [ ] Action: Keep scheduling overview and mental model. Move detailed API walkthroughs to the API-specific pages to avoid repetition.

- [ ] `context-api-performance-pitfalls.md`
  - Duplication: Overlaps with `separating-actions-from-state-two-contexts` and `colocation-of-state`.
  - [ ] Action: Keep pitfalls and mitigation patterns; refer to the two-contexts page for the full pattern; trim repeated context basics.

- [ ] `core-web-vitals-for-react.md`
  - **Duplication Found**: Overlaps with `inp-optimization-long-tasks` (INP strategies) and `inp-production-monitoring` (measurement).
  - [ ] **Action 1 - Establish as canonical**: Make this the primary reference for all Core Web Vitals (LCP, CLS, INP)
  - [ ] **Action 2 - Consolidate INP content**:
    - Import INP optimization strategies from `inp-optimization-long-tasks.md`
    - Create unified "INP Optimization" section
    - Update `inp-optimization-long-tasks.md` to reference this canonical guide
  - [ ] **Action 3 - Move monitoring content**:
    - Extract production measurement sections from `inp-production-monitoring.md`
    - Move to `production-performance-monitoring.md` under "Core Web Vitals Tracking"
    - Leave summary and link in original file
  - [ ] **Action 4 - Add React-specific optimizations**:
    - Include React 19 improvements for each metric
    - Add code examples for common fixes
    - Link to relevant optimization techniques

- [ ] `custom-equality-checks-areequal.md`
  - Duplication: Overlaps with `identity-stability-props`, `react-memo-react-19-and-compiler-era`.
  - [ ] Action: Keep targeted `areEqual` recipes; link to identity stability and memoization tradeoffs; remove repeated explanation of React.memo itself.

- [ ] `debugging-performance-issues.md`
  - Duplication: Overlaps with `measuring-performance-with-real-tools` (tools walkthroughs).
  - [ ] Action: Keep this as the playbook (symptoms → hypotheses → experiments); move deep tool UIs and flamegraph how‑tos to the measuring/tools page; keep short links back.

- [ ] `derived-vs-stored-state.md`
  - Duplication: Overlaps with `lifting-state-intelligently`, `colocation-of-state`.
  - [ ] Action: Keep decision tree; remove repeated state coloc/hoist rationale now present in those pages.

- [ ] `flushsync-in-react-dom.md`
  - Duplication: Minimal; may reference concurrency pages.
  - [ ] Action: Keep; add cross-links to scheduling and React 19 behavior where appropriate.

- [ ] `gpu-acceleration-patterns.md`
  - Duplication: Overlaps with `animation-performance`, `offscreen-canvas-webgl`.
  - [ ] Action: Keep compositor/GPU tips; link to OffscreenCanvas/WebGL for heavy rendering paths; remove generic animation advice (keep it in `animation-performance`).

- [ ] `graphql-react-performance.md`
  - Duplication: Minor overlap with `real-time-data-performance` (network & caching strategies).
  - [ ] Action: Keep GraphQL-specific patterns (cache policies, persisted queries, batching). Cross-link to realtime strategies for websockets/subscriptions considerations.

- [ ] `identity-stability-props.md`
  - Duplication: Overlaps with `custom-equality-checks-areequal`, `usememo-usecallback-in-react-19`.
  - [ ] Action: Keep identity principles (stable props/functions); link to memoization pages for API details; remove duplicate `useCallback/useMemo` basics.

- [ ] `image-and-asset-optimization.md`
  - Duplication: Overlaps with `cdn-caching-immutable-assets`, `resource-preloading-apis`.
  - [ ] Action: Focus on images (formats, responsive images, lazy loading). Move CDN headers/edge caching details to CDN page; point to preloading for LCP image hints.
  - [ ] Breakout: If it contains a general “asset pipeline” section (fonts, JS/CSS), move those to Loading & Delivery canonical pages.

- [ ] `inp-optimization-long-tasks.md`
  - Duplication: Overlaps with `core-web-vitals-for-react` and `web-workers-with-react` (long task mitigation).
  - [ ] Action: Keep INP-specific strategies; relocate generic long-task offloading into `web-workers-with-react`; keep a short pointer here.

- [ ] `inp-production-monitoring.md`
  - Duplication: Overlaps with `production-performance-monitoring` and `core-web-vitals-for-react`.
  - [ ] Action: Move measurement/telemetry into production monitoring; keep only INP-specific thresholds and alerts if not duplicated by Core Web Vitals page.

- [ ] `key-stability-in-lists.md`
  - Duplication: Overlaps with `identity-stability-props`.
  - [ ] Action: Keep list-key patterns; reference identity page for deeper explanation; trim generic identity content.

- [ ] `lifting-state-intelligently.md`
  - Duplication: Overlaps with `colocation-of-state`, `derived-vs-stored-state`.
  - [ ] Action: Keep nuanced guidance and examples; link to coloc/derived for principles; remove repeated rationales.

- [ ] `measuring-performance-with-real-tools.md`
  - Duplication: Overlaps with `debugging-performance-issues` and `performance-testing-strategy`.
  - [ ] Action: Make this canonical for DevTools/Profiler/Chrome Performance; remove strategy/process content (move to debugging/testing pages); add links to budgets/monitoring.

- [ ] `memory-leak-detection.md`
  - Duplication: Overlaps with `memory-management-deep-dive`.
  - [ ] Action: Keep practical detection/triage steps; move theory/GC internals to memory deep dive; cross-link both ways.

- [ ] `memory-management-deep-dive.md`
  - Duplication: Overlaps with `memory-leak-detection`.
  - [ ] Action: Keep conceptual internals + React-specific patterns; link to leak detection for workflows.

- [ ] `micro-frontend-performance.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive` (shared deps), `code-splitting-and-lazy-loading` (federation loading).
  - [ ] Action: Keep MF-specific constraints; link to bundle analysis and splitting for shared vendor handling.

- [ ] `offscreen-canvas-webgl.md`
  - Duplication: Overlaps with `web-workers-with-react`, `gpu-acceleration-patterns`.
  - [ ] Action: Keep graphics specifics; move generic “use a worker for heavy work” to `web-workers-with-react`; link back for rendering pipelines.

- [ ] `optimizing-server-side-rendering.md`
  - Duplication: Overlaps with `streaming-ssr-optimization` and `react-server-components-rsc` (data flow & hydration strategies).
  - [ ] Action: Make this the SSR overview; ensure streaming is summarized here and detailed in streaming page; RSC has its own page with SSR integration links.

- [ ] `performance-budgets-and-automation.md`
  - Duplication: Overlaps with `performance-budgets-and-monitoring`, `performance-testing-strategy`.
  - [ ] Action: Keep budgets definition, setting baselines, CI enforcement. Remove monitoring sections (move to monitoring). Link to testing for automated perf tests.

- [ ] `performance-budgets-and-monitoring.md`
  - Duplication: Significant overlap with budgets & production monitoring.
  - [ ] Action: Split its content across `performance-budgets-and-automation` (budgets/CI) and `production-performance-monitoring` (RUM/alerting). Leave a concise overview with links, or redirect/merge.

- [ ] `performance-testing-strategy.md`
  - Duplication: Overlaps with budgets automation and measuring tools.
  - [ ] Action: Keep the pyramid, tactics, and thresholds; link to tools page for implementation details; cross-link to budgets for pass/fail criteria in CI.

- [ ] `priority-hints-resource-loading.md`
  - Duplication: Overlaps with `resource-preloading-apis`.
  - [ ] Action: Either merge into a single “Resource Loading APIs” page (preferred) or ensure this page only covers priority hints with examples; link to preloading for rel=preload/prefetch.

- [ ] `production-performance-monitoring.md`
  - Duplication: Overlaps with `performance-budgets-and-monitoring`, `core-web-vitals-for-react`, `inp-production-monitoring`.
  - [ ] Action: Canonical for RUM, CWV in prod, alerting/SLIs/SLOs; consolidate monitoring content here; remove budget-setting content (link to budgets).

- [ ] `react-19-compiler-guide.md`
  - Duplication: Overlaps with `react-compiler-migration-guide`, `react-memo-react-19-and-compiler-era`.
  - [ ] Action: Keep conceptual guide for compiler behavior; link to migration guide for step-by-step changes; remove repeated “memoization patterns” in favor of memoization pages.

- [ ] `react-cache-api.md`
  - Duplication: Overlaps with `the-use-hook`, `react-server-components-rsc` for data fetching.
  - [ ] Action: Keep `cache()` API specifics; cross-link to `the-use-hook` and RSC for usage contexts; avoid re-explaining `use()`.

- [ ] `react-compiler-migration-guide.md`
  - Duplication: Overlaps with `react-19-compiler-guide`.
  - [ ] Action: Keep hands-on migration steps; remove long conceptual sections (link to the conceptual guide). Ensure no repeated `React.memo`/`useMemo` guidance present elsewhere.

- [ ] `react-memo-react-19-and-compiler-era.md`
  - Duplication: Overlaps with `usememo-usecallback-in-react-19`, `custom-equality-checks-areequal`.
  - [ ] Action: Consider consolidating with `usememo-usecallback-in-react-19` into a single “Memoization in the Compiler Era” page; otherwise, de-duplicate API basics and link between the two.

- [ ] `react-server-components-rsc.md`
  - Duplication: Overlaps with SSR pages for streaming/hydration concerns.
  - [ ] Action: Keep RSC fundamentals and perf considerations; link to SSR pages for integration patterns; avoid duplicating streaming mechanics.

- [ ] `README.md`
  - [ ] Action: After refactor, update to point to canonical pages and learning path.

- [ ] `real-time-data-performance.md`
  - Duplication: Overlaps with `real-time-scale-strategies` and `graphql-react-performance`.
  - [ ] Action: Keep client patterns (backpressure, batching, scheduling updates); link to scale strategies for infra scaling; link to GraphQL for subscriptions.

- [ ] `real-time-scale-strategies.md`
  - Duplication: Overlaps with `real-time-data-performance`.
  - [ ] Action: Keep infra & architecture scaling patterns; remove client-side scheduling content (link to the real-time client page).

- [ ] `resource-preloading-apis.md`
  - Duplication: Overlaps with `priority-hints-resource-loading`, and LCP image hints in `image-and-asset-optimization`.
  - [ ] Action: Canonicalize prefetch/preload/fetchpriority usage; remove LCP image details duplicated by image page; cross-link priority hints.

- [ ] `selective-hydration-react-19.md`
  - Duplication: Overlaps with `streaming-ssr-optimization`.
  - [ ] Action: Keep selective hydration details; link to streaming SSR for end-to-end flows; avoid re-explaining streaming.

- [ ] `separating-actions-from-state-two-contexts.md`
  - Duplication: Overlaps with `context-api-performance-pitfalls`.
  - [ ] Action: Keep as the canonical “two contexts” pattern; trim repeated general context pitfalls (link out).

- [ ] `service-worker-strategies.md`
  - Duplication: Overlaps with `cdn-caching-immutable-assets` and `speculation-rules-bfcache`.
  - [ ] Action: Focus on SW caching strategies and offline; reference CDN for edge caching and speculation/bfcache for navigation perf.

- [ ] `skeleton-screens-perceived-performance.md`
  - Duplication: Minimal; may overlap with `view-transitions-api`.
  - [ ] Action: Keep; add links to transitions and LCP tuning.

- [ ] `speculation-rules-bfcache.md`
  - Duplication: Overlaps with `service-worker-strategies` and `resource-preloading-apis`.
  - [ ] Action: Keep navigation prefetch/bfcache details; link to SW and preloading pages; remove general prefetch explanations duplicated there.

- [ ] `streaming-ssr-optimization.md`
  - Duplication: Overlaps with `optimizing-server-side-rendering` and `selective-hydration-react-19`.
  - [ ] Action: Keep deep streaming techniques; trim generic SSR setup (link to SSR overview); reference selective hydration instead of repeating it.

- [ ] `suspense-for-data-fetching.md`
  - Duplication: Overlaps with `the-use-hook`, `react-cache-api`, and RSC.
  - [ ] Action: Keep Suspense mechanics; link to `use()` and `cache()` for modern data APIs; avoid duplicating those API specifics.

- [ ] `swc-speedy-web-compiler.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive`.
  - [ ] Action: Keep SWC config/perf tips; remove analyzer content (link to bundle analysis); ensure tree-shaking specifics are on the tree-shaking page.

- [ ] `the-use-hook.md`
  - Duplication: Overlaps with `suspense-for-data-fetching`, `react-cache-api`.
  - [ ] Action: Keep `use()` API details and pitfalls; link to Suspense and cache pages; avoid re-describing Suspense fundamentals.

- [ ] `tree-shaking-optimization.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive`, `swc-speedy-web-compiler`.
  - [ ] Action: Keep DCE/tree-shaking techniques; link to analyzer and SWC for tooling; remove repeated bundle inspection.

- [ ] `understanding-reconciliation-react-19.md`
  - Duplication: Overlaps with `virtual-dom-fiber-architecture`.
  - [ ] Action: Keep React 19 updates to reconciliation; remove historical/architecture overviews duplicated by the VDOM/Fiber page.

- [ ] `useactionstate-performance.md`
  - Duplication: Minimal; link to concurrency where relevant.
  - [ ] Action: Keep performance notes; ensure no overlap with memoization pages.

- [ ] `usedeferredvalue-patterns.md`
  - Duplication: Overlaps with `concurrent-react-scheduling`, `usetransition-and-starttransition`.
  - [ ] Action: Keep focused patterns/examples; remove scheduling overview duplicated by the concurrency overview.

- [ ] `uselayouteffect-performance.md`
  - Duplication: Minimal; may overlap with animation and scheduling.
  - [ ] Action: Keep perf characteristics; add links to animation/concurrency where appropriate.

- [ ] `usememo-usecallback-in-react-19.md`
  - Duplication: Overlaps with `react-memo-react-19-and-compiler-era`, `identity-stability-props`.
  - [ ] Action: Consider merging with the React.memo compiler-era page; otherwise, focus on API usage changes in 19; remove general memoization philosophy duplicated elsewhere.

- [ ] `usetransition-and-starttransition.md`
  - Duplication: Overlaps with `concurrent-react-scheduling`, `usedeferredvalue-patterns`.
  - [ ] Action: Keep API-level guidance; remove scheduling theory duplicated by concurrency overview; link to deferred value page for comparisons.

- [ ] `view-transitions-api.md`
  - Duplication: Overlaps with `animation-performance`.
  - [ ] Action: Keep VTA specifics; remove general animation tips duplicated by the animation page; link both ways.

- [ ] `virtual-dom-fiber-architecture.md`
  - Duplication: Overlaps with `understanding-reconciliation-react-19`.
  - [ ] Action: Keep deep architecture/historical view; minimize React 19-specific reconciliation details (link to reconciliation page).

- [ ] `web-workers-with-react.md`
  - Duplication: Overlaps with `offscreen-canvas-webgl`, `inp-optimization-long-tasks`.
  - [ ] Action: Make this canonical for off-main-thread patterns; move generic “offload long tasks to workers” content here; other pages link back.

- [ ] `webassembly-integration.md`
  - Duplication: Minor overlap with workers/off-main-thread.
  - [ ] Action: Keep WASM integration guidance; link to workers for threading patterns and to long tasks/INP where relevant.

- [ ] `windowing-and-virtualization.md`
  - Duplication: Overlaps with `component-granularity-splitting`.
  - Action: Keep virtualization techniques; remove component-granularity advice duplicated elsewhere; link to granularity page for trade-offs.

### Breakout Candidates Checklist (React Performance)

- [ ] Move Image CDN strategy details currently in `image-and-asset-optimization` → `cdn-caching-immutable-assets`.
- [ ] Move preload/prefetch and fetchpriority details embedded in `image-and-asset-optimization` → `resource-preloading-apis`; keep an LCP-focused summary and link.
- [ ] Move tree-shaking/SWC specifics embedded in `bundle-analysis-deep-dive` → `tree-shaking-optimization` and `swc-speedy-web-compiler`.
- [ ] Consolidate INP production telemetry embedded in `core-web-vitals-for-react` or `inp-optimization-long-tasks` → `production-performance-monitoring`.
- [ ] Consolidate long-task offloading patterns repeated across INP/animation/graphics → `web-workers-with-react`.
- [ ] Keep streaming SSR details only in `streaming-ssr-optimization`; summarize elsewhere.

### Implementation Guidelines Checklist (React Performance)

- [ ] Prefer consolidation over proliferation: avoid creating new standalone pages unless a topic is clearly broad and not already covered.
- [ ] When moving content:
  - [ ] Replace with a concise summary + "See: …" link to the canonical page.
  - [ ] Preserve URLs where possible; if merging, add redirects in the site config.
- [ ] Keep examples DRY: if a code sample is valuable across pages, house it once and link; don't duplicate.
- [ ] After edits, validate cross-links and update `README.md` and `_index.md` to reflect the canonical learning path.

### Success Metrics Checklist (React Performance)

- [ ] Reduce total file count by ~30% (from 66 to ~45)
- [ ] No topic covered in more than 2 places (main guide + practical examples only)
- [ ] Clear progression path through content with no circular dependencies
- [ ] All examples tested and working
- [ ] Consistent terminology throughout
- [ ] Average file size: 500-800 lines (no file >1000 lines unless absolutely necessary)
- [ ] Each file has single, clear focus
- [ ] Every file includes "Related Topics" section for cross-references

### Cross-Reference Requirements Checklist

Each file should include:

- [ ] **Prerequisites**: What knowledge is assumed
- [ ] **Related Topics**: Links to related files
- [ ] **Next Steps**: Where to go after this topic
- [ ] **Practical Examples**: When to use these patterns

### Implementation Phases (Recommended Timeline)

#### Phase 1: High-Impact Consolidations (Week 1)

- [ ] Backup all current files
- [ ] Consolidate memoization content (4 files → 2 files)
- [ ] Merge state management files (4 files → 1-2 files)
- [ ] Test all code examples still work

#### Phase 2: Medium-Priority Merges (Week 2)

- [ ] Consolidate monitoring/debugging content (5 files → 3 files)
- [ ] Merge React 19 content (scattered → 2-3 canonical files)
- [ ] Review SSR file overlap (4 files → 2-3 files)
- [ ] Update cross-references

#### Phase 3: Extraction & Reorganization (Week 3)

- [ ] Extract topics into separate files where needed
- [ ] Create new quick-reference guides (performance-quick-wins, anti-patterns, decision-tree)
- [ ] Remove redundant files (<500 words merged into sections)
- [ ] Update navigation/index

#### Phase 4: Polish & Validation (Week 4)

- [ ] Ensure consistent tone/style
- [ ] Validate all examples
- [ ] Add missing cross-links
- [ ] Create learning path guide

### Implementation Review Process

After each phase:

- [ ] **Content Review**: Ensure no valuable content was lost
- [ ] **Link Check**: Verify all cross-references work
- [ ] **Code Test**: Run all code examples
- [ ] **Size Check**: Confirm files are appropriately sized
- [ ] **Duplication Check**: Search for remaining duplicate content

---
