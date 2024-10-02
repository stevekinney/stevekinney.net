---
title: Components Properties
description: Leverage Figma components for scalable and efficient design. Create, reuse, and manage elements easily for consistency and collaboration across projects.
date: 2024-03-09T14:21:18-05:00
modified: 2024-09-28T11:31:17-06:00
tags:
  - figma
  - course
  - frontendmasters
---

In Figma, there are four types of component properties:

- [Variants](variants.md)
- [Boolean](#boolean-properties)
- [Instance Swap](#simplifying-component-instances)
- [Text](#text-properties)

> [!note] Component Properties vs. Variables
> It's easy to get confused between component properties and variables. For me, it's helpful to think about component properties as the prop that you might pass into a component and use locally verses some globally stored variable.

## Boolean Properties

Boolean properties to set `true` and `false` values. This allows us to toggle an attribute on or off. Let's say we had a badge component and we wanted to add the ability to add a hash tag to the badge—and we wanted it to be something that we could toggle on and off.

![An example badge and hash tag component](assets/figma-badge-component.png)

We can start by creating a boolean component property from the **Properties** on the left panel.

![Create a new component property](assets/figma-create-component-property.png)

And from there, we can give it a default value of—you guessed it—either `true` or `false` along with a convenient name for the property.

![Properties when creating a new component in Figma](assets/figma-component-property-settings.png)

Then we can navigate to the layer that want trigger with this property and link it it's visibility to the component property.

![Link the visibility of a layer to a component property](assets/figma-visibility-based-on-component-property.png)

Now, when we use an instance of that component, we'll see that we have the ability to toggle the component property on and off.

![Triggering the visibility of a layer on and off based on a component property](assets/figma-component-property-on-instance.gif)

## Text Properties

We can also create component properties that have a text value. There are two main reasons why you might consider using this:

1. You want to easily change the text in a given component without needing to dive into the components layers.
2. You want to use the same piece of text in multiple places.

The first reason is probably the most common, but the second reason might become handy if you're looking to get a little fancy with the given variants of your component and want to use the same label in more than one place.

![Text property for components](assets/figma-component-property-text.png)

We can then set the value of any text field to this property in the **Text** panel.

![Setting a text property on a component](assets/figma-setting-a-text-property.png)

Now, you can easily change the value of the text property just by clicking the instance of the component.

![Changing a text component property](assets/figma-component-property-change-label.gif)

## Instance Swap

The **instance swap** property allows you to swap out a given component with another one. When you define this property, you set select a default instance value. You can also define some preferences for the other components that you're interested in swapping between.

These **preferred values** allow you to create define a set of components that you want to swpa between. If this sounds kind of like [variants](variants.md), you're not wrong. I typically use a combination of the two approaches when I am creating a components for a design.

> [!tip] Variants vs. Instance Swap
> Your mileage may vary and you're welcome to disagree with me, but I will typically make [variants](variants.md) for all of the different states of a button (e.g. hover, active, disabled. etc.). But, I'll make different components for each type of button (e.g. primary, secondary, ghost, etc.). This allows me to swap between the states with [variants](variants.md) when [prototyping](prototyping.md) and but easily [instance swap](#instance-swap) between the types when designing. Shoving _everything_ into variants tends to make organization a mess.

## Simplifying Component Instances

If you want to hide away most of the complexities of a component away from anyone using it, then you can go to the main component and select "Simplify all instances". This will reduce the number of knobs that someone gets to (or, has to) fiddle and allows you to keep things _simple_.

> [!NOTE] Simplifying Won't Protect You
> Simplifying an instance will hide layers, but **anyone with the ability to edit** the design file will still be able to edit those layers.

![Simplifying component instances](assets/figma-simplify-component-instance.gif)

Next let's talk about [Variants](variants.md).
