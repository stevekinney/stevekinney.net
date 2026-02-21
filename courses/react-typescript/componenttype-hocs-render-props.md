---
title: 'ComponentType, HOCs, and Render Props'
description: >-
  This content has been split into focused guides on HOCs and render props
  patterns.
date: 2025-09-06T22:23:57.308Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
  - hocs
  - render-props
  - component-type
  - composition
---

> [!NOTE] Content Reorganized
> This content has been split into specialized guides for better focus and clarity.

## For Higher-Order Components

**See: [Higher Order Components Typing](higher-order-components-typing.md)**

Covers:

- Complete HOC typing patterns
- ComponentType usage in HOCs
- Prop injection and omitting
- Common HOC patterns and utilities

## For Render Props Patterns

**See: [Render Props and HOC Alternatives](render-props-and-hoc-alternatives.md)**

Covers:

- Render prop patterns with TypeScript
- Children as functions
- Modern alternatives to HOCs
- Custom hooks vs render props

## Understanding ComponentType

`ComponentType` is a React TypeScript utility that represents any valid React component:

```typescript
type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
```

It's the foundation for:

- Writing functions that accept any component type
- Building HOCs that work with function and class components
- Creating polymorphic component patterns
- Type-safe component composition

Both guides above extensively use `ComponentType` in their examples and patterns.
