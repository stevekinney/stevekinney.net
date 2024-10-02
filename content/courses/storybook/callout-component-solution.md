---
title: Implementing a Calllout Component
description:
modified: 2024-09-28T11:31:16-06:00
---

> [!important] This is the solution for a previous exercise
> You can see the setup for this exercise [here](callout-component-exercise.md)—or, you can just follow along.

## Getting the Variants Set Up

The first thing I'm going to do is fill out he variants since it's pretty easy.

```tsx
const variants = cva(['p-4', 'rounded', 'border', 'shadow-md', 'space-y-4'], {
	variants: {
		type: {
			default: ['bg-slate-200', 'border-slate-500', 'text-slate-900'],
			primary: ['bg-primary-200', 'border-primary-500', 'text-primary-900'],
			information: ['bg-information-200', 'border-information-500', 'text-information-900'],
			success: ['bg-success-200', 'border-success-500', 'text-success-900'],
			warning: ['bg-warning-200', 'border-warning-500', 'text-warning-900'],
			danger: ['bg-danger-200', 'border-danger-500', 'text-danger-900'],
		},
	},
	defaultVariants: {
		type: 'default',
	},
});
```

I do need to pass that information to the component.

```tsx
export const Callout = ({ title, children, type }: CalloutProps) => (
	<div className={variants({ type })}>
		<h2 className="font-semibold">{title}</h2>
		<p>{children}</p>
	</div>
);
```

## Adding Dark Mode Classes

This is arguably more of the same, but I wanted to do a sanity check with the first part before diving in too deep. This is really a game off adding more classes.

```tsx
const variants = cva(['p-4', 'rounded', 'border', 'shadow-md', 'space-y-4'], {
	variants: {
		type: {
			default: [
				'bg-slate-200',
				'border-slate-500',
				'text-slate-900',
				'dark:bg-slate-800',
				'dark:border-slate-900',
				'dark:text-slate-50',
			],
			primary: [
				'bg-primary-200',
				'border-primary-500',
				'text-primary-900',
				'dark:bg-primary-800',
				'dark:border-primary-900',
				'dark:text-primary-50',
			],
			information: [
				'bg-information-200',
				'border-information-500',
				'text-information-900',
				'dark:bg-information-800',
				'dark:border-information-900',
				'dark:text-information-50',
			],
			success: [
				'bg-success-200',
				'border-success-500',
				'text-success-900',
				'dark:bg-success-800',
				'dark:border-success-900',
				'dark:text-success-50',
			],
			warning: [
				'bg-warning-200',
				'border-warning-500',
				'text-warning-900',
				'dark:bg-warning-800',
				'dark:border-warning-900',
				'dark:text-warning-50',
			],
			danger: [
				'bg-danger-200',
				'border-danger-500',
				'text-danger-900',
				'dark:bg-danger-800',
				'dark:border-danger-900',
				'dark:text-danger-50',
			],
		},
	},
	defaultVariants: {
		type: 'default',
	},
});
```

I should now be supporting dark mode out of the box.

## Adding More Stories

I want a story for each of these.

```tsx
export const Default: Story = {};

export const Primary: Story = {
	args: {
		type: 'primary',
	},
};

export const Information: Story = {
	args: {
		type: 'information',
	},
};

export const Success: Story = {
	args: {
		type: 'success',
	},
};

export const Warning: Story = {
	args: {
		type: 'warning',
	},
};

export const Danger: Story = {
	args: {
		type: 'danger',
	},
};
```

## Improving the Stories

I can play around with the [`argTypes`](arg-types.md) to create a nicer experience.

```tsx
const meta = {
	title: 'Components/Callout',
	component: Callout,
	args: {
		title: 'An Important Message',
		children: 'This is a message that you should read.',
	},
	argTypes: {
		title: {
			name: 'Title',
			control: 'text',
			description: 'Title of the callout',
		},
		children: {
			name: 'Content',
			control: 'text',
			description: 'Content of the callout',
		},
		type: {
			name: 'Type',
			control: 'select',
			options: ['default', 'primary', 'information', 'success', 'warning', 'danger'],
			description: 'Type of callout',
			table: {
				defaultValue: {
					summary: 'default',
				},
			},
		},
	},
} satisfies Meta<typeof Callout>;
```

## Bonus Lap: Adding a Documentation Page

In `src/components/callout/callout.mdx`:

```tsx
import {Meta, Stories, Story, Controls} from '@storybook/blocks';
import CalloutStories from './callout.stories';

<Meta of={CalloutStories} />

<Stories />
<Controls />
```
