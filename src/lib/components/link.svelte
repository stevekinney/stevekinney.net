<script lang="ts">
	import { page } from '$app/stores';
	import { twMerge as merge } from 'tailwind-merge';

	interface $$Props extends Partial<HTMLLinkElement> {
		href: string;
		class?: string;
	}

	export let href: string = '#';

	let className: string = '';
	export { className as class };

	$: active = $page.url.pathname.startsWith(href);
</script>

<a
	{href}
	class={merge(
		'font-semibold decoration-primary-600 decoration-4 underline-offset-8 hover:text-primary-800 hover:decoration-slate-600 dark:decoration-slate-400  dark:hover:text-primary-200',
		className,
	)}
	class:underline={active}
	aria-current={active ? 'page' : undefined}
	{...$$restProps}
>
	<slot />
</a>
