<script lang="ts">
  import { onMount } from 'svelte';
  import appStylesUrl from '../../app.css?url';

  const { html } = $props<{ html: string }>();

  let host: HTMLElement;

  onMount(() => {
    if (host.shadowRoot) return;

    const template = host.querySelector('template[shadowrootmode="open"]');
    if (!(template instanceof HTMLTemplateElement)) return;

    const root = host.attachShadow({ mode: 'open' });
    root.appendChild(template.content);
    template.remove();
  });
</script>

<section
  class="mb-2 flex flex-col gap-4 rounded-md bg-slate-200 p-4 shadow-md dark:bg-slate-900"
  bind:this={host}
>
  <template shadowrootmode="open">
    <link rel="stylesheet" href={appStylesUrl} />
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  </template>
</section>
