<script lang="ts">
  type Props = {
    /** Text where `backticks` mark code. It's rendered as text, never as HTML. */
    text: string;
  };

  const { text }: Props = $props();

  const parts = $derived(text.split('`'));
</script>

{#each parts as part, index (index)}{#if index % 2 === 1}<code
      class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] break-words text-slate-800 dark:bg-slate-800 dark:text-slate-100"
      >{part}</code
    >{:else}{part}{/if}{/each}
