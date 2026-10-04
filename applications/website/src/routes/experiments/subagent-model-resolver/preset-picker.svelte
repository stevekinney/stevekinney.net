<script lang="ts">
  import { customScenarioNotice, presets } from './presets';

  type Props = {
    /** The preset whose configuration is loaded, or `null` once anything has been edited. */
    selectedId: string | null;
    ready: boolean;
    onSelect: (id: string) => void;
  };

  const { selectedId, ready, onSelect }: Props = $props();

  const notice = $derived(
    presets.find((preset) => preset.id === selectedId)?.notice ?? customScenarioNotice,
  );
</script>

<div class="space-y-4">
  <div role="group" aria-label="Scenarios" class="flex flex-wrap gap-2">
    {#each presets as preset (preset.id)}
      <button
        type="button"
        disabled={!ready}
        aria-pressed={selectedId === preset.id}
        onclick={() => onSelect(preset.id)}
        class="focus-visible:outline-primary-600 aria-pressed:border-primary-600 aria-pressed:bg-primary-600 dark:aria-pressed:border-primary-400 dark:aria-pressed:bg-primary-700 min-h-10 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400"
      >
        {preset.label}
      </button>
    {/each}
  </div>
  <p
    data-testid="preset-notice"
    class="max-w-3xl rounded-lg border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200"
  >
    {notice}
  </p>
</div>
