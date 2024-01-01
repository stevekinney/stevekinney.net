---
title: Creating Custom Shiki Themes
description: "Let's look at ways to create our own Shiki themes using CSS variables."
published: false
tags:
  - css
  - shiki
date: 2023-12-31T15:56:29-07:00
modified: 2023-12-31T15:59:24-07:00
---

```css
:root {
  --shiki-color-text: #d6deeb;
  --shiki-color-background: #011628;
  --shiki-token-constant: #7fdbca;
  --shiki-token-string: #edc38d;
  --shiki-token-comment: #94a4ad;
  --shiki-token-keyword: #c792e9;
  --shiki-token-parameter: #d6deeb;
  --shiki-token-function: #edc38d;
  --shiki-token-string-expression: #7fdbca;
  --shiki-token-punctuation: #c792e9;
  --shiki-token-link: #79b8ff;
}
```
