<script lang="ts">
	import Link from './link.svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
	
</script>

<nav class="flex items-center gap-4 {className}">
	<Link href="/writing">Writing</Link>
	<Link href="/courses">Courses</Link>
	<Link href="/tools">Tools</Link>
</nav>
