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

  const visualStudioCodeUrl = $derived(
    dev ? `vscode://file${encodeURI(`${__WORKSPACE_ROOT__}/${repositoryPath}`)}` : '',
  );

  const actionClass =
    'decoration-primary-500 font-semibold underline decoration-2 underline-offset-4';
</script>

{#if dev}
  <aside
    class="border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950 mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border-2 px-6 py-3 text-sm"
  >
    <a href={obsidianUrl} class={actionClass}>Open in Obsidian</a>
    <a href={visualStudioCodeUrl} class={actionClass}>Open in Visual Studio Code</a>
    <code class="[overflow-wrap:anywhere] text-slate-600 dark:text-slate-400">
      {repositoryPath}
    </code>
  </aside>
{/if}
