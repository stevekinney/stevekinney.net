---
title: Using the TypeSet Doc Block
description:
modified: 2024-09-28T11:31:16-06:00
---

Similar to the [color palettes](color-palette.md) and [icon galleries](icon-gallery.md), Storybook also provides a helpful set of components for rendering your design system's typography.

```tsx
import { Meta, Typeset } from '@storybook/blocks';

<Meta title="Typography" />

<Typeset
  fontSizes={[
    12,
    14,
    16,
    18,
    20,
    24,
    30,
    36,
    48,
    60,
    72,
    96,
    128
  ]}
  fontWeight={400}
  sampleText={"The quick brown fox jumps over the lazy dog."}
  fontFamily={"system-ui, sans-serif"}
/>
```

You'll see something along these lines.

![Storybooks Typeset component rendering a our design system's typography](assets/storybook-typeset-docs-block.png)
