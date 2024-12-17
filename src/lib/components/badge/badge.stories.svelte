<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Hash, HelpCircle, Info, Check } from 'lucide-svelte';
	import Badge from './badge.svelte';
	import { variants } from '$lib/variants';

	const { Story } = defineMeta({
		title: 'Badge',
		component: Badge,
		tags: ['autodocs'],
		args: {
			label: 'Badge',
			count: undefined,
			icon: undefined,
		},
		argTypes: {
			count: {
				control: 'number',
			},
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
				options: variants,
			},
		},
	});
</script>

<Story name="Default" args={{ variant: 'default' }} />

<Story name="Success" args={{ variant: 'success' }} />

<Story name="Warning" args={{ variant: 'warning' }} />

<Story name="Danger" args={{ variant: 'danger' }} />

<Story name="Information" args={{ variant: 'information' }} />

<Story name="Error" args={{ variant: 'error' }} />

<Story name="With Icon" args={{ variant: 'default', icon: Hash }} />

<Story name="With Count" args={{ variant: 'default', count: 42 }} />

<Story name="With Icon and Count" args={{ variant: 'default', icon: Hash, count: 42 }} />
