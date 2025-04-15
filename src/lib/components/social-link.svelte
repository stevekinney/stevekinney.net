<script lang="ts">
  import type { Icon as IconType } from 'lucide-svelte';
  import { merge } from '$merge';
  import type { ExtendElement } from './component.types';

  type SocialLinkProps = ExtendElement<
    'a',
    {
      icon: typeof IconType;
      name?: any;
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

<a {href} {target} {...props}>
  <Icon
    class={merge('transition-colors hover:stroke-primary-700 active:stroke-primary-600', className)}
    aria-label={name}
    {size}
  />
</a>
