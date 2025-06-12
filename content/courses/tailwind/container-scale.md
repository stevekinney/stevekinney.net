---
title: Container Scale
description: Understanding Tailwind's container scale for fixed width values, container queries, and responsive design utilities
---

Tailwind's **container scale** is a set of predefined fixed width values used for sizing and layout utilities. This scale is managed via native CSS variables in the `@theme` directive, under the `--container-*` namespace.

1.  **What it Represents:** The container scale offers standard width values, often matching common breakpoint sizes or fixed container widths. It's different from the general [spacing scale](spacing-scale.md) (`--spacing`) used for padding, margin, etc.

2.  **Utilities Using the Container Scale:**

    - **`columns`**: `columns-xs` to `columns-7xl` use `--container-*` values for ideal column width.
    - **`flex-basis`**: `basis-xs` to `basis-7xl` use `--container-*` values for initial flex item size.
    - **`max-width`**: `max-w-xs` to `max-w-7xl` use `--container-*` values for maximum element width.
    - **`min-width`**: `min-w-xs` to `min-w-7xl` use `--container-*` values for minimum element width.
    - **Container Query Ranges**: `--container-*` theme variables also define sizes for container query variants (e.g., `@sm`, `@md`), styling elements based on their parent container's size.

3.  **Default Values:** The scale ranges from `3xs` (16rem/256px) to `7xl` (80rem/1280px), typically using rem values.

4.  **Customization in Tailwind 4:**

    - Customize the container scale in your main CSS file using the `@theme` directive.
    - Define or override values in the `--container-*` namespace within `@theme`.
    - Example: Add `4xs` or override `7xl`. This enables utilities like `columns-4xs` and container query variants.
    - All theme values, including the container scale, become CSS variables (e.g., `var(--container-...)`) usable in custom CSS.

5.  **Relationship to `container` Utility:** The `container` utility is a pre-configured `max-width` utility setting an element's `max-width` to the current breakpoint's `min-width`. It doesn't auto-center or add padding; use `mx-auto` and `px-<number>` for that. In Tailwind 4, `container` utility options like `center` and `padding` are removed; customize it using the `@utility` directive. This is separate from the broader "container scale."

In short, the container scale (`--container-*` CSS variables) provides fixed sizes for utilities like `columns`, `flex-basis`, `min-width`, `max-width`, and container query definitions. Customize it in Tailwind 4 CSS via `@theme`.
