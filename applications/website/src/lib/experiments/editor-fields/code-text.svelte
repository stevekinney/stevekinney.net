<script lang="ts">
  type Props = {
    /** Prose that marks keys, values, tool names, paths, and commands with backticks. */
    text: string;
  };

  const { text }: Props = $props();

  const parts = $derived(text.split('`'));
</script>

{#each parts as part, index (index)}{#if index % 2 === 1}<code
      class="font-mono text-[0.9em] [overflow-wrap:anywhere]">{part}</code
    >{:else}{part}{/if}{/each}
