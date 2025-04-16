<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<h2 class="mb-2 text-lg font-bold">{@render children?.()}</h2>
