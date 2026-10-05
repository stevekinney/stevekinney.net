<script lang="ts">
  import { buttonClasses } from './field-styles';
  import { presets } from './presets';

  type Props = {
    /** The preset whose configuration is loaded, or null once anything has been edited. */
    selectedId: string | null;
    ready: boolean;
    onSelect: (id: string) => void;
  };

  const { selectedId, ready, onSelect }: Props = $props();

  const notice = $derived(presets.find((preset) => preset.id === selectedId)?.notice ?? null);
</script>

<div class="space-y-3">
  <div role="group" aria-label="Presets" class="flex flex-wrap gap-2">
    {#each presets as preset (preset.id)}
      <button
        type="button"
        disabled={!ready}
        aria-pressed={selectedId === preset.id}
        onclick={() => onSelect(preset.id)}
        class={buttonClasses}
      >
        {preset.label}
      </button>
    {/each}
  </div>
  {#if notice}
    <p
      data-testid="preset-notice"
      class="max-w-3xl rounded-lg border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200"
    >
      {notice}
    </p>
  {/if}
</div>
