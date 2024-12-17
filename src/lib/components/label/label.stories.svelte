<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Hash, HelpCircle, Info, Check } from 'lucide-svelte';
	import Label from './label.svelte';
	import { variants } from '$lib/variants';

	const { Story } = defineMeta({
		title: 'Label',
		component: Label,
		tags: ['autodocs'],
		args: {
			label: 'Label',
			required: false,
			disabled: false,
		},
		argTypes: {
			label: {
				control: 'text',
			},
			required: {
				control: 'boolean',
			},
			disabled: {
				control: 'boolean',
			},
		},
	});
</script>

<Story name="Default" />

<Story name="Required" args={{ required: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="Required and Disabled" args={{ required: true, disabled: true }} />
