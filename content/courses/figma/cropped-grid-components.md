---
date: 2024-03-28T13:06:40-06:00
modified: 2024-09-28T11:31:17-06:00
title: Cropped Grid Components
description: Using the cropped grid pattern for dynamically displaying content in Figma components.
---

As we learned with [components](components.md) and dug into a little bit with [placeholder components](placeholder-components.md), components can't take what slotted children but we can do a one-for-one swap. But what if we want to swap in more than one component? One trick we can use is called **cropped grid components**.

> [!tldr] TL;DR
> The short version is that a cropped grid component is just a component that holds more than one of the same component and then we just only make it big enough to show the number we need—**cropping** out the the rest.
>
> Yes, it feels like a hack, but it's [an officially sanctioned thing](https://www.figma.com/best-practices/component-architecture/#setting-up-the-cropped-grid-components). I don't make the rules around here.

We're going to set up a frame to serve as out checklist component. And then fill it up with more stuff—in this case, the **Checklist Item** component that we made in [previous section](building-a-checkbox-component.md)—than we need.

1. Create an empty frame.
2. Drag in one **Checklist Item** component.
3. Duplicate it multiple times.
4. Set the constraints to have it move along the top and then the center of the parent.
