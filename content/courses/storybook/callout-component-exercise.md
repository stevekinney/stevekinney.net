---
title: Implementing a Callout Component
description: "Let's build a callout component in Figma."
modified: 2024-09-28T11:31:16-06:00
---

Okay, it's your turn to try this out. Consider this [Callout component](https://www.figma.com/file/Qhb4PJucNK8bgvf4N65Jrm/Anthology?type=design&node-id=2-2372&mode=design). Consider the following. You can choose to ignore the fact that they have different icons if you'd like.

![Callout component designs](assets/callout-component-designs.png)

## Colors

The callout makes use of the following colors from our theme.

| Name                      | Light           | Dark            |
| ------------------------- | --------------- | --------------- |
| **Callout / Primary**     |                 |                 |
| Background                | Primary/200     | Primary/800     |
| Border                    | Primary/500     | Primary/900     |
| Text                      | Primary/900     | Primary/50      |
| **Callout / Information** |                 |                 |
| Background                | Information/200 | Information/800 |
| Border                    | Information/500 | Information/500 |
| Text                      | Information/900 | Information/50  |
| **Callout / Success**     |                 |                 |
| Background                | Success/200     | Success/800     |
| Border                    | Success/500     | Success/900     |
| Text                      | Success/900     | Success/50      |
| **Callout / Warning**     |                 |                 |
| Background                | Warning/200     | Warning/800     |
| Border                    | Warning/500     | Warning/900     |
| Text                      | Warning/900     | Warning/50      |
| **Callout / Danger**      |                 |                 |
| Background                | Danger/200      | Danger/800      |
| Border                    | Danger/500      | Danger/900      |
| Text                      | Danger/900      | Danger/50       |
| **Callout / Default**     |                 |                 |
| Background                | Slate/200       | Slate/800       |
| Border                    | Slate/500       | Slate/900       |
| Text                      | Slate/900       | Slate/50        |

### Other Tasting Notes

- The fonts are the base font, but the title of the callout is semibold.
- The corners are rounded using Tailwind `rounded` class.

## Some Starter Code

Here is some code to get your started if that's helpful. Let's start with the component.

```tsx
import type { PropsWithChildren } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

type CalloutProps = PropsWithChildren<{ title: string }> & VariantProps<typeof variants>;

const variants = cva(['p-4', 'rounded', 'border', 'shadow-md', 'space-y-4']);

export const Callout = ({ title, children }: CalloutProps) => (
	<div className={variants({})}>
		<h2 className="font-semibold">{title}</h2>
		<p>{children}</p>
	</div>
);
```

And now for the story (ideally in `src/components/callout/callout.stores.tsx`):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Callout } from './callout';

const meta = {
	title: 'Components/Callout',
	component: Callout,
	args: {
		title: 'An Important Message',
		children: 'This is a message that you should read.',
	},
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof Callout>;

export const Default: Story = {};
```

> [!success] Solution
> Once you've gotten a chance to implement this component and write a story, we'll take a look at a possible solution [here](callout-component-solution.md).
