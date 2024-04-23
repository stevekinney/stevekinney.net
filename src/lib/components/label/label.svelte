<script lang="ts">
	import clsx from 'clsx';

	export let required: boolean = false;
	export let disabled: boolean = false;
	export let hidden: boolean = false;
	export let label: string;
</script>

<label class="flex flex-col gap-1.5">
	<span
		class={clsx(
			'inline-flex items-center gap-1 text-sm font-semibold',
			disabled && 'text-slate-500 dark:text-slate-700',
			required && 'after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-500',
			hidden && 'sr-only',
		)}
	>
		{label}
	</span>
	<slot />
</label>
