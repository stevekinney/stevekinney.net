---
title: Creating a Color Palette from Your Tailwind Theme
description:
modified: 2024-04-15T06:34:56-06:00
---

Instead of referencing Tailwind's default theme, we can look our our Tailwind configuration file. Add the following to `src/colors.mdx`.

```mdx
import config from '../tailwind.config';

## Application Colors

<ColorPalette>
	{Object.entries(config.theme.extend.colors).map(([name, value]) => (
		<ColorItem key={name} title={name} colors={value} />
	))}
</ColorPalette>
```
