---
title: Styles Versus Variables
description: Figma styles, variables, and the difference between them.
modified: 2024-09-28T11:31:17-06:00
---

If you're thinking to yourself that there might be some overlap between variables and [styles](styles.md) in Figma, you're definitely in good company.

- Variables allow you to define the CSS output in Dev Mode.
- Variables—particularly the number variables—can be used for defining reusable properties like border widths.
- Variables support modes. Styles do not.
- Variables can only store one value, while styles can store sets of values.
- As of this writing, you can't store things like gradients or image values in variables—you have to use styles. **Note**: support for gradients and images are [coming soon](https://help.figma.com/hc/en-us/articles/4406787442711-Figma-beta-features#Coming_soon).
- As of this writing, you can't do much with [typography](typography.md) when it comes to variables. For that you'll need to use styles. Typography is also [coming soon](https://help.figma.com/hc/en-us/articles/4406787442711-Figma-beta-features#Coming_soon).
- Variables can scoped. Styles can't.

I tend to prefer variables over styles, but I will admit that I occasionally have my doubts and consider whether or not styles might be a better idea.

**Styles can be built on top of variables, but variables can't be built on top of styles.** For stuff like colors, you can compose styles out of variables. So, the two approaches are not necessarily mutually exclusive.
