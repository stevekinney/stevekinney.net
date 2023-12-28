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
		'font-semibold decoration-slate-600 decoration-8 underline-offset-8 hover:text-purple-800 dark:decoration-slate-900 dark:hover:text-purple-200',
		className
	)}
	class:active><slot /></a
>

<style lang="postcss">
	.active {
		@apply underline  dark:text-purple-200;
	}
</style>
