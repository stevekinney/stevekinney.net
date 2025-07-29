---
title: Forcing Dark Mode
description: >-
  Use the force to force Dark Mode™ upond your users regardless of your user's
  system preferences.
modified: 2025-04-16T12:27:20-06:00
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
