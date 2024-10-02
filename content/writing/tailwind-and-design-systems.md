---
title: Positives, Negatives, and Alternatives to Using Tailwind for a Design System
description: Is Tailwind the best choice when building out a design system? It depends.
date: 2024-04-06T16:30:00-06:00
modified: 2024-09-28T11:31:14-06:00
tags:
  - css
  - tailwind
  - design-systems
published: true
---

[Tailwind](https://tailwindcss.com) is great for a lot of reasons. We've been using it at [Temporal](https://temporal.io) for years and we don't regret it—which is basically the highest praise that I can give to any technology that I've used for that kind of length of time.

A fair amount of ink has been spilled as well as to [why you might not want to use Tailwind for a design system](https://sancho.dev/blog/tailwind-and-design-systems). and [plenty more has been spilled about why people love Tailwind](https://mxstbr.com/thoughts/tailwind/). I'll some high-level thoughts to that list as well.

Some negatives to consider:

- **Added dependency**: One negative is that depending on how you bundle your code, you might now have a dependency on Tailwind that consumers of your design system and/or component library might need to navigate.
- **Future-proofing**: Another negative is that you could be worried about future proofing your application and you're worried about long-term support for Tailwind.
- **Legacy constraints**: You might not be able to use Tailwind. Maybe you're working in a large codebase that currently doesn't use Tailwind at all and the prospect of migrating all of your styling to Tailwind seems daunting at best.
- **Too Much flexibility**: The default theme is a bit too flexible and can lead to about as much of a mess as just going for it with vanilla CSS. This one has definitely gotten us the in past. When it's easy to do a one off change, you're more tempted to do it. A corollary to this is that it's a lot easier to map something like Figma variables to CSS variables than to take the extra jump to Tailwind's utility classes. Stuff like4 `p-4` is not as easy to grok as `cozy` or some other semantic token. This is especially true for colors.

Some things that I've learned to appreciate about Tailwind over the years:

- **Utility classes are kind of a good idea**: I originally didn't care for the idea of utility classes and needed to be sold, but over time, I've come to love them. Whenever I try _not_ to use Tailwind, I end up creating my own utility classes for common things. It's nice to get them out of the box.
- **Batteries included**: The inverse of the above point about the added dependencies is that by having Tailwind as a dependency, you're able to leverage all of it's theming with not a lot of extra effort on your part. The only place where you need to be _particularly_ careful is when it comes to colors. But, you _could_ create a Tailwind plugin to go along with your components that can provide the ability to pass in configuration options as well as handle graceful fallbacks when a given color that you rely on isn't defined.
- **Framework agnostic**: A lot of the alternatives that I'm going to list below are React-specific. At the end of the day, Tailwind is just CSS and you can use it with any framework or even share your design system across frameworks.
- **Tree-shaking by default**: Tailwind is smart about stripping out the classes that you don't use, which is something I don't want to have to think about or write tooling for.
- **Easier debugging**: Having that long list of utility classes in the DOM is way easier to navigate than a bunch of opaque CSS classes with hashes for names that you find in a lot of tools like CSS modules. Every time I have to debug an issue, it's a lot easier to just open up the Elements tab in the Chrome Developer Tools and tweak some of the class names than try to reverse engineer what that hashed class name is referring to.
- **Media queries made easy**: Media queries and pseudo states a just a lot easier to work with in Tailwind than doing it by hand. Again, tooling can solve for this, but at what point are you just re-creating Tailwind?

All of the negatives are totally legitimate and can be navigated around with the right tooling and process. But, if—at some fundamental level—you don't care for Tailwind's aesthetic, then what are some of your other options?

- [Chakra UI](https://chakra-ui.com/) is a modular and accessible component library that gives you the building blocks to build React applications with speed, using a simple, prop-based style configuration.
- [Theme UI](https://theme-ui.com/sx-prop): is library for creating themeable user interfaces based on constraint-based design principles, integrating tightly with the Emotion styling library for a seamless design system experience.
- [Rebass](https://github.com/rebassjs/rebass) is a minimalistic and highly customizable React primitive UI components library, built with styled-system to leverage style props for designing.
- [Tamagui](https://tamagui.dev/) is performance-focused UI framework for React Native and the web, designed to bridge the gap between design and development with a focus on animation and theming.
- [Stitches](https://stitches.dev/) is CSS-in-JS library with a focus on performance, zero runtime, and a near-zero learning curve, offering a modern approach to styling React components.
- [Radix](https://www.radix-ui.com/primitives/docs/overview/introduction) is comprehensive UI component library that focuses on accessibility and modularity, providing low-level primitives for building high-quality design systems and web applications.
- [Vanilla Extract](https://vanilla-extract.style/) is a solution for styling in TypeScript and JavaScript, allowing you to write CSS in `.ts` files with type-safe themes and zero runtime.

You're mileage may vary with any of them. I can't really opine with any kind of authority as to what makes them great or terrible as I've mostly stuck with either vanilla CSS—via CSS modules—or Tailwind.
