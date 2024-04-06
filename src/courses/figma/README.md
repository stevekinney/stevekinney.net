---
date: 2024-03-23T11:50:59-06:00
modified: 2024-04-03T10:11:54-06:00
exclude: true
---

## Outline

- [Getting Started](getting-started.md)
  - [Aligning Objects](aligning-objects.md)
  - [Layers](layers.md)
  - [Selecting and Inspecting](selecting-and-inspecting.md)
  - Multi-Edit ([Source](https://help.figma.com/hc/en-us/articles/21635177948567-Edit-objects-on-the-canvas-in-bulk))
- Layout
  - [Constraints](constraints.md)
  - [Layout Grids](layout-grids.md)
    - Using Constraints with Grids
  - [Auto Layout](auto-layout.md)
    - Build out a responsive card component
    - Creating a Navigation Bar with Constraints, Layout Grids, and Auto Layout
    - Using Constraints to Visualize Padding
- Reusability
  - [Styles](styles.md)
    - Build out a [typography](typography.md) system
      - Considering Responsive Design
  - [Variables](variables.md)
    - Organizing variables between primitives and tokens
      - [Naming and Taxonomy](variable-taxonomy.md)
      - Building out a color system
    - [Styles Versus Variables](variables.md#styles-versus-variables)
    - [Variable Modes](variable-modes.md): Adding support for dark mode
  - [Components](components.md)
    - Example: Button
  - [Component Properties](component-properties.md) - Example: Button Component - Exercise: Badge/Hash Tag Component
  - [Variants](variants.md)
    - Using a [Base Component](base-components.md)
      - Example: Button Component
      - Exercise: Input Component
    - [Using Variants and Variables for Responsive Text](variables-variants-responsive-text.md)
      - Building Out Padding and Spacing for Buttons
  - Using Instance Swap for Component Slots ([Example](https://www.loom.com/share/611790ab893a4a23b81a43a90697b8f1))
    - Example: Button Icons
  - [Creating a Placeholder Component](placeholder-components.md)
    - Example: Image Preview Component
    - Exercise: Card Component
  - [Cropped Grid Components](cropped-grid-components.md) ([Source](https://www.figma.com/best-practices/component-architecture/#setting-up-the-cropped-grid-components))
    - Example: Data Table Component
    - Exercise: Menu Component
  - Component Recipes
    - Icons
    - Buttons
    - Badges
    - Alerts
    - Inputs
    - Toggle Switches
    - Data Table (Cropped Grid)
    - Menu Slot
- Interaction
  - [Interactive Components](interactive-components.md)
  - [Prototyping](prototyping.md)
- Appendix
  - [Dev Mode](dev-mode.md)
  - Auditing Accessibility
  - Connecting to Storybook ([Source](https://help.figma.com/hc/en-us/articles/360045003494-Storybook-and-Figma))

## Plugins to Investigate

- [Selection Colors](https://www.figma.com/community/plugin/1027413532986522043/selection-variants)
- [Storybook Connect](https://www.figma.com/community/plugin/1056265616080331589/storybook-connect)
- [Figma Plugin for Storybook](https://storybook.js.org/blog/figma-plugin-for-storybook/)
- [Figma for Jira](https://marketplace.atlassian.com/apps/1217865/figma-for-jira?tab=overview&hosting=cloud)
- [Figma for Visual Studio Code](https://www.figma.com/plugin-docs/working-in-dev-mode/#how-to-get-started)

## To Research

- [Figma Developers](https://www.figma.com/developers)
- [Best Practices: Component Architecture](https://www.figma.com/best-practices/component-architecture)
- [Figma Learn: Introduction to Design Systems](https://help.figma.com/hc/en-us/articles/14552901442839-Overview-Introduction-to-design-systems)

## Holocene/Paste Components

- Accordion
- Alert
- Badge
  - Workflow Status
- Breadcrumb
- Callout
- Combobox
  - Chip
- Modal
- Link/Anchor
- Date/Time
  - Date Picker
  - Time Picker
- Button
  - Button Group
- Data Grid
- Input
  - Text
  - Color
  - Range Slider
  - Help Text
  - Radio
    - Radio Button Group
  - Checkbox
    - Checkbox Group
  - Label
  - Select
  - Toggle Switch
  - Text Area
- Icon
- Navigation
- Tabs
- Menu
- Pagination ([Holocene](https://www.figma.com/file/LNN3Cu8Akqb240WmJmbtsS/Holocene?type=design&node-id=3764-152935&mode=design&t=MdK4SpigcC8El3b6-0))
- Sortable List ([Holocene](https://www.figma.com/file/LNN3Cu8Akqb240WmJmbtsS/Holocene?type=design&node-id=2607-30652&mode=design&t=MdK4SpigcC8El3b6-0))
- Popovers
  - Tool Tip
  - Popover
  - Toast
- Table
- Upload ([Holocene](https://www.figma.com/file/LNN3Cu8Akqb240WmJmbtsS/Holocene?type=design&node-id=4168-8598&mode=design&t=MdK4SpigcC8El3b6-0))

## Tasks

```dataview
TASK
FROM "src/courses/figma"
GROUP BY title
```
