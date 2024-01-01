<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';

	import shikiCssVariables, {
		set,
		asInlineStyle,
		toHTML,
		type ShikiCssVariable,
	} from './shiki-css-variables';

	const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
		const target = event.target as HTMLInputElement;
		const name = target.name as ShikiCssVariable;
		const value = target.value;

		set(name, value);
	};
</script>

<div class="grid grid-cols-1 gap-4 lg:grid-cols-2" id="shiki-theme-creator">
	<pre
		class="overflow-x-auto rounded-md p-4"
		style="{$asInlineStyle} background-color: var(--shiki-color-background)">{@html $toHTML}</pre>
	<div class="grid grid-cols-2 items-center gap-4 sm:grid-cols-[max-content_max-content_1fr]">
		{#each Object.entries($shikiCssVariables) as [name, value]}
			<label class="text-nowrap font-mono text-xs" for={name}>{name}</label>
			<p class="text-sm text-gray-500">{value}</p>
			<input
				class="col-span-2 w-full outline-none sm:col-span-1"
				id={name}
				{value}
				{name}
				type="color"
				on:change={handleChange}
			/>
		{/each}
	</div>
</div>
