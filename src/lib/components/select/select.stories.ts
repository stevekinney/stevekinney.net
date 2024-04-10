import type { Meta, StoryObj } from '@storybook/svelte';
import Select from './select.svelte';

const meta = {
	title: 'Components/Select',
	component: Select,
	args: {
		label: 'Select an Option',
	},
	argTypes: {
		label: { control: 'text' },
	},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};
