import type { Meta, StoryObj } from '@storybook/svelte';
import { Hash, HelpCircle, Info, Check } from 'lucide-svelte';
import Badge from './badge.svelte';

const meta = {
	title: 'Components/Badge',
	component: Badge,
	args: {
		label: 'Badge',
	},
	argTypes: {
		icon: {
			control: 'select',
			options: ['Hash', 'Help', 'Info', 'Check', 'None'],
			mapping: {
				Hash: Hash,
				Help: HelpCircle,
				Info: Info,
				Check: Check,
				None: undefined,
			},
			table: { category: 'Icon' },
		},
		variant: {
			control: 'select',
			options: ['default', 'success', 'warning', 'danger', 'information', 'error'],
		},
		count: {
			control: 'number',
		},
	},
} satisfies Meta<Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
	args: {
		icon: Hash,
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

export const WithCount: Story = {
	args: {
		count: 42,
	},
};

export const WithIconAndCount: Story = {
	args: {
		icon: Info,
		count: 42,
	},
};
