<script lang="ts">
  import type { Snippet } from 'svelte';
  import { merge } from '$merge';

  type Props = {
    children?: Snippet;
    class?: string;
    [key: string]: unknown;
  };

  const { children, class: className = '', ...rest }: Props = $props();
</script>

<ul class={merge('mb-8 space-y-1', className)} data-markdown-list {...rest}>
  {@render children?.()}
</ul>
