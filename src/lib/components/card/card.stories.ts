import type { Meta, StoryObj } from '@storybook/svelte';
import Card from './card.svelte';
import CardExample from './example.svelte';

const meta = {
	title: 'Components/Card',
	component: Card,
	render: (props) => {
		return { Component: CardExample, props };
	},
} satisfies Meta<Card>;

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
