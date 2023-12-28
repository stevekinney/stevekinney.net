<script lang="ts">
	import formatDate from '$lib/format-date';

	export let date: Date | string;
</script>

<p class="text-purple-600 dark:text-purple-400">{formatDate(date)}</p>
