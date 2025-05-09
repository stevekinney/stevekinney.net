<script lang="ts" module>
  import type { BaseAttributes, ExtendElement } from '../component.types';
  import { getIcon, getVariationColor, type CalloutVariation } from './variations';

  /**
   * Type definition for Callout component props.
   */
  export type CalloutProps = ExtendElement<
    BaseAttributes,
    {
      /** The visual style of the callout. */
      variant?: CalloutVariation;
      /** Custom title for the callout. Defaults to the variant name in sentence case. */
      title?: string;
      /** Content to display when no children are provided. */
      description?: string;
      /** Whether the callout can be expanded and collapsed. */
      foldable?: boolean;
    }
  >;
</script>

<script lang="ts">
  import { merge } from '$lib/merge';
  import { sentenceCase } from 'change-case';
  import { ChevronDown } from 'lucide-svelte';

  /**
   * Component props with default values.
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

  // Get the appropriate icon based on the variant.
  const Icon = $derived(getIcon(variant));

  // State for foldable callouts - open by default if not foldable.
  let open = $state(!foldable);

  // Toggle the open state for foldable callouts.
  function toggleOpen() {
    if (foldable) open = !open;
  }

  /** Base container classes with variant-specific styling. */
  const containerClass = $derived(
    merge('space-y-2 rounded-md border p-4 shadow-sm', getVariationColor(variant), className),
  );

  /** Header styles for the callout title area. */
  const headerClass = 'flex items-center gap-2 leading-tight text-current';

  /** Content container classes with conditional visibility. */
  const contentClass = $derived(merge('prose dark:prose-invert', !open && foldable && 'hidden'));

  /** Chevron rotation class based on open state. */
  const chevronClass = $derived(
    merge('ml-auto w-4 transition-transform', open ? 'rotate-0' : '-rotate-90'),
  );
</script>

<div class={containerClass} {...rest}>
  <svelte:element
    this={foldable ? 'button' : 'div'}
    class={headerClass}
    onclick={toggleOpen}
    role={foldable ? undefined : 'button'}
    aria-expanded={foldable ? open : undefined}
    type={foldable ? 'button' : undefined}
  >
    <Icon class="w-4" aria-hidden="true" />
    <span class="font-bold">{title}</span>

    {#if foldable}
      <ChevronDown class={chevronClass} aria-hidden="true" />
    {/if}
  </svelte:element>

  <!-- Content section (either children or description) -->
  {#if children || description}
    <div class={contentClass} aria-hidden={foldable && !open ? true : undefined}>
      {#if children}
        {@render children()}
      {:else if description}
        <p>{description}</p>
      {/if}
    </div>
  {/if}
</div>
