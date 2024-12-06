<script lang="ts">
	import clsx from 'clsx';

	interface Props {
		required?: boolean;
		disabled?: boolean;
		hidden?: boolean;
		label: string;
		children?: import('svelte').Snippet;
	}

	let { required = false, disabled = false, hidden = false, label, children }: Props = $props();
</script>

<label class="flex flex-col gap-1.5">
	<span
		class={clsx(
			'inline-flex items-center gap-1.5 text-sm font-semibold',
			disabled && 'text-slate-500 dark:text-slate-400',
			required && 'after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-500',
			hidden && 'sr-only',
		)}
	>
		{label}
	</span>
	{@render children?.()}
</label>
