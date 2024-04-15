import type { Meta, StoryObj } from '@storybook/svelte';
import { Zap, DollarSign, User, Globe } from 'lucide-svelte';
import Input from './input.svelte';

const meta = {
	title: 'Components/Input',
	component: Input,
	args: {
		label: 'Input Label',
		value: '',
		details: '',
		placeholder: '',
		required: false,
		unlabeled: false,
		disabled: false,
	},
	argTypes: {
		required: {
			control: 'boolean',
		},
		label: {
			control: 'text',
		},
		details: {
			control: 'text',
		},
		value: {
			control: 'text',
		},
		placeholder: {
			control: 'text',
		},
		disabled: {
			control: 'boolean',
		},
		unlabeled: {
			control: 'boolean',
		},
		before: {
			control: 'select',
			options: ['Zap', 'DollarSign', 'User', 'Globe', 'None'],
			mapping: {
				Zap: Zap,
				DollarSign: DollarSign,
				User: User,
				Globe: Globe,
				None: undefined,
			},
			table: { category: 'Icons' },
		},
		after: {
			control: 'select',
			options: ['Zap', 'DollarSign', 'User', 'Globe', 'None'],
			mapping: {
				Zap: Zap,
				DollarSign: DollarSign,
				User: User,
				Globe: Globe,
				None: undefined,
			},
			table: { category: 'Icons' },
		},
		prefix: {
			control: 'text',
		},
		suffix: {
			control: 'text',
		},
	},
} satisfies Meta<Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
	args: {
		required: true,
	},
};

export const WithValue: Story = {
	args: {
		value: 'Value',
	},
};

export const WithPlaceholder: Story = {
	args: {
		placeholder: 'Placeholder',
	},
};

export const WithDetails: Story = {
	args: {
		details: 'Some helpful details about this field.',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const WithHiddenLabel: Story = {
	args: {
		unlabeled: true,
	},
};

export const WithIconBefore: Story = {
	args: {
		before: Zap,
	},
};

export const WithIconAfter: Story = {
	args: {
		after: Zap,
	},
};

export const WithIconBeforeAndAfter: Story = {
	args: {
		before: Zap,
		after: Zap,
	},
};

export const WithPrefix: Story = {
	args: {
		prefix: 'http://',
	},
};

export const WithSuffix: Story = {
	args: {
		suffix: '.com',
	},
};

export const WithPrefixAndSuffix: Story = {
	args: {
		prefix: 'http://',
		suffix: '.com',
	},
};

export const WithPrefixAndSuffixAndIcons: Story = {
	args: {
		prefix: 'http://',
		suffix: '.com',
		before: DollarSign,
		after: Globe,
		placeholder: 'Enter a URL',
	},
};
