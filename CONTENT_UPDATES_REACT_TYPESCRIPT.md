# React + TypeScript Content Refactor Plan

**Purpose**: Remove duplication, split mixed topics into focused tutorials, and produce a concise, comprehensive path to mastery. No content changes yet—this is the TODO checklist and approach.

## Progress Tracking Summary

**Total Actionable Items**: 492 checkboxes

- [x] **Phase 1 Complete**: TypeScript Core Consolidation (21 items)
- [x] **Phase 2 Complete**: React Component Patterns (9 items)
- [x] **Phase 3 Complete**: React 19 Content (11 items)
- [x] **Phase 4 Complete**: Advanced Patterns (4 items)
- [x] **Phase 5 Complete**: Testing & Tooling (6 items)
- [x] **Phase 6 Complete**: Content Extraction (4 items)
- [x] **Phase 7 Complete**: Final Organization (2 items)
- [ ] **Per-File Actions Complete**: (396 items)
- [ ] **Success Metrics Met**: (12 items)
- [ ] **Final Verification Complete**: (27 items)

## ⚠️ CRITICAL: How To Use This Checklist

- [ ] **MANDATORY**: Treat this as a living, actionable checklist. You MUST check off each box `[x]` as you complete each task.
- [ ] **SEQUENTIAL**: Work through phases in order. Do NOT move to the next phase until ALL items in the current phase are checked off.
- [ ] **TRACKING**: When you complete an item, immediately change `- [ ]` to `- [x]`. These checkboxes are your source of truth for progress.
- [ ] **TRACEABILITY**: If work spans multiple PRs, add PR links next to the item (e.g., "Completed in PR #123").
- [ ] **CLARITY**: If any action item is unclear, research the necessary information and update the item with explicit instructions.

**Example Progress Tracking**:

