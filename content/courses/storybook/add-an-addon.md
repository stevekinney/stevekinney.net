---
title: Add an Addon to Storybook
description: >-
  If you need to manually add an addon in Storybook, you can follow these steps
  to get going.
modified: '2025-07-29T15:09:56-06:00'
date: '2024-04-15T06:28:51-06:00'
---

If you need to manually add an addon in Storybook, you can follow these steps to get going. First, we'll need to install the addon in question.

```sh
 npm i -D @storybook/addon-themes
```

Next, we'll pop over to `.storybook/main.ts` and add it to the array of addons.

```diff
diff --git a/.storybook/main.ts b/.storybook/main.ts
index 098b7b7..63965e0 100644
--- a/.storybook/main.ts
+++ b/.storybook/main.ts
@@ -8,6 +8,7 @@ const config: StorybookConfig = {
     '@storybook/addon-essentials',
     '@chromatic-com/storybook',
     '@storybook/addon-interactions',
+    '@storybook/addon-themes',
   ],
   framework: {
     name: '@storybook/react-vite',
```
