<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Zap, HelpCircle, Info, Check } from 'lucide-svelte';
	import Button from './button.svelte';

	const { Story } = defineMeta({
		title: 'Button',
		component: Button,
		tags: ['autodocs'],
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
				options: ['primary', 'secondary', 'destructive', 'ghost'],
			},
			size: {
				control: 'select',
				options: ['small', 'medium', 'large'],
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
		},
	});
</script>

<Story name="Primary" args={{ variant: 'primary' }} />

<Story name="Secondary" args={{ variant: 'secondary' }} />

<Story name="Destructive" args={{ variant: 'destructive' }} />

<Story name="Ghost" args={{ variant: 'ghost' }} />
