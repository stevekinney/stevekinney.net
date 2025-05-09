<script lang="ts" module>
  import { merge } from '$merge';
  import formatDate from '$lib/format-date';
  import type { BaseAttributes } from '$lib/components/component.types';

  import { variants, type CardVariants } from './variants';

  type ValidElements = 'div' | 'section' | 'aside' | 'article' | 'li' | 'a';

  export type CardBaseProps = BaseAttributes &
    CardVariants & {
      title?: string;
      description?: string;
      date?: Date | string;
      url?: string;
      as?: ValidElements;
    };
</script>

<script lang="ts">
  let {
    title,
    description,
    date,
    url,
    variant = 'default',
    as = url ? 'a' : 'div',
    children,
  }: CardBaseProps = $props();
</script>

<svelte:element this={as} class={variants({ variant })}>
  <svelte:element this={url ? 'a' : 'div'} href={url} class={merge(url && 'group')}>
    {#if title}
      <h2 class="text-xl font-semibold group-hover:underline">{title}</h2>
    {/if}
    {#if description}
      <p class="prose dark:prose-invert">{description}</p>
    {/if}
    {#if date}
      <p class="text-sm text-slate-500 dark:text-slate-400">{formatDate(date)}</p>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </svelte:element>
</svelte:element>
