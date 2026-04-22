<script lang="ts">
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import { toDataAttributes } from '$lib/to-data-attributes';
  import type { Snippet } from 'svelte';

  type Props = {
    as?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const { as = 'section', class: className = '', children, ...rest }: Props = $props();
</script>

<ContentEnhancements />

<svelte:element this={as} class={className} data-content-document {...toDataAttributes(rest)}>
  {@render children?.()}
</svelte:element>
