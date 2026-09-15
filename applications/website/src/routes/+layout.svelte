<script lang="ts">
  import { dev } from '$app/environment';
  import { page } from '$app/stores';
  import { author } from '$lib/metadata';
  import { toDataAttributes } from '$lib/to-data-attributes';
  import { merge } from '$merge';
  import Github from '@icons-pack/svelte-simple-icons/icons/SiGithub';
  import Twitter from '@icons-pack/svelte-simple-icons/icons/SiX';
  import Youtube from '@icons-pack/svelte-simple-icons/icons/SiYoutube';
  import Linkedin from '$lib/components/linkedin-icon.svelte';
  import SiteWordmark from '$lib/components/site-wordmark.svelte';
  import type { Snippet } from 'svelte';

  import type { ExtendElement } from '$lib/components/component.types';
  import Navigation from '$lib/components/navigation.svelte';

  import SocialLink from '$lib/components/social-link.svelte';
  import VercelAnalytics from '$lib/components/vercel-analytics.svelte';
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
    { href: 'https://twitter.com/stevekinney', icon: Twitter, label: 'Twitter' },
    { href: 'https://linkedin.com/in/stevekinney', icon: Linkedin, label: 'LinkedIn' },
    {
      href: 'https://www.youtube.com/channel/UChXe-1_Jh91Z_CM3ppH39Xg',
      icon: Youtube,
      label: 'YouTube',
    },
  ];
</script>

<svelte:head>
  {#if dev}
    <!-- Content pages disable hydration but still need development reload notifications. -->
    <script type="module" src="/@vite/client"></script>
  {/if}
</svelte:head>

<!--
  Site-wide analytics. The component emits the first-party Vercel scripts into
  `<svelte:head>`, so it prerenders correctly on `csr = false` content pages and
  still loads on hydrating routes — no per-route wiring needed.
-->
<VercelAnalytics />

<!-- Skip navigation link for keyboard users -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-md focus:outline-none dark:focus:bg-gray-900 dark:focus:text-white"
>
  Skip to main content
</a>

<!-- Main layout -->
<div
  {...dataAttrs}
  {id}
  {style}
  {role}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledby}
  class={merge(
    'mx-auto my-6 grid max-w-7xl grid-cols-1 items-center gap-6 px-4 sm:my-10 sm:grid-cols-2 md:px-8 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    className,
  )}
>
  <!-- Site header -->
  <header>
    <h1 class="whitespace-nowrap xl:order-1">
      <a href="/" class="text-black dark:text-white" aria-label={`${author}'s homepage`}>
        <SiteWordmark />
      </a>
    </h1>
  </header>

  <!-- Navigation -->
  <Navigation class="sm:col-start-2 sm:justify-end xl:order-2 xl:justify-center" />

  <!-- Main content container -->
  <main id="main-content" class="my-6 sm:col-span-full xl:order-3" data-content-container>
    {@render children?.()}
  </main>

  <!-- Email subscription -->
  <footer
    class="space-y-6 border-t border-slate-200 pt-6 sm:col-span-full xl:order-4 dark:border-slate-700"
  >
    <form
      action="https://buttondown.com/api/emails/embed-subscribe/stevekinney"
      method="post"
      class="flex justify-center"
    >
      <label for="bd-email" class="sr-only">Enter your email</label>
      <div
        class="focus-within:ring-primary-600 dark:focus-within:ring-primary-400 flex w-full max-w-md rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none"
      >
        <input
          type="email"
          name="email"
          id="bd-email"
          placeholder="Enter your email"
          required
          class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 min-w-0 flex-1 rounded-l-md border border-r-0 border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-inset dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
        <input
          type="submit"
          value="Subscribe"
          class="focus-visible:ring-primary-300 bg-primary-700 hover:bg-primary-600 active:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500 dark:active:bg-primary-700 cursor-pointer rounded-r-md px-5 py-2 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
        />
      </div>
    </form>
    <div
      class="flex items-center justify-center gap-3"
      data-social-links
      role="complementary"
      aria-label="Social media links"
    >
      {#each socialLinks as { href, icon, label } (href)}
        <SocialLink {href} {icon} name={label} size={20} />
      {/each}
    </div>
  </footer>
</div>
