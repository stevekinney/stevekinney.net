<script lang="ts">
  import { merge } from '$merge';
  import type { Icon as IconType } from 'lucide-svelte';
  import type { ExtendElement } from './component.types';

  type SocialLinkProps = ExtendElement<
    'a',
    {
      icon: typeof IconType;
      name?: string;
      size?: number;
    }
  >;

  const {
    href,
    icon,
    name = icon.name,
    target = '_blank',
    size = 36,
    class: className = '',
    ...props
  }: SocialLinkProps = $props();

  const Icon = $derived(icon);
</script>

<a 
  {href} 
  {target} 
  rel={target === '_blank' ? 'noopener noreferrer' : undefined}
  aria-label="Visit {name} profile"
  class={merge(
    'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 rounded',
    className
  )}
  {...props}
>
  <Icon
    class={merge(
      'hover:stroke-primary-700 active:stroke-primary-600 transition-colors',
      String(className),
    )}
    aria-hidden="true"
    {size}
  />
</a>
