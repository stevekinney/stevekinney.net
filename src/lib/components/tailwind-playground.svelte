<script lang="ts">
  import { onMount } from 'svelte';
  import DOMPurify from 'isomorphic-dompurify';
  import { hydrateShadowRoots } from '@webcomponents/template-shadowroot';
  import appStylesUrl from '../../app.css?url';

  const { html } = $props<{ html: string }>();

  // Sanitize HTML to prevent XSS vulnerabilities
  const sanitizedHtml = $derived(
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'div',
        'span',
        'p',
        'a',
        'button',
        'input',
        'label',
        'form',
        'select',
        'option',
        'textarea',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'img',
        'svg',
        'path',
        'section',
        'article',
        'header',
        'footer',
        'nav',
        'main',
        'aside',
        'code',
        'pre',
      ],
      ALLOWED_ATTR: [
        'class',
        'id',
        'href',
        'src',
        'alt',
        'title',
        'type',
        'value',
        'placeholder',
        'for',
        'role',
        'tabindex',
        // Form attributes
        'name',
        'disabled',
        'checked',
        'selected',
        'rows',
        'cols',
        'readonly',
        'required',
        'multiple',
        // SVG attributes
        'd',
        'viewBox',
        'fill',
        'stroke',
        'width',
        'height',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'xmlns',
      ],
      // DOMPurify defaults allow aria-* and data-* attributes (ALLOW_ARIA_ATTR and ALLOW_DATA_ATTR are true by default)
    }),
  );

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
    <!-- HTML is sanitized with DOMPurify before rendering -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html sanitizedHtml}
  </template>
</section>
