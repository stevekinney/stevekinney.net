<script lang="ts">
	import { page } from '$app/stores';
	import Link from './link.svelte';

	let className: string = '';
	export { className as class };
</script>

<nav class="flex items-center gap-4 {className}">
	<Link href="/writing">Writing</Link>
	<Link href="/courses">Courses</Link>
</nav>
