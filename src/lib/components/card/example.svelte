<script lang="ts">
	import Card from './card.svelte';
</script>

<Card {...$$props}>
	<div class="prose dark:prose-invert">
		<h2>Card Title</h2>
		<p>
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut maximus arcu purus, quis faucibus
			magna pulvinar efficitur. Curabitur tempor lacus sed luctus venenatis. Sed tincidunt volutpat
			enim, sed euismod ligula ornare a. Nam at diam non tellus eleifend efficitur. In a sapien ut
			enim tristique hendrerit. Fusce quis turpis urna. Pellentesque habitant morbi tristique
			senectus et netus et malesuada fames ac turpis egestas. In non sapien efficitur, tincidunt
			mauris quis, aliquam magna.
		</p>
	</div>
</Card>
