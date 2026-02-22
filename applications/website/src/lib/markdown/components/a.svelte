<script lang="ts">
  import type { ExtendElement } from '$lib/components/component.types';
  import Link from '$lib/components/link.svelte';
  import { merge } from '$lib/merge';

  type Props = ExtendElement<
    'a',
    {
      href: string;
    }
  >;

  const { href, children, class: className, ...rest }: Props = $props();
</script>

<Link
  {...rest}
  {href}
  class={merge(className, 'font-normal decoration-2 underline-offset-2')}
  active="underline bg-primary-200 dark:bg-primary-800 hover:bg-primary-300 dark:hover:text-primary-50 dark:decoration-primary-600"
  data-markdown-link
>
  {@render children?.()}
</Link>
