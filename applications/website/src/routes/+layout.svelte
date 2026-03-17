<script lang="ts">
  import { dev } from '$app/environment';
  import { page } from '$app/stores';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
  import { author } from '$lib/metadata';
  import { toDataAttributes } from '$lib/to-data-attributes';
  import { merge } from '$merge';
  import { Github, Instagram, Linkedin, Twitter, Youtube } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  if (!dev) {
    injectAnalytics({ mode: 'production' });
    injectSpeedInsights();
  }

  import type { ExtendElement } from '$lib/components/component.types';
  import Navigation from '$lib/components/navigation.svelte';

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
  const {
    children,
    id,
    class: className,
    style,
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  }: LayoutProps = $props();

  // Prepare data attributes for layout container
  const dataAttrs = toDataAttributes({
    layout: true,
    currentPath: $page.url.pathname,
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

<!-- Main layout -->
<div
  {...dataAttrs}
  {id}
  {style}
  {role}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledby}
  class={merge(
    'mx-auto my-6 grid max-w-7xl grid-cols-1 items-center gap-6 px-4 sm:my-10 sm:grid-cols-2 md:px-8 lg:grid-cols-3',
    className,
  )}
>
  <!-- Site header -->
  <header>
    <h1 class="whitespace-nowrap lg:order-1">
      <a
        href="/"
        class="font-header decoration-primary-700 dark:decoration-primary-400 text-6xl text-black hover:underline dark:text-white"
        aria-label={`${author}'s homepage`}
      >
        {author}
      </a>
    </h1>
  </header>

  <!-- Social links -->
  <div
    class="order-1 flex items-center justify-between gap-4 sm:order-none sm:justify-end lg:order-3"
    data-social-links
    role="complementary"
    aria-label="Social media links"
  >
    {#each socialLinks as { href, icon, label } (href)}
      <SocialLink {href} {icon} name={label} />
    {/each}
  </div>

  <!-- Navigation -->
  <Navigation class="sm:col-start-2 sm:justify-end lg:order-2 lg:justify-center" />

  <!-- Main content container -->
  <main class="my-6 sm:col-span-full lg:order-3" data-content-container>
    {@render children?.()}
  </main>

  <!-- Email subscription -->
  <footer class="sm:col-span-full lg:order-4">
    <form
      action="https://buttondown.com/api/emails/embed-subscribe/stevekinney"
      method="post"
      class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
    >
      <label for="bd-email" class="sr-only">Enter your email</label>
      <input
        type="email"
        name="email"
        id="bd-email"
        placeholder="Enter your email"
        required
        class="focus:border-primary-600 focus:ring-primary-600 dark:focus:border-primary-400 dark:focus:ring-primary-400 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none sm:w-64 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
      />
      <input
        type="submit"
        value="Subscribe"
        class="bg-primary-700 hover:bg-primary-600 focus:ring-primary-600 active:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500 dark:active:bg-primary-700 cursor-pointer rounded-md px-5 py-2 text-sm font-medium text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
      />
    </form>
  </footer>
</div>
