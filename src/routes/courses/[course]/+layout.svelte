<script lang="ts">
  const { children, data } = $props();
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_1fr]">
  <section>
    {@render children?.()}
  </section>
  {#if data.contents}
    <data.contents class="sticky top-6 hidden lg:block" as="aside" />
  {/if}
</div>
