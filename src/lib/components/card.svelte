<script lang="ts">
	import formatDate from '$lib/format-date';
	import { twMerge as merge } from 'tailwind-merge';

	export let title: string;
	export let description: string;
	export let url: string;
	export let date: Date | string | undefined = undefined;
	export let as: keyof HTMLElementTagNameMap = 'div';

	let className: string = '';
	export { className as class };
</script>

<a href={url} class="group">
	<svelte:element
		this={as}
		class={merge(
			'rounded-md border-2 border-slate-400 bg-slate-50 p-4 shadow-md transition-colors group-hover:border-slate-500 group-hover:bg-slate-100 sm:h-64 dark:border-slate-700 dark:bg-slate-900 dark:group-hover:bg-slate-900',
			className,
		)}
	>
		{#if date}
			<p class="text-primary-600 dark:text-primary-400 mb-1">{formatDate(date)}</p>
		{/if}

		<div class="space-y-4">
			<h3
				class="decoration-primary-500 dark:text-primary-50 font-semibold decoration-4 underline-offset-4 group-hover:underline"
			>
				{title}
			</h3>
			<p class="line-clamp-6">{description}</p>
		</div>
	</svelte:element>
</a>
