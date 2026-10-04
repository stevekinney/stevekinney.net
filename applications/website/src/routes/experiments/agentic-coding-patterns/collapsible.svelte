<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    /** Whether the content is long enough to collapse. A short section never shows the control. */
    long: boolean;
    children: Snippet;
  };

  const { long, children }: Props = $props();

  const id = $props.id();

  let expanded = $state(false);
  const collapsed = $derived(long && !expanded);
</script>

<div>
  <div
    id="{id}-content"
    class="relative {collapsed
      ? 'max-h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]'
      : ''}"
  >
    {@render children()}
  </div>
  {#if long}
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls="{id}-content"
      onclick={() => (expanded = !expanded)}
      class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 mt-2 cursor-pointer rounded text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {expanded ? 'Show less' : 'Show more'}
    </button>
  {/if}
</div>
