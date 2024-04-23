import type { Meta, StoryObj } from '@storybook/svelte';
import Select from './select.svelte';

const meta = {
	title: 'Components/Select',
	component: Select,
	args: {
		label: 'Select an Option',
		options: [
			{ label: 'Option 1', value: 'option1' },
			{ label: 'Option 2', value: 'option2' },
			{ label: 'Option 3', value: 'option3' },
		],
	},
	argTypes: {
		label: { control: 'text' },
	},
} satisfies Meta<Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
	args: { disabled: true },
};
