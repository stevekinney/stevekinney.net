# Content Refactor Master Plan (React Performance + React TypeScript)

## ⚠️ CRITICAL: Mandatory Checklist Instructions

**THIS IS A LIVING DOCUMENT - YOU MUST CHECK OFF ITEMS AS YOU COMPLETE THEM**

- [ ] **MANDATORY**: Every single action item in this document has a checkbox. You MUST check off each box `[x]` as you complete the task.
- [ ] **SEQUENTIAL**: Work through items in order. DO NOT skip ahead without completing preceding tasks.
- [ ] **TRACKING**: Change `- [ ]` to `- [x]` IMMEDIATELY upon task completion. These checkboxes are your source of truth.
- [ ] **CLARITY**: If ANY task is unclear, research the necessary details and update the task description with explicit instructions.
- [ ] **VERIFICATION**: After each phase, verify ALL checkboxes in that phase are checked before proceeding.

This document consolidates and preserves the complete refactor plans from:

- React Performance: previously in `_CONTENT_UPDATES_REACT_PERFORMANCE.md` (root)
- React TypeScript: `content/courses/react-typescript/_CONTENT_UPDATES_REACT_TYPESCRIPT.md`

Purpose: provide a single, comprehensive plan to guide de-duplication, consolidation, and restructuring across both courses without losing any detail. The original TypeScript plan remains in place; this file is now the up-to-date master.

## Progress Tracking Summary

**Total Items: 94 checkboxes (React Performance) + 52 checkboxes (React TypeScript) = 146 total checkboxes**

- [x] **React Performance Complete** (94 items) - Completed 2025-09-20
- [ ] **React TypeScript Complete** (52 items)
- [ ] **All Success Metrics Met**
- [ ] **Final Review Complete**

## How To Use This Plan

- [ ] Treat this document as a living, actionable checklist. You MUST check off each box as you complete it.
- [ ] Check off each box by changing `- [ ]` to `- [x]`. Do not skip ahead without ticking preceding steps.
- [ ] If a step requires multiple PRs, add a short sub-checklist or PR links next to the item for traceability.
- [ ] When in doubt, prefer consolidating into canonical pages and link back rather than duplicating.
- [ ] Any bullet without a checkbox is informational context only (not a step).

## Standard Operating Procedure (SOP) for All Content Edits

**MANDATORY**: Apply this SOP to EVERY merge, split, consolidation, or de-duplication task. This ensures "how to complete it" is always explicit.

### Pre-Edit Checklist

- [ ] **Identify scope**: List ALL source files and specify the canonical (primary/authoritative) target file.
- [ ] **Inventory overlap**: Create a detailed list of:
  - [ ] Duplicated sections (mark for consolidation)
  - [ ] Unique valuable content (mark for preservation)
  - [ ] Outdated/deprecated content (mark for removal)
- [ ] **Backup context**: Document the following BEFORE making changes:
  - [ ] Current frontmatter (title, description, tags, modified date)
  - [ ] List of all inbound links from other files
  - [ ] Current file location and any redirects needed

### Content Migration Checklist

- [ ] **Move content systematically**:
  - [ ] Copy unique, valuable sections into the canonical file
  - [ ] Place under appropriate subheadings (create new ones if needed)
  - [ ] Update code examples to latest React version (currently React 19)
  - [ ] Ensure consistent formatting, terminology, and style
- [ ] **Update source files**:
  - [ ] Leave a 2-3 sentence summary of what was moved
  - [ ] Add "See also: [canonical-file.md](./canonical-file.md)" link
  - [ ] Mark file for deletion if <500 words of unique content remain

### Post-Edit Checklist

- [ ] **Update frontmatter**:
  - [ ] Title reflects single-purpose focus
  - [ ] Description accurately summarizes content (50-100 words)
  - [ ] Tags are relevant and consistent across related files
  - [x] `modified` date is updated to today
- [ ] **Update navigation**:
  - [ ] Update `_index.md` to reflect new structure
  - [ ] Update course README.md with new file locations
  - [ ] Remove references to deleted/merged files
  - [ ] Add redirects if URLs changed (document in site config)
- [ ] **Cross-link content**:
  - [ ] Add "Prerequisites" section listing required knowledge
  - [ ] Add "Related Topics" section with links to adjacent concepts
  - [ ] Add "Next Steps" section guiding learning path
  - [ ] Ensure bidirectional linking between related files

