<script lang="ts">
  import { onMount } from 'svelte';
  import { hydrateShadowRoots } from '@webcomponents/template-shadowroot';
  import appStylesUrl from '../../app.css?url';

  // HTML is pre-sanitized at build time by remark-tailwind-playground plugin
  const { html } = $props<{ html: string }>();

  let host: HTMLElement;
  let mounted = $state(false);

  onMount(() => {
    mounted = true;

    hydrateShadowRoots(host);
  });
</script>

<section
  class="mb-2 flex flex-col gap-4 rounded-md bg-slate-200 p-4 shadow-md dark:bg-slate-900"
  bind:this={host}
  style:display={mounted ? undefined : 'none'}
>
  <template shadowrootmode="open">
    <link rel="stylesheet" href={appStylesUrl} />
    <!-- HTML is pre-sanitized at build time by remark-tailwind-playground -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  </template>
</section>
