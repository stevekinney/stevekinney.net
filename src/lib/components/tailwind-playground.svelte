<script lang="ts">
  import { onMount } from 'svelte';

  const { hash } = $props();

  let iframe: HTMLIFrameElement;
  let height = $state(0);

  onMount(() => {
    iframe.contentWindow?.postMessage({ type: 'initialize' }, '*');
    iframe.contentWindow?.addEventListener('message', (event) => {
      if (event.data.type === 'initialize') {
        console.log(event.data);
        iframe.style.height = `${event.data.height}px`;
      }
    });
  });
</script>

<section class="mb-2 flex flex-col gap-4 rounded-md bg-slate-200 p-4 shadow-md dark:bg-slate-900">
  <iframe
    src={`/tailwind-${hash}.html`}
    title="Tailwind Playground"
    {height}
    bind:this={iframe}
    sandbox="allow-scripts allow-same-origin"
    referrerpolicy="no-referrer"
  ></iframe>
</section>