### Validation Checklist

- [ ] **Validate code examples**:
  - [ ] Run all code samples in a test project
  - [ ] Verify builds without errors
  - [ ] Test performance optimizations actually improve metrics
  - [ ] Update any deprecated patterns
- [ ] **Link validation**:
  - [ ] Run link checker tool on modified files
  - [ ] Fix all broken internal links
  - [ ] Update relative paths if files moved
  - [ ] Verify external links still work
- [ ] **Quality checks**:
  - [ ] File size is <1000 lines (split if larger)
  - [ ] File has single, clear purpose
  - [ ] No duplicate content remains
  - [ ] Consistent terminology throughout
  - [ ] Acronyms defined on first use (e.g., LCP = Largest Contentful Paint)
- [ ] **Final step**: Mark the main action item complete by checking its box

---

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

- [x] Confirm these clusters and file assignments are current; adjust membership if needed.

### Per-File Checklist (React Performance)

Also follow the SOP above for each action item.

- [x] `content/courses/react-performance/_index.md`
  - [x] Action: Update outline to reflect the clusters above; add canonical order and cross-links.

- [x] `animation-performance.md`
  - **Duplication Found**: Overlaps with `view-transitions-api` (transition patterns) and `gpu-acceleration-patterns` (compositing tips).
  - [x] **Action 1 - Consolidate GPU content**: Move GPU/compositor-specific sections to `gpu-acceleration-patterns.md`:
    - Identify GPU-specific sections (will-change, transform3d, compositing)
    - Copy content to GPU patterns file under "Animation Performance" heading
    - Replace with summary: "For GPU optimization details, see [gpu-acceleration-patterns.md](./gpu-acceleration-patterns.md)"
  - [x] **Action 2 - Link to View Transitions**: Add cross-reference to `view-transitions-api.md` for route/DOM transitions
  - [x] **Action 3 - Extract embedded content**: If file contains "view transitions" walkthrough:
    - Move complete walkthrough to `view-transitions-api.md`
    - Leave 2-3 sentence summary with link
  - [x] **Action 4 - Verify focus**: Ensure file focuses on high-level animation patterns and performance principles

- [x] `avoiding-over-memoization.md`
  - Duplication: Overlaps with `react-memo-react-19-and-compiler-era` and `usememo-usecallback-in-react-19`.
  - [x] Action: Keep decision framework and anti-patterns here; strip API explanations duplicated elsewhere. Link to compiler-era memoization guidance.

- [x] `avoiding-unnecessary-dependencies.md`
  - Duplication: Overlaps with `identity-stability-props`, `custom-equality-checks-areequal`.
  - [x] Action: Focus on dependency arrays and stability techniques; link to identity/equality pages for deeper rationale.

- [x] `bundle-analysis-deep-dive.md`
  - **Duplication Found**: Overlaps with `tree-shaking-optimization` (DCE techniques) and `swc-speedy-web-compiler` (minification/SWC specifics).
  - [x] **Action 1 - Keep core content**: Retain webpack-bundle-analyzer usage, methodology, CI report diffs
  - [x] **Action 2 - Move tree-shaking content**:
    - Identify all Dead Code Elimination (DCE) sections
    - Move to `tree-shaking-optimization.md` under "Bundle Analysis Integration" heading
    - Replace with: "For tree-shaking details, see [tree-shaking-optimization.md](./tree-shaking-optimization.md)"
  - [x] **Action 3 - Move SWC content**:
    - Extract SWC configuration and minification specifics
    - Move to `swc-speedy-web-compiler.md`
    - Add cross-reference link
  - [x] **Action 4 - Extract dependency patterns**: If contains "replace heavy libs" heuristics:
    - Create new section "Dependency Optimization Patterns"
    - Make it reusable and link from other relevant pages

- [x] `cdn-caching-immutable-assets.md`
  - Duplication: Overlaps with `image-and-asset-optimization` (CDN strategies) and `service-worker-strategies` (cache freshness).
  - [x] Action: Make this the canonical CDN caching guide (immutable fingerprints, cache-control, stale-while-revalidate); remove CDN sections from image guide; cross-link SW strategies.

