---
title: Enterprise UI
description: >-
  This course teaches senior frontend engineers how to scale applications beyond
  a single-team SPA — covering composition patterns, operational infrastructure,
  and migration strategies.
layout: page
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

This course teaches senior frontend engineers how to scale applications beyond a single-team SPA — covering composition patterns (microfrontends, monorepos, server components), operational infrastructure (TypeScript scaling, architectural linting, CI/CD, testing), and migration strategies (strangler fig, codemods). Students build and evolve a real codebase across nine hands-on exercises, experiencing the trade-offs firsthand so they can make informed architectural decisions for their own organizations.

## Important Things

- [Federation Repository](https://github.com/stevekinney/enterprise-ui-federation)
- [Workshop Repository](https://github.com/stevekinney/enterprise-ui-workshop)

## Day 1 — Architecture Patterns

### Introduction & Framing

Why architecture matters when teams and codebases scale beyond a single SPA.

### Runtime Composition

Module Federation, shared dependency negotiation, cross-boundary state management.

- [Exercise 1: Runtime Composition](/courses/enterprise-ui/runtime-composition-exercise)

### Build-Time Composition

Same product consumed as a monorepo package instead of a federated remote.

- [Exercise 2: Build-Time Composition](/courses/enterprise-ui/build-time-composition-exercise)

### App Shell & Islands Architecture

Conceptual patterns for progressive loading and partial hydration.

### Server Components & Streaming

`renderToPipeableStream`, Suspense boundaries as architectural decisions.

- [Exercise 3: Streaming & Suspense](/courses/enterprise-ui/streaming-and-suspense-exercise)

### Monorepos

pnpm workspaces, Turborepo pipelines, caching, affected-package detection.

- [Exercise 4: Monorepo Setup](/courses/enterprise-ui/monorepo-setup-exercise)

### Backends for Frontends

API layer design, where to draw BFF boundaries across consumers.

### Strangler Fig Introduction

Bridges to Day 2's migration deep-dive.

- [The Strangler Fig Pattern](/courses/enterprise-ui/strangler-fig-introduction)

## Day 2 — Operating & Evolving the Architecture

### Dependency Management

Preventing version drift, synchronization strategies across packages.

- [npm vs pnpm vs Bun: Workspace Package Managers](/courses/enterprise-ui/workspace-package-managers)

### Versioning & Release Management

Changesets, coordinating breaking changes.

### Scaling TypeScript

Project references, composite builds, incremental checking.

- [Scaling TypeScript](/courses/enterprise-ui/scaling-typescript)
- [Exercise 5: TypeScript References](/courses/enterprise-ui/typescript-references-exercise)

### ESLint as Architectural Guardrails

`eslint-plugin-boundaries`, encoding dependency rules in tooling.

- [Exercise 6: Architectural Linting](/courses/enterprise-ui/architectural-linting-exercise)

### Design System Governance

Managing a shared component library at scale.

- [Design System Governance](/courses/enterprise-ui/design-system-governance)

### Performance Budgets

Lighthouse CI, making performance constraints enforceable.

### CI/CD

GitHub Actions with Turborepo caching and matrix parallelization.

- [Exercise 7: CI/CD Pipeline](/courses/enterprise-ui/cicd-pipeline-exercise)

### Testing Strategies

Playwright, MSW mocking, HAR replay for deterministic E2E tests.

- [Exercise 8: Testing Strategies](/courses/enterprise-ui/testing-strategies-exercise)

### API Contract Testing

Where consumer-driven contracts catch what E2E tests miss.

### Observability

Error boundaries as architectural decisions, instrumenting with Sentry.

### Migration Patterns

Strangler fig deep-dive, jscodeshift codemods, incremental adoption.

- [Exercise 9: Strangler Fig & Codemods](/courses/enterprise-ui/strangler-fig-and-codemods-exercise)

### Course Wrap-Up

Architecture Decision Records, synthesizing the two days.
