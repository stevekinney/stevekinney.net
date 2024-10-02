---
title: Selecting and Inspecting
description: "Let's look at some of the tools Figma provides for measuring sizes and distances."
modified: 2024-09-28T11:31:17-06:00
date: 2024-03-05T13:04:49-07:00
tags: [figma, course, frontendmasters]
---

Some of the standard tips that we've picked up from most GUIs apply to Figma as well:

- Hold `Shift` to select multiple objects.
- Click and drag on the canvas to create a square that represents the range of objects that you want to select.

![Select multiple layers](assets/figma-drag-to-select-multiple.gif)

**Pro Tip**: Holding the `Command` key will always allow you to drag to select an area even when you might have otherwise ended up clicking on an individual frame.

## Selecting Similar Objects

- Hold down the `Command` key on macOS or the `Control` key on Windows to select the exact element that you’re presently hovering over.
- With an element selected, click on the Inspect tab at the top of the right sidebar.
- Select one of the blue buttons, go to the Figma menu in the upper-left corner, select the Edit menu, and see how you can select similar elements with the same properties.

![Select similar in Figma](assets/figma-select-similar.png)

> [!NOTE]
> One thing to note is that this will select all of the matching object with in the same frame and will _not_ work across frames or for objects that are not inside of a frame.

## Measuring the Distance Between Layers

Select an element on the page and hold down either the `Alt` or `Option` key. As you move your mouse around, you’ll see its relative distance from other objects. This is super useful for when we are trying to implement a design.

![Hold option to measure layers](assets/figma-hold-option-and-measure.gif)

## Selecting and Adjusting Multiple Layers

Drawing objects and giving them fill-sizes and whatnot is pretty straight-forward. But, like most things in our industry, the tricky part comes when you want to refactor or change things at scale.

What would happen if we wanted to change the color of all of the green boxes to another color? Sure, we could select all of the boxes with that color and adjust them—but, that only works for the given page that you’re looking at.

> [!warning] There are better ways to make changes at scale
> Later on, we'll look at [styles](styles.md), [variables](variables.md), and [components](components.md).