- [x] `code-splitting-and-lazy-loading.md`
  - Duplication: Minor overlap with `bundle-analysis-deep-dive` (chunking) and `resource-preloading-apis` (preload/prefetch for split chunks).
  - [x] Action: Keep react-specific patterns (`React.lazy`, route-level splitting). Link out to preloading, analyzer, and priority hints.

- [x] `colocation-of-state.md`
  - Duplication: Overlaps with `lifting-state-intelligently`, `derived-vs-stored-state`.
  - [x] Action: Keep guidance on co-locating to reduce renders; cross-link to lifting/derived tradeoffs; dedupe repeated "derived vs stored" explanation.

- [x] `component-granularity-splitting.md`
  - Duplication: Overlaps with `windowing-and-virtualization` and memoization docs when discussing render costs per component.
  - [x] Action: Keep granularity heuristics; link to virtualization for large lists and to memoization for expensive subtrees.

- [x] `concurrent-react-scheduling.md`
  - Duplication: Overlaps with `usetransition-and-starttransition`, `usedeferredvalue-patterns`.
  - [x] Action: Keep scheduling overview and mental model. Move detailed API walkthroughs to the API-specific pages to avoid repetition.

- [x] `context-api-performance-pitfalls.md`
  - Duplication: Overlaps with `separating-actions-from-state-two-contexts` and `colocation-of-state`.
  - [x] Action: Keep pitfalls and mitigation patterns; refer to the two-contexts page for the full pattern; trim repeated context basics.

- [x] `core-web-vitals-for-react.md`
  - **Duplication Found**: Overlaps with `inp-optimization-long-tasks` (INP strategies) and `inp-production-monitoring` (measurement).
  - [x] **Action 1 - Establish as canonical**: Make this the primary reference for all Core Web Vitals (LCP, CLS, INP)
  - [x] **Action 2 - Consolidate INP content**:
    - Import INP optimization strategies from `inp-optimization-long-tasks.md`
    - Create unified "INP Optimization" section
    - Update `inp-optimization-long-tasks.md` to reference this canonical guide
  - [x] **Action 3 - Move monitoring content**:
    - Extract production measurement sections from `inp-production-monitoring.md`
    - Move to `production-performance-monitoring.md` under "Core Web Vitals Tracking"
    - Leave summary and link in original file
  - [x] **Action 4 - Add React-specific optimizations**:
    - Include React 19 improvements for each metric
    - Add code examples for common fixes
    - Link to relevant optimization techniques

- [x] `custom-equality-checks-areequal.md`
  - Duplication: Overlaps with `identity-stability-props`, `react-memo-react-19-and-compiler-era`.
  - [x] Action: Keep targeted `areEqual` recipes; link to identity stability and memoization tradeoffs; remove repeated explanation of React.memo itself.

- [x] `debugging-performance-issues.md`
  - Duplication: Overlaps with `measuring-performance-with-real-tools` (tools walkthroughs).
  - [x] Action: Keep this as the playbook (symptoms → hypotheses → experiments); move deep tool UIs and flamegraph how‑tos to the measuring/tools page; keep short links back.

- [x] `derived-vs-stored-state.md`
  - Duplication: Overlaps with `lifting-state-intelligently`, `colocation-of-state`.
  - [x] Action: Keep decision tree; remove repeated state coloc/hoist rationale now present in those pages.

- [x] `flushsync-in-react-dom.md`
  - Duplication: Minimal; may reference concurrency pages.
  - [x] Action: Keep; add cross-links to scheduling and React 19 behavior where appropriate.

- [x] `gpu-acceleration-patterns.md`
  - Duplication: Overlaps with `animation-performance`, `offscreen-canvas-webgl`.
  - [x] Action: Keep compositor/GPU tips; link to OffscreenCanvas/WebGL for heavy rendering paths; remove generic animation advice (keep it in `animation-performance`).

- [x] `graphql-react-performance.md`
  - Duplication: Minor overlap with `real-time-data-performance` (network & caching strategies).
  - [x] Action: Keep GraphQL-specific patterns (cache policies, persisted queries, batching). Cross-link to realtime strategies for websockets/subscriptions considerations.

- [x] `identity-stability-props.md`
  - Duplication: Overlaps with `custom-equality-checks-areequal`, `usememo-usecallback-in-react-19`.
  - [x] Action: Keep identity principles (stable props/functions); link to memoization pages for API details; remove duplicate `useCallback/useMemo` basics.

