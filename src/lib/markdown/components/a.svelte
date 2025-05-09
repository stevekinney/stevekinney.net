<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import type { ExtendElement } from '$lib/components/component.types';
  import type { Snippet } from 'svelte';

  type Props = ExtendElement<
    'a',
    {
      href: string;
      children?: Snippet;
    }
  >;

  const { href, children, class: className, ...rest }: Props = $props();
</script>

<Link
  {...rest}
  {href}
  class={className}
  active="font-bold underline bg-primary-200 dark:bg-primary-800 hover:bg-primary-300 dark:hover:text-primary-50 dark:decoration-primary-600"
  data-markdown-link
>
  {@render children?.()}
</Link>
