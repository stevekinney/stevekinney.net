---
title: Customizing the Colors in Our Theme
description:
modified: 2024-09-28T11:31:16-06:00
---

Our design system has it's own color system. Luckily, we can swap out the one included in Tailwind fairly easily. To save you the hassle of putting it together yourself, I included an implementation in `src/tokens/colors.ts` that you can use.

You have two choices here:

1. Extend the color theme included in Tailwind
2. Replace it all together.

I am going to argue that we should replace it so that our fellow developers don't actually use the built-in colors.

Now, we'll just replace the built-in colors in the theme with our bespoke color palette.

```ts
import type { Config } from 'tailwindcss';
import { colors, white, black, transparent, currentColor } from './src/tokens/colors';

export default {
	content: ['./src/**/*.{js,jsx,ts,tsx,mdx,html}'],
	darkMode: ['class', '[data-mode="dark"]'],
	theme: {
		colors: {
			...colors,
			white,
			black,
			transparent,
			currentColor,
		},
	},
	plugins: [],
} satisfies Config;
```

## Integrating Our Theme

There are three ways to use our new Tailwind theme in our component:

1. Use the `theme()` CSS function provided by Tailwind via PostCSS.
2. Use the `@apply` directive provided by Tailwind via PostCSS.
3. Rewrite the component using Tailwind's utility classes.

The third option is probably our best bet—and we'll do that one in a second, but that might be easier said than done in a legacy codebase. So, let's look at the first two.

### Using the Theme Function

Using the first approach, we can go through and replace the values with references to our theme.

```diff
 .button {
   align-items: center;
-  background-color: #8a55c8;
+  background-color: theme('colors.primary.600', #8a55c8);
   border-color: transparent;
   border-radius: 0.25rem;
   border-width: 1px;
```

### Using Apply

Alternatively, we can apply Tailwind's utility classes to our existing classes.

```diff
 .button {
-  align-items: center;
-  background-color: #8a55c8;
-  border-color: transparent;
-  border-radius: 0.25rem;
-  border-width: 1px;
-  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
-  color: white;
-  cursor: pointer;
-  display: inline-flex;
-  font-weight: 600;
-  gap: 0.375rem;
-  padding: 0.375rem 0.625rem;
-  transition: background-color 0.2s;
+  @apply bg-primary-600 inline-flex cursor-pointer items-center gap-1.5 rounded border border-transparent px-2.5 py-1.5 text-white shadow-sm transition-colors;
 }
```
