<script lang="ts">
	import { twMerge as merge } from 'tailwind-merge';

	import Link from '$lib/components/link.svelte';
	import Index from '$courses/figma/README.md';
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_fit-content(12rem)]">
	<div>
		<slot />
	</div>
	<Index />
</div>
