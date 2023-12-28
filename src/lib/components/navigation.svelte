<script lang="ts">
	import { page } from '$app/stores';

	let className: string = '';
	export { className as class };
</script>

<nav class="flex items-center gap-4 {className}">
	<a href="/writing" class:active={$page.url.pathname.startsWith('/writing')}>Writing</a>
	<a href="/courses" class:active={$page.url.pathname.startsWith('/courses')}>Courses</a>
</nav>

<style lang="postcss">
	a {
		@apply font-semibold decoration-black decoration-4 underline-offset-8 hover:text-purple-800 dark:decoration-slate-500 dark:hover:text-purple-300;
	}

	.active {
		@apply text-purple-700 underline dark:text-purple-400;
	}
</style>
