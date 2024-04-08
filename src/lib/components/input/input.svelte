<script lang="ts">
	import clsx from 'clsx';
	import type { InputProps } from './types';

	type $$Props = InputProps;

	export let label: InputProps['label'];
	export let value: InputProps['value'] = undefined;
	export let details: InputProps['details'] = undefined;
	export let required: InputProps['required'] = false;
	export let unlabeled: InputProps['unlabeled'] = false;
	export let placeholder: InputProps['placeholder'] = undefined;
	export let before: InputProps['before'] = undefined;
	export let after: InputProps['after'] = undefined;
	export let prefix: InputProps['prefix'] = undefined;
	export let suffix: InputProps['suffix'] = undefined;
	export let disabled: InputProps['disabled'] = false;
</script>

<div>
	<label class="flex flex-col gap-1.5">
		<span
			class={clsx(
				'inline-flex items-center gap-1 text-sm font-semibold',
				required && 'after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-500',
				unlabeled && 'sr-only',
			)}
		>
			{label}
		</span>
		<div
			class={clsx(
				'flex w-full items-center gap-2 rounded-md px-3 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus-within:bg-primary-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600',
				disabled && 'cursor-not-allowed bg-slate-100',
			)}
		>
			{#if before}
				<svelte:component this={before} class="pointer-events-none h-4 w-4 " aria-hidden="true" />
			{/if}
			{#if prefix}
				<span class="pointer-events-none text-primary-600">
					{prefix}
				</span>
			{/if}
			<input
				bind:value
				class="block w-full bg-transparent focus:outline-none disabled:cursor-not-allowed"
				placeholder={unlabeled ? placeholder || label : placeholder}
				{...$$restProps}
				{disabled}
				on:change
				on:input
				on:focus
				on:invalid
			/>
			{#if suffix}
				<span class="pointer-events-none text-primary-600">
					{suffix}
				</span>
			{/if}
			{#if after}
				<svelte:component this={after} class="pointer-events-none h-4 w-4" aria-hidden="true" />
			{/if}
		</div>
		{#if details}<span class="text-xs text-slate-500">{details}</span>{/if}
	</label>
</div>
