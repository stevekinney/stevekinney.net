---
title: Forcing Dark Mode
description:
modified: 2024-09-28T11:31:16-06:00
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

As long as we're on the topic, you can also force a viewport:

```tsx
export const Mobile: Story = {
	parameters: {
		viewport: {
			defaultViewport: 'mobile1',
		},
	},
};
```
