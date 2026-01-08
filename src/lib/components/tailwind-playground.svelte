<script lang="ts">
  import { onMount } from 'svelte';
  import appStylesUrl from '../../app.css?url';

  // HTML is pre-sanitized at build time by remark-tailwind-playground plugin
  const { html } = $props<{ html: string }>();

  let host: HTMLElement;

  onMount(() => {
    // If shadow root already exists (declarative shadow DOM worked during SSR), we're done
    if (host.shadowRoot) return;

    // For browsers without declarative shadow DOM support (older Safari) or
    // client-side navigation, manually create the shadow root and populate it.
    const root = host.attachShadow({ mode: 'open' });

    // Add stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = appStylesUrl;
    root.appendChild(link);

    // Add the sanitized HTML content
    const content = document.createElement('div');
    content.innerHTML = html;
    root.appendChild(content);

    // Remove the template element since we handled it manually
    const template = host.querySelector('template');
    template?.remove();
  });
</script>

<section
  class="mb-2 flex flex-col gap-4 rounded-md bg-slate-100 p-4 shadow-sm dark:bg-slate-800"
  bind:this={host}
>
  <template shadowrootmode="open">
    <link rel="stylesheet" href={appStylesUrl} />
    <!-- HTML is pre-sanitized at build time by remark-tailwind-playground -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  </template>
</section>
