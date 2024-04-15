---
title: Forcing Dark Mode
description:
modified: 2024-04-15T08:48:10-06:00
---

Just like I don't want to set arguments by default, sometimes, I want to force a story into dark mode. That's easily done with a Storybook feature called **parameters**.

```tsx
export const Dark: Story = {
	parameters: {
		themes: {
			themeOverride: 'dark',
		},
	},
};
```