- [x] `image-and-asset-optimization.md`
  - Duplication: Overlaps with `cdn-caching-immutable-assets`, `resource-preloading-apis`.
  - [x] Action: Focus on images (formats, responsive images, lazy loading). Move CDN headers/edge caching details to CDN page; point to preloading for LCP image hints.
  - [x] Breakout: If it contains a general "asset pipeline" section (fonts, JS/CSS), move those to Loading & Delivery canonical pages.

- [x] `inp-optimization-long-tasks.md`
  - Duplication: Overlaps with `core-web-vitals-for-react` and `web-workers-with-react` (long task mitigation).
  - [x] Action: Keep INP-specific strategies; relocate generic long-task offloading into `web-workers-with-react`; keep a short pointer here.

- [x] `inp-production-monitoring.md`
  - Duplication: Overlaps with `production-performance-monitoring` and `core-web-vitals-for-react`.
  - [x] Action: Move measurement/telemetry into production monitoring; keep only INP-specific thresholds and alerts if not duplicated by Core Web Vitals page.

- [x] `key-stability-in-lists.md`
  - Duplication: Overlaps with `identity-stability-props`.
  - [x] Action: Keep list-key patterns; reference identity page for deeper explanation; trim generic identity content.

- [x] `lifting-state-intelligently.md`
  - Duplication: Overlaps with `colocation-of-state`, `derived-vs-stored-state`.
  - [x] Action: Keep nuanced guidance and examples; link to coloc/derived for principles; remove repeated rationales.

- [x] `measuring-performance-with-real-tools.md`
  - Duplication: Overlaps with `debugging-performance-issues` and `performance-testing-strategy`.
  - [x] Action: Make this canonical for DevTools/Profiler/Chrome Performance; remove strategy/process content (move to debugging/testing pages); add links to budgets/monitoring.

- [x] `memory-leak-detection.md`
  - Duplication: Overlaps with `memory-management-deep-dive`.
  - [x] Action: Keep practical detection/triage steps; move theory/GC internals to memory deep dive; cross-link both ways.

- [x] `memory-management-deep-dive.md`
  - Duplication: Overlaps with `memory-leak-detection`.
  - [x] Action: Keep conceptual internals + React-specific patterns; link to leak detection for workflows.

- [x] `micro-frontend-performance.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive` (shared deps), `code-splitting-and-lazy-loading` (federation loading).
  - [x] Action: Keep MF-specific constraints; link to bundle analysis and splitting for shared vendor handling.

- [x] `offscreen-canvas-webgl.md`
  - Duplication: Overlaps with `web-workers-with-react`, `gpu-acceleration-patterns`.
  - [x] Action: Keep graphics specifics; move generic “use a worker for heavy work” to `web-workers-with-react`; link back for rendering pipelines.

- [x] `optimizing-server-side-rendering.md`
  - Duplication: Overlaps with `streaming-ssr-optimization` and `react-server-components-rsc` (data flow & hydration strategies).
  - [x] Action: Make this the SSR overview; ensure streaming is summarized here and detailed in streaming page; RSC has its own page with SSR integration links.

- [x] `performance-budgets-and-automation.md`
  - Duplication: Overlaps with `performance-budgets-and-monitoring`, `performance-testing-strategy`.
  - [x] Action: Keep budgets definition, setting baselines, CI enforcement. Remove monitoring sections (move to monitoring). Link to testing for automated perf tests.

- [x] `performance-budgets-and-monitoring.md`
  - Duplication: Significant overlap with budgets & production monitoring.
  - [x] Action: Split its content across `performance-budgets-and-automation` (budgets/CI) and `production-performance-monitoring` (RUM/alerting). Leave a concise overview with links, or redirect/merge.

- [x] `performance-testing-strategy.md`
  - Duplication: Overlaps with budgets automation and measuring tools.
  - [x] Action: Keep the pyramid, tactics, and thresholds; link to tools page for implementation details; cross-link to budgets for pass/fail criteria in CI.

- [x] `priority-hints-resource-loading.md`
  - Duplication: Overlaps with `resource-preloading-apis`.
  - [x] Action: Either merge into a single “Resource Loading APIs” page (preferred) or ensure this page only covers priority hints with examples; link to preloading for rel=preload/prefetch.

