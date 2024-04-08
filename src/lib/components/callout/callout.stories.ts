import type { Meta, StoryObj } from '@storybook/svelte';
import Callout from './callout.svelte';
import { variations } from './variations';

const meta = {
	title: 'Components/Callout',
	component: Callout,
	args: {
		description: 'This is a description of the callout.',
		foldable: false,
	},
	argTypes: {
		variant: {
			control: 'select',
			options: variations,
		},
		title: {
			control: 'text',
		},
	},
} satisfies Meta<Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Abstract: Story = {
	args: {
		variant: 'abstract',
	},
};

export const Bug: Story = {
	args: {
		variant: 'bug',
	},
};

export const Danger: Story = {
	args: {
		variant: 'danger',
	},
};

export const Example: Story = {
	args: {
		variant: 'example',
	},
};

export const Failure: Story = {
	args: {
		variant: 'failure',
	},
};

export const Note: Story = {
	args: {
		variant: 'note',
	},
};

export const Info: Story = {
	args: {
		variant: 'info',
	},
};

export const Question: Story = {
	args: {
		variant: 'question',
	},
};

export const Quote: Story = {
	args: {
		variant: 'quote',
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
	},
};

export const Tip: Story = {
	args: {
		variant: 'tip',
	},
};

export const Todo: Story = {
	args: {
		variant: 'todo',
	},
};

export const Warning: Story = {
	args: {
		variant: 'warning',
	},
};

export const WithTitle: Story = {
	args: {
		title: 'An Important Callout',
	},
};

export const WithoutDescription: Story = {
	args: {
		title: 'An Important Callout',
		description: undefined,
	},
};

export const Foldable: Story = {
	args: {
		foldable: true,
	},
};
