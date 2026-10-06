<script lang="ts">
  import { getReady } from './ready-context';
  import { customNotice, findPreset, presets } from './presets';

  type Props = {
    selectedId: string | null;
    onSelect: (id: string) => void;
  };

  const { selectedId, onSelect }: Props = $props();

  const isReady = getReady();
  const notice = $derived(findPreset(selectedId)?.notice ?? customNotice);
</script>

<div class="space-y-3">
  <div role="group" aria-labelledby="start-heading" class="flex flex-wrap gap-2">
    {#each presets as preset (preset.id)}
      <button
        type="button"
        disabled={!isReady()}
        aria-pressed={selectedId === preset.id}
        onclick={() => onSelect(preset.id)}
        class="focus-visible:outline-primary-600 aria-pressed:bg-primary-700 dark:aria-pressed:bg-primary-300 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-transparent aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:text-slate-900"
      >
        {preset.name}
      </button>
    {/each}
  </div>
  <p
    class="max-w-3xl text-slate-700 dark:text-slate-200"
    aria-live="polite"
    data-testid="preset-notice"
  >
    {notice}
  </p>
</div>