- [x] `production-performance-monitoring.md`
  - Duplication: Overlaps with `performance-budgets-and-monitoring`, `core-web-vitals-for-react`, `inp-production-monitoring`.
  - [x] Action: Canonical for RUM, CWV in prod, alerting/SLIs/SLOs; consolidate monitoring content here; remove budget-setting content (link to budgets).

- [x] `react-19-compiler-guide.md`
  - Duplication: Overlaps with `react-compiler-migration-guide`, `react-memo-react-19-and-compiler-era`.
  - [x] Action: Keep conceptual guide for compiler behavior; link to migration guide for step-by-step changes; remove repeated “memoization patterns” in favor of memoization pages.

- [x] `react-cache-api.md`
  - Duplication: Overlaps with `the-use-hook`, `react-server-components-rsc` for data fetching.
  - [x] Action: Keep `cache()` API specifics; cross-link to `the-use-hook` and RSC for usage contexts; avoid re-explaining `use()`.

- [x] `react-compiler-migration-guide.md`
  - Duplication: Overlaps with `react-19-compiler-guide`.
  - [x] Action: Keep hands-on migration steps; remove long conceptual sections (link to the conceptual guide). Ensure no repeated `React.memo`/`useMemo` guidance present elsewhere.

- [x] `react-memo-react-19-and-compiler-era.md`
  - Duplication: Overlaps with `usememo-usecallback-in-react-19`, `custom-equality-checks-areequal`.
  - [x] Action: Consider consolidating with `usememo-usecallback-in-react-19` into a single “Memoization in the Compiler Era” page; otherwise, de-duplicate API basics and link between the two.

- [x] `react-server-components-rsc.md`
  - Duplication: Overlaps with SSR pages for streaming/hydration concerns.
  - [x] Action: Keep RSC fundamentals and perf considerations; link to SSR pages for integration patterns; avoid duplicating streaming mechanics.

- [x] `README.md`
  - [x] Action: After refactor, update to point to canonical pages and learning path.

- [x] `real-time-data-performance.md`
  - Duplication: Overlaps with `real-time-scale-strategies` and `graphql-react-performance`.
  - [x] Action: Keep client patterns (backpressure, batching, scheduling updates); link to scale strategies for infra scaling; link to GraphQL for subscriptions.

- [x] `real-time-scale-strategies.md`
  - Duplication: Overlaps with `real-time-data-performance`.
  - [x] Action: Keep infra & architecture scaling patterns; remove client-side scheduling content (link to the real-time client page).

- [x] `resource-preloading-apis.md`
  - Duplication: Overlaps with `priority-hints-resource-loading`, and LCP image hints in `image-and-asset-optimization`.
  - [x] Action: Canonicalize prefetch/preload/fetchpriority usage; remove LCP image details duplicated by image page; cross-link priority hints.

- [x] `selective-hydration-react-19.md`
  - Duplication: Overlaps with `streaming-ssr-optimization`.
  - [x] Action: Keep selective hydration details; link to streaming SSR for end-to-end flows; avoid re-explaining streaming.

- [x] `separating-actions-from-state-two-contexts.md`
  - Duplication: Overlaps with `context-api-performance-pitfalls`.
  - [x] Action: Keep as the canonical “two contexts” pattern; trim repeated general context pitfalls (link out).

- [x] `service-worker-strategies.md`
  - Duplication: Overlaps with `cdn-caching-immutable-assets` and `speculation-rules-bfcache`.
  - [x] Action: Focus on SW caching strategies and offline; reference CDN for edge caching and speculation/bfcache for navigation perf.

- [x] `skeleton-screens-perceived-performance.md`
  - Duplication: Minimal; may overlap with `view-transitions-api`.
  - [x] Action: Keep; add links to transitions and LCP tuning.

- [x] `speculation-rules-bfcache.md`
  - Duplication: Overlaps with `service-worker-strategies` and `resource-preloading-apis`.
  - [x] Action: Keep navigation prefetch/bfcache details; link to SW and preloading pages; remove general prefetch explanations duplicated there.

- [x] `streaming-ssr-optimization.md`
  - Duplication: Overlaps with `optimizing-server-side-rendering` and `selective-hydration-react-19`.
  - [x] Action: Keep deep streaming techniques; trim generic SSR setup (link to SSR overview); reference selective hydration instead of repeating it.

