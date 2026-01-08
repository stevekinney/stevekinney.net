<script lang="ts">
  import { onMount } from 'svelte';
  import appStylesUrl from '../../app.css?url';

  // HTML is pre-sanitized at build time by remark-tailwind-playground plugin
  const { html } = $props<{ html: string }>();

  let host: HTMLElement;
  let loaded = $state(false);

  onMount(() => {
    // Create shadow root and populate it entirely on the client
    // This avoids hydration issues with declarative shadow DOM
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

    loaded = true;
  });
</script>

<section
  class="mb-2 flex flex-col gap-4 rounded-md bg-slate-100 p-4 shadow-sm dark:bg-slate-800"
  bind:this={host}
>
  {#if !loaded}
    <div class="flex animate-pulse items-center gap-3">
      <div class="h-8 w-24 rounded bg-slate-300 dark:bg-slate-700"></div>
      <div class="h-4 w-32 rounded bg-slate-200 dark:bg-slate-600"></div>
    </div>
  {/if}
</section>
