<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { twMerge as merge } from 'tailwind-merge';

	interface $$Props extends Partial<HTMLLinkElement> {
		href: string;
		class?: string;
		active?: string;
		exact?: boolean;
	}

	export let href: string = '#';
	export let active: string = 'underline';
	export let exact: boolean = false;

	let className: string = '';
	export { className as class };

	$: isActive =
		browser && exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href);
</script>

<a
	{href}
	class={merge(
		'font-semibold decoration-primary-600 decoration-4 underline-offset-8 hover:text-primary-800 hover:decoration-slate-600 dark:decoration-slate-400  dark:hover:text-primary-200',
		className,
		isActive && active,
	)}
	aria-current={isActive ? 'page' : undefined}
	{...$$restProps}
>
	<slot />
</a>
