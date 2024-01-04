<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';
	import CodeSamples from './code-samples.md';

	export let withCodeSamples = false;

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

<div class="not-prose @container">
	<div class="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
		<pre
			class="select-all overflow-x-auto rounded-md p-4"
			style="{$asInlineStyle} background-color: var(--shiki-color-background)">{@html $toHTML}</pre>
		<div
			class="grid grid-cols-[max-content_max-content_max-content] items-center gap-4 @sm:grid-cols-[1fr_max-content_max-content]"
		>
			{#each Object.entries($shikiCssVariables) as [name, value]}
				<label class="text-nowrap font-mono text-xs" for={name}>{name}</label>
				<p class="select-all text-right font-mono text-sm text-gray-500">{value}</p>
				<input id={name} {value} {name} type="color" on:change={handleChange} />
			{/each}
		</div>
	</div>
	{#if withCodeSamples}
		<CodeSamples
			--shiki-color-text={$shikiCssVariables['--shiki-color-text']}
			--shiki-color-background={$shikiCssVariables['--shiki-color-background']}
			--shiki-token-constant={$shikiCssVariables['--shiki-token-constant']}
			--shiki-token-string={$shikiCssVariables['--shiki-token-string']}
			--shiki-token-comment={$shikiCssVariables['--shiki-token-comment']}
			--shiki-token-keyword={$shikiCssVariables['--shiki-token-keyword']}
			--shiki-token-parameter={$shikiCssVariables['--shiki-token-parameter']}
			--shiki-token-function={$shikiCssVariables['--shiki-token-function']}
			--shiki-token-string-expression={$shikiCssVariables['--shiki-token-string-expression']}
			--shiki-token-punctuation={$shikiCssVariables['--shiki-token-punctuation']}
			--shiki-token-link={$shikiCssVariables['--shiki-token-link']}
		/>
	{/if}
</div>
