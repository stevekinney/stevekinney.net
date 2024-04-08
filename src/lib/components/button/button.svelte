<script lang="ts">
	import clsx from 'clsx';
	import { LoaderCircle as Loading } from 'lucide-svelte';
	import { variants } from './variants';
	import type { ButtonProps } from './types';

	type $$Props = ButtonProps;

	export let label = 'Button';
	export let variant: ButtonProps['variant'] = 'primary';
	export let size: ButtonProps['size'] = 'medium';
	export let icon: ButtonProps['icon'] = undefined;
	export let iconPosition: ButtonProps['iconPosition'] = 'left';
	export let href: string | undefined = undefined;
	export let loading: boolean = false;
</script>

<svelte:element
	this={href ? 'a' : 'button'}
	role={href ? 'link' : 'button'}
	{href}
	tabindex={$$props.tabindex ?? 0}
	class={variants({ variant, size, iconPosition })}
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
