<script lang="ts">
  import { codeClasses } from './field-styles';

  type Props = { text: string };

  const { text }: Props = $props();

  // Backticks mark code, the way the specification writes `touch done`.
  const parts = $derived(text.split('`'));
</script>

{#each parts as part, index (index)}{#if index % 2 === 1}<code class={codeClasses}>{part}</code
    >{:else}{part}{/if}{/each}
