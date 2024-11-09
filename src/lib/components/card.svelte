<script lang="ts">
	import formatDate from '$lib/format-date';
	import { twMerge as merge } from 'tailwind-merge';


	interface Props {
		title: string;
		description: string;
		url: string;
		date?: Date | string | undefined;
		as?: keyof HTMLElementTagNameMap;
		class?: string;
	}

	let {
		title,
		description,
		url,
		date = undefined,
		as = 'div',
		class: className = ''
	}: Props = $props();
	
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
			<p class="mb-1 text-primary-600 dark:text-primary-400">{formatDate(date)}</p>
		{/if}

		<div class="space-y-4">
			<h3
				class="font-semibold decoration-primary-500 decoration-2 underline-offset-4 group-hover:underline dark:text-primary-50"
			>
				{title}
			</h3>
			<p class="line-clamp-4">{description}</p>
		</div>
	</svelte:element>
</a>
