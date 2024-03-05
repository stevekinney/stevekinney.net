<script lang="ts">
	import Link from '$lib/components/link.svelte';
	import index from './table-of-contents';
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_fit-content(12rem)]">
	<div>
		<slot />
	</div>
	<ul class="space-y-2">
		{#each index as { title, slug }}
			<li>
				<Link href="/courses/figma/{slug}" class="decoration-2 underline-offset-2">{title}</Link>
			</li>
		{/each}
	</ul>
</div>
