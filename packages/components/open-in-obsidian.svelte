<script lang="ts">
  import type { RepositoryPath } from '$lib/repository-path';

  const { repositoryPath }: { repositoryPath: RepositoryPath } = $props();

  const dev = import.meta.env.DEV;

  const obsidianUrl = $derived.by(() => {
    if (repositoryPath.startsWith('writing/')) {
      const file = repositoryPath.slice('writing/'.length);
      return `obsidian://open?vault=${encodeURIComponent('writing')}&file=${encodeURIComponent(file)}`;
    }
    return `obsidian://open?vault=${encodeURIComponent('stevekinney.net')}&file=${encodeURIComponent(repositoryPath)}`;
  });
</script>

{#if dev}
  <aside
    class="border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950 mb-8 rounded-md border-2 px-6 py-3 text-sm"
  >
    <a
      href={obsidianUrl}
      class="decoration-primary-500 font-semibold underline decoration-2 underline-offset-4"
    >
      Open in Obsidian
    </a>
    <span class="ml-2 text-slate-600 dark:text-slate-400">({repositoryPath})</span>
  </aside>
{/if}
