<script lang="ts">
	import { twMerge as merge } from 'tailwind-merge';
	import type { SelectProps } from './types';
	import Label from '../label';

	type $$Props = SelectProps;

	export let label: SelectProps['label'];
	export let options: SelectProps['options'] = [];
	export let disabled: SelectProps['disabled'] = false;
	export let required: SelectProps['required'] = false;
</script>

<div>
	<Label {label} {disabled} {required}>
		<div
			class={merge(
				'rounded-md border-0 bg-white px-4 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-500',
				!disabled &&
					'focus-within:bg-primary-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600',
				disabled && 'cursor-not-allowed bg-slate-100 text-slate-500',
			)}
		>
			<select
				class="w-full bg-transparent outline-none disabled:cursor-not-allowed"
				{required}
				{disabled}
				{...$$restProps}
			>
				<slot>
					<option disabled selected>Select an option...</option>
					{#each options || [] as option}
						<option value={option.value}>{option.label || option.value}</option>
					{/each}
				</slot>
			</select>
		</div>
	</Label>
</div>
