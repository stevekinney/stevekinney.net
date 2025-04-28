<script>
  import { toDataAttributes } from '$lib/to-data-attributes';

  /** @type {string | undefined | null} */
  /**
   * @typedef {Object} Props
   * @property {string} title
   * @property {string} description
   * @property {boolean} [published]
   * @property {Date | string | undefined} [date]
   * @property {Date | string | undefined} [modified]
   * @property {string} [class]
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props & { [key: string]: any }} */
  const {
    title,
    description,
    published = true,
    date = undefined,
    modified = undefined,
    class: className = '',
    children,
    ...rest
  } = $props();
</script>

<div class={className} {...toDataAttributes(rest)}>
  <h1 class="mb-6 text-4xl font-bold">{title}</h1>

  <article class="prose max-w-none dark:prose-invert">
    {@render children?.()}
  </article>
</div>