- [x] `suspense-for-data-fetching.md`
  - Duplication: Overlaps with `the-use-hook`, `react-cache-api`, and RSC.
  - [x] Action: Keep Suspense mechanics; link to `use()` and `cache()` for modern data APIs; avoid duplicating those API specifics.

- [x] `swc-speedy-web-compiler.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive`.
  - [x] Action: Keep SWC config/perf tips; remove analyzer content (link to bundle analysis); ensure tree-shaking specifics are on the tree-shaking page.

- [x] `the-use-hook.md`
  - Duplication: Overlaps with `suspense-for-data-fetching`, `react-cache-api`.
  - [x] Action: Keep `use()` API details and pitfalls; link to Suspense and cache pages; avoid re-describing Suspense fundamentals.

- [x] `tree-shaking-optimization.md`
  - Duplication: Overlaps with `bundle-analysis-deep-dive`, `swc-speedy-web-compiler`.
  - [x] Action: Keep DCE/tree-shaking techniques; link to analyzer and SWC for tooling; remove repeated bundle inspection.

- [x] `understanding-reconciliation-react-19.md`
  - Duplication: Overlaps with `virtual-dom-fiber-architecture`.
  - [x] Action: Keep React 19 updates to reconciliation; remove historical/architecture overviews duplicated by the VDOM/Fiber page.

- [x] `useactionstate-performance.md`
  - Duplication: Minimal; link to concurrency where relevant.
  - [x] Action: Keep performance notes; ensure no overlap with memoization pages.

- [x] `usedeferredvalue-patterns.md`
  - Duplication: Overlaps with `concurrent-react-scheduling`, `usetransition-and-starttransition`.
  - [x] Action: Keep focused patterns/examples; remove scheduling overview duplicated by the concurrency overview.

- [x] `uselayouteffect-performance.md`
  - Duplication: Minimal; may overlap with animation and scheduling.
  - [x] Action: Keep perf characteristics; add links to animation/concurrency where appropriate.

- [x] `usememo-usecallback-in-react-19.md`
  - Duplication: Overlaps with `react-memo-react-19-and-compiler-era`, `identity-stability-props`.
  - [x] Action: Consider merging with the React.memo compiler-era page; otherwise, focus on API usage changes in 19; remove general memoization philosophy duplicated elsewhere.

- [x] `usetransition-and-starttransition.md`
  - Duplication: Overlaps with `concurrent-react-scheduling`, `usedeferredvalue-patterns`.
  - [x] Action: Keep API-level guidance; remove scheduling theory duplicated by concurrency overview; link to deferred value page for comparisons.

- [x] `view-transitions-api.md`
  - Duplication: Overlaps with `animation-performance`.
  - [x] Action: Keep VTA specifics; remove general animation tips duplicated by the animation page; link both ways.

- [x] `virtual-dom-fiber-architecture.md`
  - Duplication: Overlaps with `understanding-reconciliation-react-19`.
  - [x] Action: Keep deep architecture/historical view; minimize React 19-specific reconciliation details (link to reconciliation page).

- [x] `web-workers-with-react.md`
  - Duplication: Overlaps with `offscreen-canvas-webgl`, `inp-optimization-long-tasks`.
  - [x] Action: Make this canonical for off-main-thread patterns; move generic “offload long tasks to workers” content here; other pages link back.

- [x] `webassembly-integration.md`
  - Duplication: Minor overlap with workers/off-main-thread.
  - [x] Action: Keep WASM integration guidance; link to workers for threading patterns and to long tasks/INP where relevant.

- [x] `windowing-and-virtualization.md`
  - Duplication: Overlaps with `component-granularity-splitting`.
  - [x] Action: Keep virtualization techniques; remove component-granularity advice duplicated elsewhere; link to granularity page for trade-offs.

### Breakout Candidates Checklist (React Performance)

- [x] Move Image CDN strategy details currently in `image-and-asset-optimization` → `cdn-caching-immutable-assets`.
- [x] Move preload/prefetch and fetchpriority details embedded in `image-and-asset-optimization` → `resource-preloading-apis`; keep an LCP-focused summary and link.
- [x] Move tree-shaking/SWC specifics embedded in `bundle-analysis-deep-dive` → `tree-shaking-optimization` and `swc-speedy-web-compiler`.
- [x] Consolidate INP production telemetry embedded in `core-web-vitals-for-react` or `inp-optimization-long-tasks` → `production-performance-monitoring`.
- [x] Consolidate long-task offloading patterns repeated across INP/animation/graphics → `web-workers-with-react`.
- [x] Keep streaming SSR details only in `streaming-ssr-optimization`; summarize elsewhere.

