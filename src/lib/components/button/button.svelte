<!-- @migration-task Error while migrating Svelte code: $$props is used together with named props in a way that cannot be automatically migrated. -->
<script lang="ts">
	import clsx from 'clsx';
	import { LoaderCircle as Loading } from 'lucide-svelte';
	import { twMerge as merge } from 'tailwind-merge';
	import { variants } from './variants';
	import type { ButtonProps } from './types';

	type $$Props = ButtonProps;

	export let label = '';
	export let variant: ButtonProps['variant'] = 'primary';
	export let size: ButtonProps['size'] = 'medium';
	export let icon: ButtonProps['icon'] = undefined;
	export let iconPosition: ButtonProps['iconPosition'] = 'left';
	export let href: string | undefined = undefined;
	export let loading: boolean = false;
	export let full: boolean = false;

	let className: string = '';
	export { className as class };
</script>

<svelte:element
	this={href ? 'a' : 'button'}
	role={href ? 'link' : 'button'}
	{href}
	tabindex={$$props.tabindex ?? 0}
	class={merge(variants({ variant, size, iconPosition }), full && 'w-full', className)}
	{...$$restProps}
	on:click
	on:keydown
>
	{#if icon || loading}
		<svelte:component
			this={loading ? Loading : icon}
			class={clsx('h-4 w-4', loading && 'animate-spin')}
			aria-hidden="true"
		/>
	{/if}
	<slot>{label}</slot>
</svelte:element>
