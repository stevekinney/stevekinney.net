<script lang="ts">
	import { twMerge as merge } from 'tailwind-merge';

	import Link from '$lib/components/link.svelte';
	import index from './table-of-contents';
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_fit-content(12rem)]">
	<div>
		<slot />
	</div>
	<ul class="space-y-2">
		{#each index as { title, slug, bonus }}
			<li>
				<Link
					href="/courses/figma/{slug}"
					class={merge(
						'decoration-2 underline-offset-2',
						bonus && `before:mr-2 before:decoration-0 before:content-['🎁']`,
					)}
				>
					{title}
				</Link>
			</li>
		{/each}
	</ul>
</div>
