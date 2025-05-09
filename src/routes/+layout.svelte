<script lang="ts">
  import { page } from '$app/stores';
  import { author, description, title } from '$lib/metadata';
  import { toDataAttributes } from '$lib/to-data-attributes';
  import { Github, Instagram, Linkedin, Twitter, Youtube } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  import type { ExtendElement } from '$lib/components/component.types';
  import Navigation from '$lib/components/navigation.svelte';
  import SEO from '$lib/components/seo.svelte';
  import SocialLink from '$lib/components/social-link.svelte';
  // Import styles
  import '../app.css';

  /**
   * Component props with children snippet support
   */
  type LayoutProps = ExtendElement<
    'div',
    {
      children?: Snippet;
    }
  >;

  // Extract props
  const { children, ...rest }: LayoutProps = $props();

  // Prepare data attributes for layout container
  const dataAttrs = toDataAttributes({
    layout: true,
    currentPath: $page.url.pathname,
    ...rest,
  });

  // Social media profile links
  const socialLinks = [
    { href: 'https://github.com/stevekinney', icon: Github, label: 'GitHub' },
    { href: 'https://instagram.com/stevekinney', icon: Instagram, label: 'Instagram' },
    { href: 'https://twitter.com/stevekinney', icon: Twitter, label: 'Twitter' },
    { href: 'https://linkedin.com/in/stevekinney', icon: Linkedin, label: 'LinkedIn' },
    {
      href: 'https://www.youtube.com/channel/UChXe-1_Jh91Z_CM3ppH39Xg',
      icon: Youtube,
      label: 'YouTube',
    },
  ];
</script>

<!-- SEO metadata -->
<SEO {title} {description} />

<!-- Main layout -->
<main
  {...dataAttrs}
  class="container my-6 grid grid-cols-1 items-center gap-6 sm:my-10 sm:grid-cols-2 lg:grid-cols-3"
>
  <!-- Site header -->
  <header>
    <h1 class="whitespace-nowrap lg:order-1">
      <a
        href="/"
        class="font-header text-6xl text-black decoration-primary-700 hover:underline dark:text-white"
        aria-label="{author}'s homepage"
      >
        {author}
      </a>
    </h1>
  </header>

  <!-- Social links -->
  <div
    class="order-1 flex items-center justify-between gap-4 sm:order-none sm:justify-end lg:order-3"
    data-social-links
  >
    {#each socialLinks as { href, icon, label }}
      <SocialLink {href} {icon} name={label} />
    {/each}
  </div>

  <!-- Navigation -->
  <Navigation class="sm:col-start-2 sm:justify-end lg:order-2 lg:justify-center" />

  <!-- Main content container -->
  <div class="my-6 sm:col-span-full lg:order-3" data-content-container>
    {@render children?.()}
  </div>
</main>
