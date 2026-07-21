<script lang="ts">
  type Props = {
    label: string;
    value: string;
  };

  const { label, value }: Props = $props();
</script>

<div class="rounded-md bg-slate-100 p-4 dark:bg-slate-800">
  <p class="text-sm text-slate-500 dark:text-slate-400">{label}</p>
  <p class="font-sans text-4xl">{value}</p>
</div>
