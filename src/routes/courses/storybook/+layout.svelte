<script lang="ts">
  import Index from '$courses/storybook/README.md';
  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_1fr]">
  <div>
    {@render children?.()}
  </div>
  <Index />
</div>
