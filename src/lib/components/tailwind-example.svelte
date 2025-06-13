<script lang="ts">
  const { children, url, encoded } = $props();
</script>

<section class="flex flex-col gap-4 rounded-md bg-slate-200 p-4 shadow-md dark:bg-slate-900">
  <div class="not-prose isolate">{@html encoded}</div>
  <div>
    {@render children?.()}
  </div>
</section>
