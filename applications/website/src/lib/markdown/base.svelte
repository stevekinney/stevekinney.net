<script lang="ts">
  import { toDataAttributes } from '$lib/to-data-attributes';
  import { enhanceCodeBlocks } from '$lib/actions/enhance-code-blocks';
  import { enhanceMermaidDiagrams } from '$lib/actions/enhance-mermaid-diagrams';
  import { enhanceTables } from '$lib/actions/enhance-tables';
  import type { Snippet } from 'svelte';

  type Props = {
    as?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const { as = 'section', class: className = '', children, ...rest }: Props = $props();
</script>

<svelte:element
  this={as}
  class={className}
  {...toDataAttributes(rest)}
  use:enhanceCodeBlocks
  use:enhanceMermaidDiagrams
  use:enhanceTables
>
  {@render children?.()}
</svelte:element>
