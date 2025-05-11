<script lang="ts">
  import { merge } from '$lib/merge';
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
    class?: string;
    [key: string]: unknown;
  };

  const { children, class: className = '', ...rest }: Props = $props();
</script>

<h2 class={merge(className, 'mb-2 font-bold')} data-markdown-heading {...rest}>
  {@render children?.()}
</h2>
