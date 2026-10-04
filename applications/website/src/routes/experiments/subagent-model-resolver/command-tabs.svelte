<script lang="ts">
  import { Copy } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import Button from '$lib/components/button';

  import { commandSets, detectCommandSet } from './commands';
  import type { CommandSet } from './commands';

  type Props = { ready: boolean };

  const { ready }: Props = $props();

  // The server has no `navigator`, so the tab is chosen after mount.
  let selected = $state<CommandSet['id']>('unix');
  let message = $state<string | null>(null);
  let block: HTMLPreElement | undefined = $state();

  onMount(() => {
    selected = detectCommandSet(navigator.platform ?? '');
  });

  const current = $derived(commandSets.find((set) => set.id === selected) ?? commandSets[0]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(current.commands);
      message = 'Copied.';
    } catch {
      if (block) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(block);
        selection?.addRange(range);
      }
      message = 'Press ⌘/Ctrl+C to copy.';
    }
  };
</script>

<div class="space-y-3">
  <div role="group" aria-label="Operating system" class="flex flex-wrap gap-2">
    {#each commandSets as set (set.id)}
      <button
        type="button"
        disabled={!ready}
        aria-pressed={selected === set.id}
        onclick={() => {
          selected = set.id;
          message = null;
        }}
        class="focus-visible:outline-primary-600 aria-pressed:border-primary-600 aria-pressed:bg-primary-50 dark:aria-pressed:bg-primary-950/50 dark:aria-pressed:border-primary-400 cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
      >
        {set.label}
      </button>
    {/each}
  </div>
  <p class="text-sm text-slate-600 dark:text-slate-300">{current.note}</p>
  <pre
    bind:this={block}
    data-testid="commands"
    class="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100"><code
      >{current.commands}</code
    ></pre>
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="secondary" size="small" icon={Copy} disabled={!ready} onclick={copy}>
      Copy
    </Button>
    <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{message}</p>
  </div>
</div>
