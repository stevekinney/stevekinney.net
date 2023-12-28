<script lang="ts">
	import formatDate from '$lib/format-date';

	export let title: string;
	export let description: string;
	export let url: string;
	export let date: Date | string | undefined = undefined;
	export let as: keyof HTMLElementTagNameMap = 'div';
</script>

<a href={url} class="group">
	<svelte:element
		this={as}
		class="rounded-md border-2 border-slate-400 bg-slate-50 p-4 shadow-md transition-colors group-hover:border-slate-500 group-hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:group-hover:bg-slate-900"
	>
		{#if date}
			<p class="text-purple-600 dark:text-purple-400">{formatDate(date)}</p>
		{/if}

		<div class="space-y-4">
			<h3
				class="font-semibold decoration-purple-500 decoration-4 underline-offset-4 group-hover:underline"
			>
				{title}
			</h3>
			<p class="description">{description}</p>
		</div>
	</svelte:element>
</a>
