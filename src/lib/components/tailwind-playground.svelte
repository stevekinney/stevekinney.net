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

    // Add stylesheet with transition styles
    const style = document.createElement('style');
    style.textContent = `
      :host { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease-out; }
      :host(.loaded) { grid-template-rows: 1fr; }
      .content { overflow: hidden; }
    `;
    root.appendChild(style);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = appStylesUrl;
    root.appendChild(link);

    // Add the sanitized HTML content wrapped for animation
    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = html;
    root.appendChild(content);

    // Trigger animation after a frame
    requestAnimationFrame(() => {
      host.classList.add('loaded');
      loaded = true;
    });
  });
</script>

<section class="mb-2 rounded-md bg-slate-100 p-4 shadow-sm dark:bg-slate-800" bind:this={host}>
  {#if !loaded}
    <div class="flex animate-pulse items-center gap-3">
      <div class="h-8 w-24 rounded bg-slate-300 dark:bg-slate-700"></div>
      <div class="h-4 w-32 rounded bg-slate-200 dark:bg-slate-600"></div>
    </div>
  {/if}
</section>
