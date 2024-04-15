import type { Meta, StoryObj } from '@storybook/svelte';
import Count from './count.svelte';

const meta = {
	title: 'Components/Count',
	component: Count,
	args: {
		variant: 'default',
		count: 42,
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'success', 'warning', 'danger', 'information', 'error'],
		},
		count: {
			control: 'number',
		},
	},
} satisfies Meta<Count>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
	args: {
		variant: 'primary',
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
	},
};

export const Warning: Story = {
	args: {
		variant: 'warning',
	},
};

export const Danger: Story = {
	args: {
		variant: 'danger',
	},
};

export const Information: Story = {
	args: {
		variant: 'information',
	},
};

export const Error: Story = {
	args: {
		variant: 'error',
	},
};
