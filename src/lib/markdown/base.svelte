<script lang="ts">
  import { toDataAttributes } from '$lib/to-data-attributes';
  import type { Snippet } from 'svelte';
  import './markdown.css';

  type Props = {
    as?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const { as = 'section', class: className = '', children, ...rest }: Props = $props();
</script>

<svelte:element this={as} class={className} {...toDataAttributes(rest)}>
  {@render children?.()}
</svelte:element>
