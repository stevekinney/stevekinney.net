<script lang="ts">
	import { dev } from '$app/environment';
	import { page } from '$app/stores';
	import projectRoot from 'virtual:project-root';
</script>

{#if dev}
	<div class="my-4 flex gap-4 text-xs">
		<a
			href="vscode://file/{projectRoot}/content{$page.url.pathname}.md"
			class="group rounded-md border-2 border-primary-200 bg-primary-100 p-2 decoration-primary-500 shadow-sm dark:border-primary-900 dark:bg-primary-800 dark:text-primary-200"
		>
			Open in <span class="font-semibold group-hover:underline">Visual Studio Code</span>. &rarr;
		</a>
		<a
			href="obsidian://open?value=content&file={$page.url.pathname}"
			class="group rounded-md border-2 border-primary-200 bg-primary-100 p-2 decoration-primary-500 shadow-sm dark:border-primary-900 dark:bg-primary-800 dark:text-primary-200"
		>
			Open in <span class="font-semibold group-hover:underline">Obsidian</span>. &rarr;
		</a>
	</div>
{/if}
