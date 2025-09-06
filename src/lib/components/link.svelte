<script lang="ts">
  import { page } from '$app/state';
  import { merge } from '$merge';
  import type { ExtendElement } from './component.types';

  type Props = ExtendElement<
    'a',
    {
      href: string;
      active?: string;
    }
  >;

  // eslint-disable-next-line svelte/valid-compile
  const { href = '#', children, class: className = '', ...rest }: Props = $props();

  const ariaCurrent: 'page' | 'true' | undefined = $derived(
    href === page.url.pathname ? 'page' : page.url.pathname.startsWith(href) ? 'true' : undefined,
  );
</script>

<a
  {href}
  class={merge(
    'decoration-primary-600 hover:text-primary-800 hover:decoration-primary-600 dark:hover:text-primary-200 focus:ring-primary-600 font-semibold decoration-4 underline-offset-8 focus:ring-2 focus:ring-offset-2 focus:outline-none dark:decoration-slate-400',
    ariaCurrent && 'underline',
    ariaCurrent === 'page' && 'bg-primary-100 dark:bg-primary-900',
    className,
  )}
  aria-current={ariaCurrent}
  {...rest}
>
  {@render children?.()}
</a>
