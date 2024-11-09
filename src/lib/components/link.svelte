<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { twMerge as merge } from 'tailwind-merge';

	


	interface Props {
		href: string;
		class?: string;
		active?: string;
		exact?: boolean;
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let {
		href = '#',
		class = '',
		active = 'underline',
		exact = false,
		children,
		...rest
	}: Props = $props();
	

	let isActive =
		$derived(browser && exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href));

	const children_render = $derived(children);
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
	{@render children_render?.()}
</a>
