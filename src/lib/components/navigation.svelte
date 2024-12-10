<script lang="ts">
	import type { ExtendElement } from './component.types';
	import { twMerge as merge } from 'tailwind-merge';

	import Link from './link.svelte';

	const { class: className = '' }: ExtendElement<'nav'> = $props();
</script>

<nav class={merge('flex items-center gap-4', className)}>
	<Link href="/writing">Writing</Link>
	<Link href="/courses">Courses</Link>
	<Link href="/tools">Tools</Link>
</nav>
