<script lang="ts">
	import formatDate from '$lib/format-date';
	import { twMerge as merge } from 'tailwind-merge';

	export let date: Date | string;
	export let as: keyof HTMLElementTagNameMap = 'time';

	let className: string = '';
	export { className as class };
</script>

<svelte:element this={as} class={merge('text-primary-600 dark:text-primary-400', className)}>
	{formatDate(date)}
</svelte:element>
