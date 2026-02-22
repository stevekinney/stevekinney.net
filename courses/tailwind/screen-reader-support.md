---
title: Screen Reader Support
description: >-
  Implement accessibility with Tailwind utilities for screen readers, focus
  indicators, and text selection.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

For elements that need to be present for screen readers but visually hidden, Tailwind offers specific utilities.

### The `sr-only` Utility

The `sr-only` utility positions elements off-screen while keeping them accessible to assistive technologies. Use for labels or descriptive text that provides context for screen reader users but isn't needed for sighted users. The `not-sr-only` utility reverses this, making elements visible again.

## Focus Indicators

Proper focus styling is essential for keyboard navigation, indicating which element is currently interactive.

### Outline Utilities

Browsers provide default outlines on focused elements, but you often need custom styling. Tailwind provides utilities like `outline-2` and `outline-blue-500` to set outline width and color. Apply these using the `focus:` variant.

### `outline-hidden` vs `outline-none`

If you hide the default browser outline, apply your own focus styling for accessibility. The `outline-hidden` utility hides the default outline while preserving it in forced colors mode. The `outline-none` utility explicitly sets `outline-style: none`, completely removing the outline.

### Text Selection and Readability

Text selection utilities (`user-select-none`, `select-text`, `select-all`, `select-auto`) impact user interaction. Text wrapping utilities like `text-balance` (distributes text evenly for headings) and `text-pretty` (prevents orphans) improve readability. Font smoothing utilities (`antialiased`, `subpixel-antialiased`) affect text rendering.

### List Accessibility in Preflight

Tailwind's Preflight base styles remove bullets or numbers from lists by default. For unstyled content that is truly a list, add `role="list"` for VoiceOver accessibility, as unstyled lists aren't announced as lists by default.
