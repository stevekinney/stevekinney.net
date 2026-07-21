<script lang="ts">
  type Props = {
    label: string;
    value: string;
    context?: string;
  };

  const { label, value, context }: Props = $props();
</script>

<div class="rounded-md bg-slate-100 p-4 dark:bg-slate-800">
  <p class="text-sm text-slate-500 dark:text-slate-400">{label}</p>
  <p class="font-header text-4xl">{value}</p>
  {#if context}
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{context}</p>
  {/if}
</div>
