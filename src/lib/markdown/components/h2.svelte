<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
    class?: string;
    [key: string]: unknown;
  };

  const { children, class: className = '', ...rest }: Props = $props();
</script>

<h2 class={className} data-markdown-heading {...rest}>
  {@render children?.()}
</h2>
