<script lang="ts">
  import { textParts } from './workflow-model';

  type Props = {
    /** A prompt, label, or log message whose `${…}` placeholders stay visible. */
    text: string;
  };

  const { text }: Props = $props();

  const parts = $derived(textParts(text));
</script>

{#each parts as part, index (index)}{#if part.placeholder}<code
      class="rounded bg-violet-100 px-1 font-mono text-[0.85em] font-normal [overflow-wrap:anywhere] text-violet-900 dark:bg-violet-950 dark:text-violet-200"
      >{part.text}</code
    >{:else}{part.text}{/if}{/each}
