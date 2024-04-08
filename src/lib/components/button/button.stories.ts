import type { Meta, StoryObj } from '@storybook/svelte';
import { Zap, HelpCircle, Info, Check } from 'lucide-svelte';
import Button from './button.svelte';

import { within, expect } from '@storybook/test';

const meta = {
	title: 'Components/Button',
	component: Button,
	args: {
		label: 'Button',
		variant: 'primary',
		size: 'medium',
		disabled: false,
		loading: false,
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['primary', 'secondary', 'destructive'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large', 'extra-large'],
		},
		disabled: {
			control: 'boolean',
		},
		loading: {
			control: 'boolean',
		},
		icon: {
			control: 'select',
			options: ['Zap', 'Help', 'Info', 'Check', 'None'],
			mapping: {
				Zap: Zap,
				Help: HelpCircle,
				Info: Info,
				Check: Check,
				None: undefined,
			},
			table: { category: 'Icon' },
		},
		iconPosition: {
			control: 'select',
			options: ['left', 'right'],
			if: { arg: 'icon' },
			table: { category: 'Icon' },
		},
	},
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: {
		variant: 'primary',
	},
	play: ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');

		expect(button.tagName).toBe('BUTTON');
	},
};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
	},
};

export const Destructive: Story = {
	args: {
		variant: 'destructive',
	},
};

export const Ghost: Story = {
	args: {
		variant: 'ghost',
	},
};

export const PrimaryDisabled: Story = {
	args: {
		variant: 'primary',
		disabled: true,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');

		expect(button).toBeDisabled();
	},
};

export const SecondaryDisabled: Story = {
	args: {
		variant: 'secondary',
		disabled: true,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');

		expect(button).toBeDisabled();
	},
};

export const DestructiveDisabled: Story = {
	args: {
		variant: 'destructive',
		disabled: true,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');

		expect(button).toBeDisabled();
	},
};

export const GhostDisabled: Story = {
	args: {
		variant: 'ghost',
		disabled: true,
	},
};

export const Small: Story = {
	args: {
		size: 'small',
	},
};

export const Medium: Story = {
	args: {
		size: 'medium',
	},
};

export const Large: Story = {
	args: {
		size: 'large',
	},
};

export const PrimaryWithIcon: Story = {
	args: {
		icon: Zap,
	},
};

export const SecondaryWithIcon: Story = {
	args: {
		variant: 'secondary',
		icon: Zap,
	},
};

export const DestructiveWithIcon: Story = {
	args: {
		variant: 'destructive',
		icon: Zap,
	},
};

export const GhostWithIcon: Story = {
	args: {
		variant: 'ghost',
		icon: Zap,
	},
};

export const SmallWithIcon: Story = {
	args: {
		variant: 'primary',
		icon: Zap,
		size: 'small',
	},
};

export const LargeWithIcon: Story = {
	args: {
		variant: 'primary',
		icon: Zap,
		size: 'large',
	},
};

export const IconPositionRight: Story = {
	args: {
		variant: 'primary',
		icon: Zap,
		iconPosition: 'right',
	},
};

export const ButtonAsLink: Story = {
	args: {
		href: 'https://example.com',
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = await canvas.findByText('Button');

		expect(button.tagName).toBe('A');
		expect(button).toHaveRole('link');
		expect(button).toHaveAttribute('href', 'https://example.com');
	},
};
