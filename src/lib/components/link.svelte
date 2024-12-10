<script lang="ts">
	import { page } from '$app/stores';
	import { twMerge as merge } from 'tailwind-merge';
	import type { ExtendElement } from './component.types';

	type Props = ExtendElement<
		'a',
		{
			href: string;
			active?: string;
			exact?: boolean;
		}
	>;

	const {
		href = '#',
		active = 'underline',
		exact = false,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const isActive = $derived(
		exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href),
	);
</script>

<a
	{href}
	class={merge(
		'font-semibold decoration-primary-600 decoration-4 underline-offset-8 hover:text-primary-800 hover:decoration-primary-600 dark:decoration-slate-400  dark:hover:text-primary-200',
		className,
		isActive && active,
	)}
	aria-current={isActive ? 'page' : undefined}
	{...rest}
>
	{@render children?.()}
</a>
