---
title: An Alternative Approach to Implementing Dark Mode
description:
modified: 2024-04-17T07:39:30-05:00
---

We do something slightly different. We don't even reference colors at all in our code. Instead, we have semantic colors for elements that reference CSS variables that are switched to different values when in dark mode.

Let's take a look at [this file](https://github.com/temporalio/ui/blob/main/src/lib/theme/plugin.ts).
