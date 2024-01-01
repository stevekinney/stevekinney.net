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

<div class="@container not-prose">
	<div class="@2xl:grid-cols-2 grid grid-cols-1 gap-4">
		<pre
			class="select-all overflow-x-auto rounded-md p-4"
			style="{$asInlineStyle} background-color: var(--shiki-color-background)">{@html $toHTML}</pre>
		<div
			class="@sm:grid-cols-[1fr_max-content_max-content] grid grid-cols-[max-content_max-content_max-content] items-center gap-4"
		>
			{#each Object.entries($shikiCssVariables) as [name, value]}
				<label class="text-nowrap font-mono text-xs" for={name}>{name}</label>
				<p class="select-all text-right font-mono text-sm text-gray-500">{value}</p>
				<input id={name} {value} {name} type="color" on:change={handleChange} />
			{/each}
		</div>
	</div>
</div>
