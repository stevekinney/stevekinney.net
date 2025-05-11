<script module lang="ts">
  import A from './a.svelte';
  import H2 from './h2.svelte';
  import UL from './ul.svelte';

  export { A as a, H2 as h2, UL as ul };
</script>

<script lang="ts">
  import { toDataAttributes } from '$lib/to-data-attributes';
  import { merge } from '$merge';
  import type { Snippet } from 'svelte';

  type Props = {
    as?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const { as = 'nav', class: className = '', children, ...rest }: Props = $props();
</script>

<svelte:element
  this={as}
  class={merge(className)}
  {...toDataAttributes(rest)}
  data-markdown-contents
>
  {@render children?.()}
</svelte:element>
