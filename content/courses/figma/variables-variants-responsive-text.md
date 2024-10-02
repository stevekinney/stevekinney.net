---
title: Using Variants and Variables for Responsive Text
modified: 2024-09-28T11:31:17-06:00
description: Patterns for creating reponsive text components in Figma.
---

Let's start with a component that looks something like this:

![Edit variant property](assets/figma-responsive-text-edit-variant-property.png)

In the example above, we have one heading component that has three different variants: One for each size.

Next, we'll set up a variable that has one of three modes: **Phone**, **Tablet**, and **Desktop**. The important part is that there should be a direct mapping from the variable's value in each mode and the name of the variant.

![Size modes using Figma variables](assets/figma-variable-size-modes.png)

Now, here is where the magic happens. Let's treat our initial component as a [base component](base-components.md). You can rename it to **Base Heading** if you want.

Create an instance of your base component and assign the variant to your new variable.

![Bind a variant to a mode](assets/figma-bind-variant-to-variable-mode.png)

Create a component out of that new instance you just created.

![Responsive text using Figma variables](assets/figma-base-heading-and-heading-for-responsive-text.png)

We're not going to use the base component anymore at this point. Just our new **Heading** component. Now, you can set the mode of any parent frame and all of your components will instantly switch to the variant with that name.

![Using Figma modes for responsive text](assets/figma-parent-frame-mode-for-responsive-text.png)
