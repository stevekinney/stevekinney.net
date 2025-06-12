<script lang="ts">
  const { children, data } = $props();
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[calc(100%_-_20rem)18rem]">
  <section class="max-w-full">
    {@render children?.()}
  </section>
  {#if data.contents}
    <data.contents as="aside" />
  {/if}
</div>
