<script lang="ts">
  import { Eye } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { vectors } from './vectors';
  import type { Vector } from './vectors';

  type Props = { ready: boolean; onShow: (vector: Vector) => void };

  const { ready, onShow }: Props = $props();
</script>

<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="vectors">
  {#each vectors as vector (vector.id)}
    <li
      class="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      data-vector={vector.id}
    >
      <h3 class="font-bold text-slate-900 dark:text-white">{vector.title}</h3>
      <p class="text-sm text-slate-700 dark:text-slate-200">{vector.body}</p>
      {#if vector.citation}
        <p class="text-sm text-slate-700 dark:text-slate-200">
          {vector.citation.text}
          <span class="block text-xs text-slate-500 dark:text-slate-400">
            Source:
            <a
              href={vector.citation.href}
              class="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
              >{vector.citation.source}</a
            >
          </span>
        </p>
      {/if}
      <div class="mt-auto">
        <Button
          variant="secondary"
          size="small"
          icon={Eye}
          disabled={!ready}
          aria-label="Show me: {vector.title}"
          onclick={() => onShow(vector)}
        >
          Show me
        </Button>
      </div>
    </li>
  {/each}
</ul>
