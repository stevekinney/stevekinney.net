<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import clsx from 'clsx';
	import type { InputProps } from './types';
	import Label from '../label';

	type $$Props = InputProps;

	interface Props {
		label: InputProps['label'];
		value?: InputProps['value'];
		details?: InputProps['details'];
		required?: InputProps['required'];
		unlabeled?: InputProps['unlabeled'];
		placeholder?: InputProps['placeholder'];
		before?: InputProps['before'];
		after?: InputProps['after'];
		prefix?: InputProps['prefix'];
		suffix?: InputProps['suffix'];
		disabled?: InputProps['disabled'];
		[key: string]: any;
	}

	let {
		label,
		value = $bindable(undefined),
		details = undefined,
		required = false,
		unlabeled = false,
		placeholder = undefined,
		before = undefined,
		after = undefined,
		prefix = undefined,
		suffix = undefined,
		disabled = false,
		...rest
	}: Props = $props();
</script>

<div>
	<Label {label} {disabled} {required} hidden={unlabeled}>
		<div
			class={clsx(
				'flex w-full items-center gap-2 rounded-md bg-white px-3 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-500 focus-within:bg-primary-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 dark:bg-slate-800 dark:focus-within:bg-slate-700',
				disabled && 'cursor-not-allowed bg-slate-100',
			)}
		>
			{#if before}
				{@const SvelteComponent = before}
				<SvelteComponent
					class="pointer-events-none h-4 w-4 dark:text-slate-400"
					aria-hidden="true"
				/>
			{/if}
			{#if prefix}
				<span class="pointer-events-none text-primary-600 dark:text-primary-400">
					{prefix}
				</span>
			{/if}
			<input
				bind:value
				class="block w-full bg-transparent focus:outline-none disabled:cursor-not-allowed dark:text-white"
				placeholder={unlabeled ? placeholder || label : placeholder}
				{...rest}
				{disabled}
				onchange={bubble('change')}
				oninput={bubble('input')}
				onfocus={bubble('focus')}
				oninvalid={bubble('invalid')}
			/>
			{#if suffix}
				<span class="pointer-events-none text-primary-600 dark:text-primary-400">
					{suffix}
				</span>
			{/if}
			{#if after}
				{@const SvelteComponent_1 = after}
				<SvelteComponent_1
					class="pointer-events-none h-4 w-4 dark:text-slate-400"
					aria-hidden="true"
				/>
			{/if}
		</div>
		{#if details}<span class="text-xs text-slate-500 dark:text-slate-400">{details}</span>{/if}
	</Label>
</div>
