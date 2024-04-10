<script lang="ts">
	import type { SelectProps } from './types';

	export let label: SelectProps['label'];
	export let options: SelectProps['options'] = undefined;
</script>

<div>
	<label class="flex flex-col gap-1.5">
		<span class="inline-flex items-center gap-1 text-sm font-semibold">
			{label}
		</span>
		<select
			class="rounded-md border-0 bg-white px-3 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-500 focus-within:bg-primary-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600"
			{...$$restProps}
		>
			<slot>
				<option disabled selected>Select an option...</option>
				{#each options || [] as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</slot>
		</select>
	</label>
</div>
