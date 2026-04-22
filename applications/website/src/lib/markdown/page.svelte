<script>
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import { toDataAttributes } from '$lib/to-data-attributes';

  /** @type {string | undefined | null} */
  /**
   * @typedef {Object} Props
   * @property {string} title
   * @property {string} description
   * @property {Date | string | undefined} [date]
   * @property {Date | string | undefined} [modified]
   * @property {string} [class]
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props & { [key: string]: any }} */
  const { class: className = '', children, title, ...rest } = $props();
</script>

<ContentEnhancements />

<div class={className} {...toDataAttributes(rest)}>
  <h1 class="mb-6 text-4xl font-bold">{title}</h1>

  <article class="prose dark:prose-invert max-w-none" data-content-document>
    {@render children?.()}
  </article>
</div>
