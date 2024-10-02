---
title: Adding a Dark Mode
description: Using variable modes to add a dark mode to a button component in Figma.
modified: 2024-09-28T11:31:17-06:00
---

Let's say we want to add a dark mode theme to our button.

> [!Warning] Variable modes require a being on a paid tier
> Figma modes are not available on their free tier. You can have up to four modes per collection in their professional and organization plans and then up 40 on their enterprise plan.

Let's take our button components from [the previous section](creating-a-button-component.md).

![Figma button variants](assets/figma-button-variants.png)

I don't want to make _even_ more components for a dark theme, but I'd like to be able to change the colors a but when we're in dark mode.

To do this, I'll add an extra mode for my variables.

![Figma variables for dark mode](assets/figma-variables-for-dark-mode.png)

## Inheriting a Mode

The cool thing about modes in Figma is that you can inherit the mode from any parent layer. Once of the things I like to do is to make some containers and then see how the modes change as I move my components around.

Let's make some base variables for the overall theme of our design system.

![Variables for our base layer](assets/figma-base-variable-modes.png)

Next, make a container that uses that color variable as a fill color.

![A container with a variable for the fill color](assets/figma-base-background.png)

For the second copy of the layer, change the mode.

![A second copy of the container in a dark mode](assets/figma-second-copy-mode.png)

And now, your button will inherit the mode of the container.

![Inheriting a mode from variables](assets/figma-inherit-mode-variables.mp4)