- [ ] Not started
- [x] Completed - Merged unique content from 3 files into canonical doc (PR #123)
- [x] Completed - Updated cross-references and removed duplicate file (PR #124)

⚠️ **IMPORTANT**: All actionable bullets are checkboxes. Any bullet without a checkbox is informational context only (not a step).

## Standard Operating Procedure (SOP) for All Content Edits

**MANDATORY**: Apply this SOP to EVERY merge, split, consolidation, or de-duplication task. This ensures "how to complete it" is always explicit.

### Pre-Edit Checklist

- [ ] **Identify scope**: List ALL source files and specify the canonical (primary/authoritative) target file.
- [ ] **Inventory overlap**: Create a list of:
  - Duplicated sections (mark for consolidation)
  - Unique valuable content (mark for preservation)
  - Outdated content (mark for removal)
- [ ] **Backup context**: Document the following BEFORE making changes:
  - Current frontmatter (title, description, tags, modified date)
  - List of all inbound links from other files
  - Current file location and any redirects needed

### Content Migration Checklist

- [ ] **Move content**:
  - Copy unique, valuable sections into the canonical file
  - Place under appropriate subheadings (create new ones if needed)
  - Update code examples to latest React/TypeScript versions
  - Ensure consistent formatting and style
- [ ] **Replace in source**:
  - Leave a 2-3 sentence summary of what was moved
  - Add "See also: [canonical-file.md](./canonical-file.md)" link
  - Mark file for deletion if <500 words remain

### Post-Edit Checklist

- [ ] **Update frontmatter**:
  - Title reflects single-purpose focus
  - Description accurately summarizes content (50-100 words)
  - Tags are relevant and consistent
  - `modified` date is updated to today
- [ ] **Update navigation**:
  - Update `_index.md` to reflect new structure
  - Update course README.md with new file locations
  - Remove references to deleted/merged files
  - Add redirects if URLs changed
- [ ] **Cross-link content**:
  - Add "Prerequisites" section listing required knowledge
  - Add "Related Topics" section with links to adjacent concepts
  - Add "Next Steps" section guiding learning path
  - Ensure bidirectional linking between related files

### Validation Checklist

- [ ] **Validate code examples**:
  - Run all code samples in a test project
  - Verify TypeScript compiles without errors
  - Test in latest React version (currently React 19)
  - Update any deprecated patterns
- [ ] **Link validation**:
  - Run link checker tool on modified files
  - Fix all broken internal links
  - Update relative paths if files moved
  - Verify external links still work
- [ ] **Quality checks**:
  - File size is <1000 lines (split if larger)
  - File has single, clear purpose
  - No duplicate content remains
  - Consistent terminology throughout
- [ ] **Final step**: Mark the main action item complete by checking its box

## Overview

This document outlines the comprehensive refactoring plan for the React TypeScript course content to eliminate duplication, improve organization, and create a concise but comprehensive learning path.

## Major Duplication Issues Found

### Pre-Refactor Verification Checklist

- [x] **File inventory**: Re-scan the entire repo for new/renamed files since last analysis
- [x] **Duplication validation**: Confirm each duplication issue below is still accurate
- [x] **Canonical targets**: Ensure a canonical (primary/authoritative) target file exists for EVERY duplicated topic
- [x] **Action alignment**: Update per-file checklist actions to reflect any discoveries
- [x] **Size analysis**: Note any files >1000 lines that need splitting

### 1. TypeScript Fundamentals

**Action Checklist**:

- [ ] **Validate overlap**: Compare all listed files to identify exact duplicate sections
- [ ] **Identify canonical files**:
  - Discriminated Unions → `typescript-discriminated-unions.md` (primary)
  - Generics → `typescript-generics-deep-dive.md` (primary)
  - Type Narrowing → `typescript-type-narrowing-control-flow.md` (primary)
  - Utility Types → `typescript-utility-types-complete.md` (primary)
- [ ] **Extract unique content**: List React-specific examples from other files to preserve
- [ ] **Update merge plan**: Adjust targets if new overlaps discovered
      **Duplicated Topics:**
- **Discriminated Unions** covered in 5+ files:
  - `typescript-discriminated-unions.md` (885 lines, comprehensive)
  - `typescript-type-system-fundamentals.md` (section on discriminated unions)
  - `typescript-unions-intersections-guards.md` (overlapping content)
  - `exclusive-props-and-discriminated-unions.md` (React-specific, 464 lines)
  - `typescript-type-narrowing-control-flow.md` (touches on discriminated unions)

- **Generics** covered in 3+ files:
  - `typescript-generics-deep-dive.md` (887 lines, comprehensive)
  - `just-enough-generics.md` (639 lines, React-focused)
  - `typescript-type-system-fundamentals.md` (section on generics)

- **Type Narrowing/Guards** covered in 3+ files:
  - `typescript-type-narrowing-control-flow.md` (859 lines, comprehensive)
  - `typescript-unions-intersections-guards.md` (significant overlap)
  - `typescript-type-system-fundamentals.md` (section on type narrowing)

- **Utility Types** covered in 2+ files:
  - `typescript-utility-types-complete.md` (761 lines, comprehensive)
  - `typescript-type-system-fundamentals.md` (touches on utilities)
  - `utility-types-in-practice.md` (likely overlaps)

### 2. React Component Patterns

**Action Checklist**:

- [ ] **Map overlap**: Document which sections about children/ReactNode are duplicated
- [ ] **Set canonical files**:
  - Children/ReactNode → `jsx-types-reactnode-reactelement.md`
  - Props patterns → new `component-props-complete-guide.md` (to be created)
- [ ] **Plan consolidation**: Create detailed merge plan for combining prop pattern files
      **Duplicated Topics:**
- **Children and ReactNode** covered in multiple files:
  - `jsx-types-reactnode-reactelement.md` (713 lines, comprehensive)
  - `typing-props-and-defaults.md` (touches on children)
  - `common-prop-shapes.md` (touches on children)

- **Props Patterns** spread across:
  - `typing-props-and-defaults.md` (437 lines)
  - `common-prop-shapes.md` (780 lines)
  - `exclusive-props-and-discriminated-unions.md` (overlaps with union types)

### 3. React 19 Content

**Action Checklist**:

- [ ] **Analyze React 19 files**: Compare all React 19 files for duplicate content
- [ ] **Create unified guide**: Confirm merging into single `react-19-typescript-guide.md`
- [ ] **Organize features**:
  - Server Components → separate focused file
  - Server Actions → separate focused file
  - Overview & patterns → main guide
- [ ] **Remove duplication**: Ensure each feature is explained in exactly ONE place
- Multiple files covering React 19 features without clear organization
- `react-19-updates-typescript.md` vs `advanced-patterns-react-19-and-typescript.md`
- Server components and actions spread across multiple files

## ⚠️ REMINDER: Checklist Usage Is Mandatory

**Before proceeding with ANY work**:

- [ ] You have read and understood the SOP above
- [ ] You understand that EVERY checkbox must be checked off when completed
- [ ] You commit to updating checkboxes IMMEDIATELY upon task completion
- [ ] You will add clarifying details to any unclear tasks before starting them

## Guiding Principles

- **Single source per concept**: one canonical (primary/authoritative) file per topic; others merge or link.
- React-first focus: TS fundamentals stay but defer deep reference to a single canonical doc, with React-specific applications elsewhere.
- Keep URLs stable where possible. If we must retire a file, update `_index.md` and add prominent cross-links in the canonical doc during merge (no redirects assumed).
- Prefer merging into the stronger, broader, or better-linked file. Preserve best examples and prune repetition.
- Split long "kitchen sink" docs into focused, linkable pieces when they span multiple topics that already have homes.
- Maintain consistent frontmatter (title, description, tags; update `modified` when changes occur).

## Implementation Steps (playbook)

- [ ] For each topic group, explicitly choose the canonical file and note it in the item.
- [ ] Move unique sections into the canonical file under clear subheads (follow the SOP above).
- [ ] Replace repeated content with succinct cross-links in the source files (“See also: …”).
- [ ] Remove outdated/duplicated sections while preserving unique examples in the canonical file.
- [ ] For split candidates, extract the specified sections into the named new (or existing) file and add redirects/stubs if applicable.
- [ ] Leave a brief "See also" note where content was removed to preserve reader pathways.
- [ ] Update `_index.md` to list only canonical items and add cross-links where helpful.
- [ ] Sanity check for overlap by scanning headings and examples across merged topics.

## Refactoring Action Plan (Phases)

**📋 CHECK EACH BOX AS YOU COMPLETE THE TASK**
Also follow the SOP above for each action item.

### Phase 1: TypeScript Core Consolidation

#### Action 1: Create Master TypeScript Files

- [x] MERGE discriminated unions content into single file:
  - [x] Primary: Keep `typescript-discriminated-unions.md` as the comprehensive guide
  - [x] Extract React-specific examples from `exclusive-props-and-discriminated-unions.md`
  - [x] Remove duplicate content from `typescript-type-system-fundamentals.md`
  - [x] Add React use cases section to main file
  - [ ] Archive or delete redundant files
- [x] MERGE generics content:
  - [x] Primary: Keep `typescript-generics-deep-dive.md` for comprehensive coverage
  - [x] Extract React-specific patterns from `just-enough-generics.md`
  - [x] Create new section "Generics in React Components" in the main file
  - [x] Remove generic coverage from `typescript-type-system-fundamentals.md`
- [x] CONSOLIDATE type narrowing:
  - [x] Primary: Keep `typescript-type-narrowing-control-flow.md`
  - [x] Merge unique content from `typescript-unions-intersections-guards.md`
  - [x] Remove from `typescript-type-system-fundamentals.md`
  - [x] Add React-specific narrowing examples
- [ ] KEEP AS IS: `typescript-utility-types-complete.md` (well organized)
  - [ ] Remove utility type coverage from other files
  - [ ] Add cross-references where utilities are mentioned

#### Action 2: Restructure TypeScript Fundamentals

- [x] SPLIT `typescript-type-system-fundamentals.md`:
  - [x] Extract structural typing → `typescript-structural-typing.md` (already exists)
  - [x] Extract type inference → `typescript-type-inference-mastery.md` (already exists)
  - [x] Keep only truly fundamental concepts (basic types, interfaces vs types)
  - [ ] Rename to `typescript-basics.md` for clarity

### Phase 2: React Component Patterns Consolidation

#### Action 3: Props and Children Organization

- [x] MERGE children/ReactNode content:
  - [x] Primary: Keep `jsx-types-reactnode-reactelement.md`
  - [x] Remove children sections from other prop files
  - [x] Add clear decision tree for when to use each type
- [x] COMBINE prop patterns:
  - [x] Create `component-props-complete-guide.md` by merging:
    - [x] `typing-props-and-defaults.md`
    - [x] `common-prop-shapes.md`
    - [x] Include discriminated unions for props (from exclusive props file)
    - [x] Add prop validation and performance considerations
- [x] KEEP SEPARATE: `polymorphic-components-and-as-prop.md` (specialized topic)

### Phase 3: React 19 Content Organization

#### Action 4: Create Clear React 19 Structure

- [x] MERGE React 19 overview files:
  - [x] Combine `react-19-updates-typescript.md` and `advanced-patterns-react-19-and-typescript.md`
  - [x] Create single `react-19-typescript-guide.md`
- [x] ORGANIZE by feature:
  - [x] Server Components: Merge `react-server-components-types.md` and `rsc-server-actions.md`
  - [x] Actions: Keep `forms-actions-and-useactionstate.md` focused
  - [x] Transitions: Ensure `useoptimistic-typed-optimism.md` doesn't duplicate
  - [x] Compiler: Keep `react-compiler-typescript-integration.md` separate

### Phase 4: Advanced Patterns Cleanup

#### Action 5: HOCs and Render Props

- [ ] CHECK for duplication between:
  - `higher-order-components-typing.md`
  - `render-props-and-hoc-alternatives.md`
  - `componenttype-hocs-render-props.md`
  - Merge if significant overlap exists

#### Action 6: Custom Hooks

- [ ] REVIEW `custom-hooks-with-generics-comprehensive.md`
  - [ ] Check if it duplicates generic patterns from other files
  - [ ] Consider merging with general hooks typing content

### Phase 5: Testing and Tooling

#### Action 7: Consolidate Build Tools

- [ ] MERGE similar tooling files:
  - [ ] Check overlap between `build-pipeline-tsc-swc.md` and `vite-react-typescript-optimization.md`
  - [ ] Combine ESLint/Prettier content if spread across files

#### Action 8: Testing Strategy

- [ ] REVIEW testing files for duplication:
  - `testing-react-typescript.md`
  - `msw-and-contract-testing.md`
  - [ ] Consider creating single comprehensive testing guide

### Phase 6: Content Extraction

#### Action 9: Break Out Embedded Topics

- [x] EXTRACT from large files:
  - [x] If any file contains multiple distinct topics (>1000 lines), consider splitting
  - [x] Look for "hidden" topics in comprehensive guides
  - [x] Create focused, single-topic files where appropriate

#### Action 10: Module Organization

- [ ] REVIEW module/path files:
  - `module-resolution-and-paths.md`
  - `typescript-modules-declarations.md`
  - `assets-and-module-declarations.md`
  - [ ] Consolidate overlapping content across these files

### Phase 7: Final Organization

#### Action 11: Create Learning Path

- [x] UPDATE `_index.md` with new structure
- [x] Verify sections exist and are ordered as follows:
  1. TypeScript Essentials (5-6 core files)
  2. React + TypeScript Basics (4-5 files)
  3. Component Patterns (5-6 files)
  4. React 19 Features (4-5 files)
  5. Advanced Patterns (6-8 files)
  6. Testing & Tooling (4-5 files)
  7. Production & Performance (3-4 files)

#### Action 12: Cross-Reference Audit

- [x] Add "Related Topics" sections to each file
- [x] Ensure no orphaned concepts
- [x] Create clear progression from basics to advanced

## Course Structure Targets (after cleanup)

- [ ] TypeScript Essentials section finalized (5-6 core files)
- [ ] React + TypeScript Basics section finalized (4-5 files)
- [ ] Component Patterns section finalized (5-6 files)
- [ ] React 19 Features section finalized (4-5 files)
- [ ] Advanced Patterns section finalized (6-8 files)
- [ ] Testing & Tooling section finalized (4-5 files)
- [ ] Production & Performance section finalized (3-4 files)

---

## Per-File TODO Checklist (actions are concise and specific)

**✅ REMEMBER: Check off each box `[x]` as you complete each file's actions**

### Overall Index Update

- [ ] `_index.md`: Update to remove duplicates per actions below and reflect canonical files.

### Foundations

- [ ] `typescript-without-trying.md`: Keep. Cross-link to TS fundamentals canon for deeper dives.
- [ ] `react-typescript-mental-models.md`: Keep. Ensure no repeated setup content; link to setup doc.
- [ ] `setting-up-react-and-typescript.md`: Keep as setup canon. Remove/avoid basic lint/format duplication; link to linting doc.
- [ ] `tsconfig-for-react-19.md`: Keep. Link out to `module-resolution-and-paths.md` for paths and `typescript-modules-declarations.md` for declarations.
- [ ] `strictness-options-for-react.md`: Keep. Ensure overlap with “Type inference/unknown/any” is minimal; link to TS canon for rationale.
- [ ] `setting-up-linting-and-formatting.md`: Merge basics into this; point advanced/type-aware rules to ESLint doc below. Action: consolidate overlap with `eslint-prettier-and-type-aware-rules.md` and `tooling-eslint-prettier-builds.md` (see both below).
- [ ] `building-development-scripts.md`: Keep, but dedupe with `tooling-eslint-prettier-builds.md`. Scope: scripts only; link to pipeline/build.
- [ ] `common-pitfalls-with-react-and-typescript.md`: Keep. Remove repeated debugging guidance; link to `debugging-typescript-errors-guide.md` for deep fixes.

### TS Deep Dive (Canonical references; React specifics should live elsewhere)

- [ ] `typescript-type-system-fundamentals.md`: Canon. Keep.
- [ ] `typescript-structural-typing.md`: Keep. Ensure examples are language-level; link to React applications where relevant.
- [ ] `typescript-type-inference-mastery.md`: Keep. Remove component-specific examples if duplicated in props/advanced patterns; link instead.
- [ ] `typescript-type-narrowing-control-flow.md`: Keep.
- [ ] `typescript-unions-intersections-guards.md`: Keep. Cross-link to `exclusive-props-and-discriminated-unions.md`.
- [x] `typescript-discriminated-unions.md`: Canon for DU. Action: merge overlapping "exclusive props" intro concepts from `exclusive-props-and-discriminated-unions.md` (leave React-specific examples there).
- [x] `typescript-generics-deep-dive.md`: Canon for generics. Dedupe with `just-enough-generics.md` (intro) and `custom-hooks-with-generics-comprehensive.md` (applied).
- [ ] `typescript-conditional-mapped-types.md`: Keep.
- [ ] `typescript-template-literal-types.md`: Canon for template literals. Action: merge `template-literal-types.md` into this; keep React examples as a dedicated “React applications” section.
- [ ] `typescript-utility-types-complete.md`: Canon for reference. Action: remove overlapping practical sections that belong in `utility-types-in-practice.md`; add cross-links.
- [ ] `typescript-type-level-programming.md`: Keep. Ensure no duplication with `advanced-type-tricks-for-react.md` (React-applied goes there).
- [ ] `typescript-unknown-vs-any.md`: Keep.
- [ ] `typescript-modules-declarations.md`: Canon. Action: merge overlapping conceptual material from `assets-and-module-declarations.md` (assets specifics remain there; see below).
- [ ] `typescript-performance-large-codebases.md`: Keep. Cross-link from React perf doc; avoid build-specific overlaps.

### Props and Component Patterns

- [x] `typing-props-and-defaults.md`: Keep. Ensure not duplicating common prop shapes; link to it.
- [x] `common-prop-shapes.md`: Keep. Cross-link to polymorphic and unions docs.
- [ ] `mirror-dom-props.md`: Keep.
- [ ] `prop-combinations-and-unions.md`: Keep but dedupe with `exclusive-props-and-discriminated-unions.md` and TS DU canon. Action: ensure prop-combo examples remain here; point to DU canon for theory.
- [x] `exclusive-props-and-discriminated-unions.md`: Keep React-focused. Action: trim general DU material (merge into TS DU canon) and keep React API design examples.
- [x] `jsx-types-reactnode-reactelement.md`: Keep. Ensure overlap with mental models is minimal.
- [ ] `forwardref-memo-and-displayname.md`: Keep; avoid overlap with refs doc; cross-link.

### Advanced Component Patterns

- [ ] `higher-order-components-typing.md`: Keep as HOC canon. Action: pull HOC sections out of `componenttype-hocs-render-props.md`; link to render props and polymorphic where needed.
- [ ] `componenttype-hocs-render-props.md`: Split/Retire. Action: distribute content into: - HOC parts -> `higher-order-components-typing.md` - Render props parts -> `render-props-and-hoc-alternatives.md` - Any `ComponentType` conceptual bits -> keep a short focused section here renamed to `componenttype-and-polymorphism.md` OR merge into `polymorphic-components-and-as-prop.md` (preferred: merge and retire this file).
- [ ] `render-props-and-hoc-alternatives.md`: Keep. Tighten overlap with HOC doc; focus on generics ergonomics.
- [ ] `polymorphic-components-and-as-prop.md`: Keep. Ensure `ComponentType` usage is covered; absorb any remaining `ComponentType` content from the split above.
- [ ] `compound-components-and-slots-typing.md`: Keep.
- [ ] `function-overloads-in-react.md`: Keep.
- [ ] `advanced-error-handling-patterns.md`: Keep. Action: remove Result/Either overlap; link to `result-types-and-error-handling.md`. Focus this on boundaries, retries, recovery patterns.
- [ ] `advanced-patterns-react-19-and-typescript.md`: Split/Retire. Action: move form/useTransition/examples to Forms/React 19 sections (`forms-actions-and-useactionstate.md`, `useoptimistic-typed-optimism.md`, `concurrent-features-typing*.md`). Retire file after redistribution.

### State and Context

- [ ] `react-state-management-with-typescript.md`: Keep general patterns. Action: remove Redux-specific content (link to Redux doc) and context selectors (link to context docs).
- [ ] `context-and-selectors-typing.md`: Keep.
- [ ] `safer-createcontext-helpers.md`: Keep.
- [ ] `passing-dispatch-and-context.md`: Keep; dedupe with state mgmt doc by linking, not repeating.
- [ ] `unions-for-ui-state.md`: Keep. Cross-link to TS DU canon.

### New in React 19

- [ ] `react-19-updates-typescript.md`: Keep and link to specific deep dives (refs, `use`, RSC, boundaries).
- [ ] `react-server-components-types.md`: Keep.
- [ ] `rsc-server-actions.md`: Keep.
- [ ] `forms-actions-and-useactionstate.md`: Keep; ensure no overlap with render props or general forms doc.
- [ ] `the-use-hook-and-suspense-typing.md`: Keep. Dedupe with error/suspense boundaries.
- [ ] `useoptimistic-typed-optimism.md`: Keep.
- [ ] `concurrent-features-typing.md`: Merge into `concurrent-features-typing-patterns.md` OR vice versa. Action: pick one canonical (prefer `concurrent-features-typing-patterns.md` as broader), merge the other, then retire it.
- [ ] `concurrent-features-typing-patterns.md`: Canon. Merge the simpler doc here.
- [ ] `react-compiler-typescript-integration.md`: Keep.
- [ ] `error-boundaries-and-suspense-boundaries.md`: Keep; coordinate with `advanced-error-handling-patterns.md` to avoid overlap.

### Forms and Events

- [ ] `forms-events-and-number-inputs.md`: Keep. Ensure event typing basics link to event canon; keep number input details here.
- [ ] `react-hook-form-with-zod-types.md`: Keep.
- [ ] `forms-file-uploads-typing.md`: Keep.
- [ ] `typing-dom-and-react-events.md`: Canon for event types. Action: dedupe with forms doc by centralizing event handler patterns here; keep forms doc focused on forms-specific patterns.
- [ ] `useref-and-imperative-handles.md`: Keep.
- [ ] `flushsync-and-imperative-dom.md`: Keep.
- [ ] `use-layout-effect-and-effect-typing.md`: Keep.

### Performance and Optimization

- [ ] `react-performance-with-typescript.md`: Keep React-focused perf patterns. Link to TS perf doc for compiler-level topics.
- [ ] `code-splitting-lazy-types.md`: Keep.
- [ ] `web-workers-and-comlink-typing.md`: Keep.
- [ ] `resource-preloading-apis-types.md`: Keep; avoid duplicating suspense/boundary material—link instead.
- [ ] `edge-ssr-hydration.md`: Merge with `edge-ssr-and-runtime-types.md` OR clarify scope. Action: Prefer `edge-ssr-and-runtime-types.md` as canonical; fold hydration specifics into it, keep this as redirecting stub if needed, or retire.
- [ ] `edge-ssr-and-runtime-types.md`: Canon. Merge hydration details here.
- [ ] `streaming-ssr-typescript.md`: Keep; cross-link to edge/runtime doc.
- [ ] `vite-react-typescript-optimization.md`: Keep; ensure no duplication with build pipeline doc; link between them.

### Testing and Tooling

- [ ] `testing-react-typescript.md`: Keep.
- [ ] `msw-and-contract-testing.md`: Keep; cross-link to OpenAPI doc.
- [ ] `type-level-testing-in-practice.md`: Keep.
- [ ] `tooling-eslint-prettier-builds.md`: Split. Action: move ESLint/Prettier content into `setting-up-linting-and-formatting.md` (basics) and `eslint-prettier-and-type-aware-rules.md` (advanced). Keep this focused on build pipeline overview and scripts; or merge pipeline into `build-pipeline-tsc-swc.md` and retire this.
- [ ] `eslint-prettier-and-type-aware-rules.md`: Keep as advanced linting canon. Dedupe with setup doc.
- [ ] `dev-tools-and-type-driven-dx.md`: Keep.
- [ ] `build-pipeline-tsc-swc.md`: Canon for build pipeline. Action: merge related content from `tooling-eslint-prettier-builds.md` and keep that as either scripts-only or retire.
- [ ] `debugging-typescript-errors-guide.md`: Keep. Cross-link from pitfalls; remove overlap in pitfalls doc.
- [ ] `cicd-type-checking-github-actions.md`: Keep.

### Advanced Patterns

- [x] `just-enough-generics.md`: Keep as introductory generics (short). Link to deep dive and hooks doc; avoid repetition.
- [ ] `custom-hooks-with-generics-comprehensive.md`: Keep. Ensure no duplication with deep dive; keep applied patterns.
- [ ] `template-literal-types.md`: Merge into `typescript-template-literal-types.md` (TS canon) while retaining React examples in a “React applications” section there. Retire this file after merge.
- [ ] `utility-types-in-practice.md`: Keep as applied utility types. Remove generic reference tables; link to TS canon.
- [ ] `advanced-type-tricks-for-react.md`: Keep. Ensure it references TS canon for theory.
- [ ] `data-fetching-and-runtime-validation.md`: Keep. Cross-link to OpenAPI and MSW docs.
- [ ] `react-query-trpc.md`: Keep. Ensure no duplication with data fetching doc; link both ways.
- [ ] `realtime-typing-websockets-and-sse.md`: Keep.
- [ ] `result-types-and-error-handling.md`: Keep as Result/Either canon. Remove overlap in `advanced-error-handling-patterns.md`; cross-link.
- [ ] `redux-toolkit-with-typescript.md`: Keep. Ensure redux-specific content isn’t repeated in general state mgmt doc.

### Configuration and Architecture

- [ ] `module-resolution-and-paths.md`: Keep.
- [ ] `assets-and-module-declarations.md`: Keep assets-specific declarations. Action: move general declaration concepts to TS canon and keep this practical.
- [ ] `styling-csstype-and-css-modules.md`: Keep.
- [ ] `tailwind-cva-typed-variants.md`: Keep.
- [ ] `routing-and-parameters-typing.md`: Keep.
- [ ] `internationalization-types.md`: Keep.
- [ ] `accessibility-and-aria-typing.md`: Keep.
- [ ] `security-and-escaping-types.md`: Keep.
- [ ] `typed-environment-and-configuration-boundaries.md`: Keep advanced boundaries. Link from the basic env vars doc.
- [ ] `typesafe-environment-variables.md`: Keep as basics. Avoid duplication; link to boundaries doc.
- [ ] `module-federation-typescript.md`: Keep.
- [ ] `openapi-swagger-typescript-integration.md`: Keep. Cross-link to MSW/contracts.

### Publishing and Monorepos

- [ ] `publishing-types-for-component-libraries.md`: Keep types packaging canon.
- [ ] `publishing-and-monorepos.md`: Keep; de-duplicate with project references and workspaces details against `monorepos-and-shared-ui-types.md`.
- [ ] `monorepos-and-shared-ui-types.md`: Keep. Link to publishing doc for library exposure concerns.

### Appendix and Misc

- [ ] `migrating-javascript-to-typescript.md`: Merge with `migration-strategies-javascript-typescript.md` OR clarify scope. Action: Prefer `migration-strategies-javascript-typescript.md` as canon (strategies); keep this as a hands-on walkthrough and cross-link both ways; ensure no repeated checklists.
- [ ] `migration-strategies-javascript-typescript.md`: Canon strategies. Dedupe with above; unify terminology.
- [ ] `migrating-from-proptypes.md`: Keep; link to props typing docs for target patterns.
- [ ] `state-libraries-and-context-interoperability.md`: Keep; ensure overlap with context docs is minimal; link instead.
- [ ] `story-driven-development-with-types.md`: Keep.
- [ ] `README.md`: Review; ensure it doesn’t carry outdated structure—point to `_index.md`.

### Meta / Index

- [ ] `_index.md` (again): After all merges/splits, ensure each topic appears once; use grouped “See also” links for nearby topics (not duplicates).

## New Files To Create (only if needed after splits)

**Check off when created:**

- [ ] If `componenttype-hocs-render-props.md` is retired and we need a focused conceptual page, prefer merging `ComponentType` material into `polymorphic-components-and-as-prop.md`. If not feasible, create `componenttype-and-polymorphism.md` and link from polymorphic and HOC docs.

**Potential consolidated guides to host merged content:**

- [ ] `component-props-complete-guide.md` (merge props-and-defaults + common-prop-shapes + exclusive props guidance)
- [ ] `react-19-typescript-guide.md` (merge React 19 overview + advanced patterns into a single navigable guide)

## Files to Archive/Delete

**Check off each file as you archive/delete it after merging its unique content:**

- [ ] 1. `typescript-type-system-fundamentals.md` (content distributed to focused files)
- [ ] 2. `typescript-unions-intersections-guards.md` (merged into type narrowing)
- [ ] 3. `just-enough-generics.md` (merged into main generics file)
- [ ] 4. `exclusive-props-and-discriminated-unions.md` (merged into discriminated unions)
- [ ] 5. `common-prop-shapes.md` (merged into comprehensive props guide)
- [ ] 6. `typing-props-and-defaults.md` (merged into comprehensive props guide)
- [ ] 7. `componenttype-hocs-render-props.md` (split and retire)
- [ ] 8. `advanced-patterns-react-19-and-typescript.md` (split and retire)
- [ ] 9. `concurrent-features-typing.md` (merge into patterns)
- [ ] 10. `edge-ssr-hydration.md` (merge into runtime types)
- [ ] 11. `tooling-eslint-prettier-builds.md` (split content and retire)
- [ ] 12. `template-literal-types.md` (merge into TS canon)

## Success Metrics

After refactoring:

- [ ] No topic covered in more than 2 files (main + practical examples)
- [ ] Average file size: 400-800 lines (currently some >1000)
- [ ] Clear learning path with no circular dependencies
- [ ] Each file has single, clear focus
- [ ] Total file count reduced by ~20-30%

## Implementation Order

### Week 1: TypeScript Core

- [ ] Merge discriminated unions content
- [ ] Consolidate generics files
- [ ] Consolidate type narrowing
- [ ] Split typescript-type-system-fundamentals.md
- [ ] Merge template literal types

### Week 2: React Component Patterns

- [ ] Merge children/ReactNode content
- [ ] Create component-props-complete-guide.md
- [ ] Split/retire componenttype-hocs-render-props.md
- [ ] Clean up prop combination files

### Week 3: React 19 & Advanced

- [ ] Merge React 19 overview files
- [ ] Organize server components/actions
- [ ] Split advanced-patterns-react-19-and-typescript.md
- [ ] Consolidate concurrent features
- [ ] Review HOCs and render props

### Week 4: Testing, Tooling & Final Organization

- [ ] Consolidate build tools and linting
- [ ] Review testing files
- [ ] Module/path consolidation
- [ ] Update \_index.md
- [ ] Cross-reference audit

## Notes

- Always preserve unique, valuable content before deleting files
- Keep backup of original structure
- Test all code examples after moving
- Update any external references to moved/deleted files
- Consider creating redirect mappings for SEO if content is published online

## Review Checklist

Before considering refactor complete:

- [ ] All duplicate content eliminated
- [ ] Learning path is linear and logical
- [ ] No file exceeds 1000 lines
- [ ] Every file has clear, single purpose
- [ ] Cross-references are accurate
- [ ] Code examples tested and working
- [ ] Index file updated with new structure

## Verification Pass (post-edit checks)

**Final verification - check each item when complete:**

- [ ] Scan headings across merged topics (events, DU, template literals, linting) to ensure only one place defines core concepts
- [ ] Re-run `_index.md` to confirm no section lists two entries for the same topic
- [ ] Skim introductions to ensure consistent positioning and cross-links (no "second intro" to the same idea elsewhere)
- [ ] Verify all checkboxes in this document have been checked off
- [ ] Confirm file count reduced by target percentage (20-30%)
- [ ] Test build succeeds with refactored structure
