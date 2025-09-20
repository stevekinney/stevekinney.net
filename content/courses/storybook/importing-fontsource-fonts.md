---
title: Importing Fonts from Fontsource
description: >-
  Import fonts from Fontsource by installing the specific font package,
  importing it in your CSS or JS file, and adding the import path to your
  project configuration if necessary.
modified: '2025-07-29T15:09:56-06:00'
date: '2024-04-15T08:48:38-06:00'
---

There are lots of ways to include third-party fonts. But, let me tell you about my **favorite**: Just installing them off of npm from [Fontsource](https://fontsource.org).

Our design system is going to use Inter, mostly because that's what we use where I work and I don't hate it. Install the font is as easy as this:

```sh
npm install @fontsource-variable/inter
```

If you're using the example repository, then this part has already been done for you.

Next, in your stylesheet, `index.css`, in our case simply import the dependency. (I am assuming you're using [PostCSS](https://postcss.org/), which comes for free with [Vite](https://vite.dev).)

```css
@import '@fontsource-variable/inter';
```

Now, you can use the font stack in your CSS, but we're using Tailwind, so let's just replace `font-sans` with our new font.

```ts
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx,html}'],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```
