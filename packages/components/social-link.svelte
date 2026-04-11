<script lang="ts">
  import { merge } from '$merge';
  import type { Component } from 'svelte';
  import type { ExtendElement } from './component.types';

  // Accepts any Svelte 5 icon component (Lucide, simple-icons, or local SVG wrappers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type IconComponent = Component<any>;

  type SocialLinkProps = ExtendElement<
    'a',
    {
      icon: IconComponent;
      name: string;
      size?: number;
    }
  >;

  const {
    href,
    icon: Icon,
    name,
    target = '_blank',
    size = 36,
    class: className = '',
    id,
    role,
    tabindex,
    'aria-describedby': ariaDescribedby,
    title,
  }: SocialLinkProps = $props();
</script>

<a
  {href}
  {id}
  {role}
  {tabindex}
  {target}
  {title}
  rel={target === '_blank' ? 'noopener noreferrer' : undefined}
  aria-label="Visit {name} profile"
  aria-describedby={ariaDescribedby}
  class={merge(
    'focus:ring-primary-600 rounded focus:ring-2 focus:ring-offset-2 focus:outline-none',
    className,
  )}
>
  <Icon
    class={merge(
      'hover:stroke-primary-700 active:stroke-primary-600 dark:hover:stroke-primary-300 dark:active:stroke-primary-400 transition-colors',
      String(className),
    )}
    aria-hidden="true"
    {size}
  />
</a>
