---
modified: 2024-09-28T11:31:16-06:00
title: Parameters
description:
---

Parameters are a set of static, named metadata about a story, used to control the behavior or appearance of components within Storybook. They can be set globally to affect all stories or locally to affect individual stories.

Storybook doesn't do a lot with parameters out of the box, but they're particularly helpful when working with addons. You can define parameters at a bunch of different levels:

- `.storybook/preview.ts`: These parameters are globally available to all stories.
- In the `Meta` for a set of stories.
- Scoped to a particular story.

Along the way, parameter objects are merged, so your individual stories will inherit parameters defined at a higher level, but they can also override those parameters if needed.

The important part here is that parameters can be accessed by [decorators](decorators.md) and controlled using
addons. This allows for a ton of flexibility for adding custom functionality to control your stories.
