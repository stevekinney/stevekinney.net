<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<header class="flex items-center justify-between">
  <a href="/courses/testing" class=" block text-primary-600 dark:text-primary-200">
    Introduction to Testing
  </a>
</header>

{@render children?.()}
