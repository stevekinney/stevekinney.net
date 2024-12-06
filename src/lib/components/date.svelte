<script lang="ts">
	import formatDate from '$lib/format-date';
	import { twMerge as merge } from 'tailwind-merge';

	interface Props {
		date: Date | string;
		as?: keyof HTMLElementTagNameMap;
		class?: string;
	}

	let { date, as = 'time', class: className = '' }: Props = $props();
</script>

<svelte:element this={as} class={merge('text-primary-600 dark:text-primary-400', className)}>
	{formatDate(date)}
</svelte:element>
