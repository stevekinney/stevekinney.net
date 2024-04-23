import type { Meta, StoryObj } from '@storybook/svelte';
import Label from './label.svelte';

const meta = {
	title: 'Components/Label',
	component: Label,
	args: {
		label: 'Label',
		required: false,
		disabled: false,
		hidden: false,
	},
	argTypes: {
		label: { control: 'text' },
	},
} satisfies Meta<Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
	args: { required: true },
};

export const Disabled: Story = {
	args: { disabled: true },
};
