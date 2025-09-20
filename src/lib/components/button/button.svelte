<script lang="ts">
  import { LoaderCircle as Loading } from 'lucide-svelte';
  import { merge } from '$merge';
  import { variants } from './variants';
  import type { ButtonProps } from './types';

  const {
    label = '',
    class: className = '',
    variant = 'primary',
    size = 'medium',
    icon,
    iconPosition = 'left',
    href,
    loading = false,
    full = false,
    children,
    ...props
  }: ButtonProps = $props();

  const isLink = Boolean(href);
</script>

<svelte:element
  this={isLink ? 'a' : 'button'}
  {href}
  class={merge(variants({ variant, size, iconPosition }), full && 'w-full', className)}
  aria-busy={loading ? 'true' : undefined}
  {...!isLink ? { type: 'button', disabled: loading || undefined } : {}}
  {...isLink && loading ? { 'aria-disabled': 'true', tabindex: -1 } : {}}
  {...props}
>
  {#if loading}
    <Loading aria-hidden="true" />
  {:else if icon}
    {@const Icon = icon}
    <Icon aria-hidden="true" />
  {/if}
  {#if children}
    {@render children()}
  {:else}
    {label}
  {/if}
</svelte:element>