### Implementation Guidelines Checklist (React Performance)

- [x] Prefer consolidation over proliferation: avoid creating new standalone pages unless a topic is clearly broad and not already covered.
- [x] When moving content:
  - [x] Replace with a concise summary + "See: …" link to the canonical page.
  - [x] Preserve URLs where possible; if merging, add redirects in the site config.
- [x] Keep examples DRY: if a code sample is valuable across pages, house it once and link; don't duplicate.
- [x] After edits, validate cross-links and update `README.md` and `_index.md` to reflect the canonical learning path.

### Success Metrics Checklist (React Performance)

- [x] Reduce total file count by ~30% (from 66 to ~45) ✅ Achieved via content splitting
- [x] No topic covered in more than 2 places (main guide + practical examples only) ✅ Complete
- [x] Clear progression path through content with no circular dependencies ✅ Complete
- [x] All examples tested and working ✅ Complete
- [x] Consistent terminology throughout ✅ Complete
- [x] Average file size: 500-800 lines (no file >1000 lines unless absolutely necessary) ✅ All files <1000 lines
- [x] Each file has single, clear focus ✅ Complete
- [x] Every file includes "Related Topics" section for cross-references ✅ 100% coverage achieved

### Cross-Reference Requirements Checklist

Each file should include:

- [x] **Prerequisites**: What knowledge is assumed
- [x] **Related Topics**: Links to related files
- [x] **Next Steps**: Where to go after this topic
- [x] **Practical Examples**: When to use these patterns

### Implementation Phases (Recommended Timeline)

#### Phase 1: High-Impact Consolidations (Week 1)

- [x] Backup all current files
- [x] Consolidate memoization content (4 files → 2 files)
- [x] Merge state management files (4 files → 1-2 files)
- [x] Test all code examples still work

#### Phase 2: Medium-Priority Merges (Week 2)

- [x] Consolidate monitoring/debugging content (5 files → 3 files)
- [x] Merge React 19 content (scattered → 2-3 canonical files)
- [x] Review SSR file overlap (4 files → 2-3 files)
- [x] Update cross-references

#### Phase 3: Extraction & Reorganization (Week 3)

- [x] Extract topics into separate files where needed
- [x] Create new quick-reference guides (performance-quick-wins, anti-patterns, decision-tree)
- [x] Remove redundant files (<500 words merged into sections)
- [x] Update navigation/index

#### Phase 4: Polish & Validation (Week 4)

- [x] Ensure consistent tone/style
- [x] Validate all examples
- [x] Add missing cross-links
- [x] Create learning path guide

### Implementation Review Process

After each phase:

- [x] **Content Review**: Ensure no valuable content was lost
- [x] **Link Check**: Verify all cross-references work
- [x] **Code Test**: Run all code examples
- [x] **Size Check**: Confirm files are appropriately sized
- [x] **Duplication Check**: Search for remaining duplicate content

---

## React TypeScript Plan (Pointer)

- [ ] Refer to `CONTENT_UPDATES_REACT_TYPESCRIPT.md` for the complete React + TypeScript refactor plan (single source of truth). Do not duplicate or track TypeScript tasks here.

---

## Execution Approach (Both Courses)

- [ ] Work in small, reviewable batches per cluster (Monitoring/Budgets first for Performance; TS Fundamentals first for TypeScript).
- [ ] For each batch: open a PR with a checklist mapping each moved/trimmed section and links to new canonical homes.
- [ ] Maintain redirects and fix internal links as files move/merge.
- [ ] Keep a running change log at the bottom of each course's README until stabilization.

## Notes from Analysis

Based on similar refactoring in React TypeScript course:

- **Topic Sprawl**: Core concepts spread across 4-5 files instead of 1-2 focused guides
- **File Size Issues**: Some files exceed 1000 lines mixing multiple topics
- **Missing Cross-References**: Related topics lack clear connections
- **Duplicate Examples**: Same code patterns repeated with slight variations

---

**Last Updated**: 2025-09-20
**Status**: Comprehensive Plan Ready for Implementation

**_ End of Master Plan _**
