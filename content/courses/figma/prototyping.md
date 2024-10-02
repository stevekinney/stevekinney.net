---
title: Prototyping
description: Prototyping in Figma enables designers to create interactive simulations of their designs, offering a practical tool for testing, feedback, and collaboration.
date: 2024-03-09T14:25:10-05:00
modified: 2024-09-28T11:31:17-06:00
---

Prototyping in Figma transforms static designs into interactive simulations, allowing designers to explore, test, and validate user experiences before any development begins. This allows our designer friends to put together a full flow of the experience and test it with customers before we spend countless hours building something that everyone hates.

## Setting Up Your First Prototype

### Creating Frames and Connections

1. **Start with Frames**: In Figma, your design screens are contained within Frames. Begin by organizing your design into separate frames for each screen of your prototype.
2. **Linking Frames**: Use the Prototype tab in the right sidebar to create connections between frames. Select an object or a frame, then drag the connector (a small circle) to another frame to create an interaction.

### Interactions and Transitions

1. **Adding Interactions**: With frames linked, specify the type of interaction (e.g., click, hover) that triggers the transition.
2. **Choosing Transitions**: Figma offers various transition effects like dissolve, slide, and push. Experiment with these to find the best fit for your prototype's flow.

## Advanced Prototyping Features

### Utilizing Overlays

Overlays allow you to overlay a frame over another without navigating away. Perfect for modals, dropdowns, or any element that appears above the current content.

### Scrolling and Fixed Elements

1. **Enable Scrolling**: To simulate scrolling, wrap your content in a frame and adjust its height to the viewport size. Then, set the content to scroll vertically or horizontally.
2. **Fixing Elements**: Fix elements (e.g., headers) by selecting the layer and using the "Fix position when scrolling" option in the Prototype tab.

### Smart Animate

Smart Animate magically animates transitions between frames that have common elements. Simply name the elements consistently across frames and choose "Smart Animate" as the animation type.

### Interactive Components

Interactive components are reusable elements with predefined states (like buttons with normal, hover, and pressed states). Use variants to create these interactive elements for more dynamic prototypes.

## Best Practices for Prototyping

- **Keep Prototypes Organized**: Label your frames and interactions clearly and utilize Figma’s layers panel to manage the complexity.
- **Embrace Iterative Design**: Use feedback from user testing to refine your prototype iteratively. Prototyping is a cyclical process, and improvements are always around the corner.

## Building a Complete Prototype

Let's apply what we've learned by creating a prototype for a simple mobile app:

1. **Design Your Frames**: Start by designing the key screens of your app. Include a home screen, a search results page, and a details screen.
2. **Link Your Frames**: Use the Prototype tab to drag connectors from buttons or interactive elements on one frame to the corresponding screen.
3. **Add Interactions**: Define the interactions for each linked element. For example, set a tap interaction on a search button to navigate to the search results page.
4. **Implement Overlays and Scrolling**: If your app has a modal or a dropdown menu, create an overlay. Also, enable vertical scrolling for your search results page.
5. **Test and Share**: Preview your prototype using Figma's presentation view, and share it with users or stakeholders for feedback.
