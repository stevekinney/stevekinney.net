<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex flex-col items-center gap-4">
	<h1 class="text-6xl font-bold">{page.status}</h1>
	<p class="text-2xl">{page.error?.message}.</p>
</div>
