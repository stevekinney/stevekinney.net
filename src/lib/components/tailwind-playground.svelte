<script lang="ts">
  // HTML is pre-sanitized at build time by remark-tailwind-playground plugin
  const { html, class: className = '' } = $props<{ html: string; class?: string }>();
  const baseClasses =
    'tailwind-playground not-prose mb-2 rounded-md bg-slate-100 p-4 shadow-sm dark:bg-slate-800';
</script>

<div class={className ? `${baseClasses} ${className}` : baseClasses} data-tailwind-playground>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>
