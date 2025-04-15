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
</script>

<svelte:element
  this={href ? 'a' : 'button'}
  role={href ? 'link' : 'button'}
  {href}
  class={merge(variants({ variant, size, iconPosition }), full && 'w-full', className)}
  {...props}
>
  {#if loading}
    <Loading />
  {:else if icon}
    {@const Icon = icon}
    <Icon />
  {/if}
  {#if children}
    {@render children()}
  {:else}
    {label}
  {/if}
</svelte:element>
