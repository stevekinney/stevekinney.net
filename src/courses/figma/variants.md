---
title: Variants
description: Streamline design with Figma variants, combining multiple component iterations for simplicity and consistency. Enhance efficiency and collaboration in your projects.
drafted: true
figma: false
date: 2024-03-09T14:21:25-05:00
modified: 2024-03-24T16:38:18-06:00
tags:
  - figma
  - course
  - frontendmasters
---

![](../../assets/figma-loki-variants.jpg)

We all know that there usually isn't just *one* button. Buttons come in lots of shapes and sizes.

Figma's Variants feature is a handy tool for handling different versions of components. It groups variations together, making it easier to pick the right one. Creating Variants in Figma is simple - just select and combine components. The benefits of using Variants include keeping things organized and making quick changes. They also help ensure that designs stay consistent and boost teamwork. To get the most out of Variants, make sure to keep properties clear, simple, and choose wisely. Using Variants in Figma encourages good design practices, which can enhance accessibility, usability, and design clarity. By making use of Variants, designers can work more efficiently and create designs that flow together seamlessly. This not only benefits individual designers but also improves teamwork, resulting in better user experiences, no matter the size of the project.

## What Are Variants?

You don't want to have a million versions of the button component. You want one button (or so buttons) and the ability to toggle between their various—umm—variants.

Variants reduce clutter by housing related components together. They streamline the process of applying consistent changes and make it easier to experiment with different component states or styles.

1. **Simplified Organization:** By consolidating related components, variants reduce clutter in your Assets panel, facilitating easier and quicker access.
2. **Efficient Iterations:** Variants allow for rapid testing of different component states or styles within your designs, promoting a more dynamic and fluid iteration process.
3. **Consistency Across Designs:** Variants help maintain a cohesive design language across your project by ensuring consistent usage of different component versions.
4. **Enhanced Collaboration:** For teams, variants offer clear, organized options for different component states or styles, improving the usability of design systems.

## Creating and Using Variants

### Adding a Variant to a Component

The easiest way to do this is similar to what we saw using [Component Properties](component-properties.md).

![](../../assets/figma-variant-component-property.png)

You're variants are effectively key/value stores. They all need to have the same names for the given nature of the variant and then you can have a bunch of names for actual iterations.

![A default and small variant of the badge component](../../assets/figna-variant-example.png)

I won't bore you with the implementation details of each component. But, you can take a lucky guess. The "Small" variant has reduced padding and a slightly smaller font size.

![](../../assets/figma-variant-example.gif)
### Creating Variants for Existing Components

Consider this collection of random icons. I want to create an **Icon** component with a bunch of different variants.

![Icons that we want to turn into variants](../../assets/figma-collection-of-icons.png)

I can do this as follows:

1. Turn each item into a component.
2. Select the components you wish to group as variants.
3. Right-click and select “Combine as Variants”.
4. Figma will place your components into a new frame, turning them into variants.
5. Give your new property a name.
6. Name the new composite component appropriately.

![](../../assets/figma-creating-variants-from-components.gif)

#### Streamlining Variant Creation with Names

If you really want to show off, you can cut at least one tiny step out of this whole process by naming your variants as follows: `Property=Value`. This will give them all the correct variant property name instead of `Property 1` or whatever.


## Swapping Variants with the Instance Swap Component Property

![](../../assets/figma-button-with-icon.png)

Consider this button that has an icon. Let's say that we wanted to allow the consumer of this button swap out the icon for another icon—but *only* another icon. How would we do this?

As long as the Icon is a component, we can use the "Expose properties from Nested Instances" option to surface the variants of the Icon up to the top.

![](../../assets/CleanShot%202024-03-24%20at%2016.59.39@2x.png)

Now, when we have an instance of the component, we can easily switch between variants of the underlying components.

![](../../assets/figma-switch-between-nested-variants.gif)

### Conditional Nested Variants

For extra fun, you can combine the above technique with [component-properties](component-properties.md#Boolean%20Properties) to conditionally show the nested variant.

![](../../assets/figma-boolean-properties-with-nested-variants.gif)
