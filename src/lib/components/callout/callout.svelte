<script lang="ts" module>
  import type { BaseAttributes, ExtendElement } from '../component.types';
  import { getVariationColor, getIcon, type CalloutVariation } from './variations';

  export type CalloutProps = ExtendElement<
    BaseAttributes,
    {
      variant?: CalloutVariation;
      title?: string;
      description?: string;
      foldable?: boolean;
    }
  >;
</script>

<script lang="ts">
  import { sentenceCase } from 'change-case';
  import { ChevronDown } from 'lucide-svelte';
  import { merge } from '$lib/merge';

  /**
   * Component props
   */
  const {
    variant = 'note',
    description = '',
    title = sentenceCase(variant),
    foldable = false,
    children,
    class: className = '',
    ...rest
  }: CalloutProps = $props();

  // Calculate icon based on variant
  const Icon = $derived(getIcon(variant));

  // State for foldable callouts
  let open = $state(!foldable);

  // Calculate container classes
  const containerClass = merge(
    'space-y-2 rounded-md border p-4 shadow-sm',
    getVariationColor(variant),
    className,
  );

  // Calculate header classes
  const headerClass = 'flex items-center gap-2 leading-tight text-current';
</script>

<div class={containerClass} {...rest}>
  <svelte:element this={foldable ? 'label' : 'div'} class={headerClass}>
    <Icon class="w-4" />
    <span class="font-bold">{title}</span>
    {#if foldable}
      <input type="checkbox" bind:checked={open} class="peer hidden" />
      <ChevronDown class="ml-auto w-4 -rotate-90 transition-transform peer-checked:rotate-0" />
    {/if}
  </svelte:element>

  {#if children || description}
    <div class={merge('prose dark:prose-invert', !open && foldable && 'hidden')}>
      {#if children}
        {@render children()}
      {:else}
        <p>{description}</p>
      {/if}
    </div>
  {/if}
</div>
