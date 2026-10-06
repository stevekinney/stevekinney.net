<script lang="ts">
  import { presets } from './presets';
  import type { PresetId } from './presets';

  type Props = {
    selected: PresetId | null;
    ready: boolean;
    onSelect: (id: PresetId) => void;
  };

  const { selected, ready, onSelect }: Props = $props();
</script>

<div class="grid gap-3 sm:grid-cols-2" role="group" aria-label="Presets">
  {#each presets as preset (preset.id)}
    <button
      type="button"
      aria-pressed={selected === preset.id}
      disabled={!ready}
      onclick={() => onSelect(preset.id)}
      class="focus-visible:outline-primary-600 aria-pressed:border-primary-500 aria-pressed:bg-primary-50 dark:aria-pressed:border-primary-400 dark:aria-pressed:bg-primary-950/40 min-w-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"
    >
      <span class="block font-semibold text-slate-900 dark:text-white">{preset.name}</span>
      <span class="mt-1 block text-sm text-slate-600 dark:text-slate-300">{preset.setup}</span>
    </button>
  {/each}
</div>
