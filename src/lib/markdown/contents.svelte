<script module lang="ts">
  import a from './components/a.svelte';
  import h2 from './components/h2.svelte';
  import ul from './components/ul.svelte';

  export { a, h2, ul };
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
