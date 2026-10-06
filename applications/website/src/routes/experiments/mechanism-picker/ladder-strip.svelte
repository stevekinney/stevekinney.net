<script lang="ts">
  import { rungs } from './ladder';
  import type { RungId } from './ladder';
  import { rungTone } from './mode-styles';

  type Props = {
    /** The rung that lights up, or `null` when the selection has none. */
    lit: RungId | null;
    /** What's selected, such as "Permission rule", or `null` when nothing is. */
    selectionLabel: string | null;
    /** Why nothing is lit, such as "Dynamic workflow isn't an enforcement mechanism." */
    offLadderNote: string | null;
  };

  const { lit, selectionLabel, offLadderNote }: Props = $props();

  // Strongest at the top, the way a ladder reads.
  const top = [...rungs].reverse();
  const litRung = $derived(rungs.find((rung) => rung.id === lit) ?? null);
</script>

<aside
  aria-labelledby="ladder-heading"
  data-testid="ladder-strip"
  class="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
>
  <div class="space-y-1">
    <h2 id="ladder-heading" class="text-base font-bold text-slate-900 dark:text-white">
      Enforcement ladder
    </h2>
    <p class="text-xs text-slate-500 dark:text-slate-400">Strongest at the top.</p>
  </div>
  <ol class="space-y-1">
    {#each top as rung (rung.id)}
      {@const on = rung.id === lit}
      <li
        data-rung={rung.id}
        data-lit={on}
        aria-current={on ? 'true' : undefined}
        class="rounded-md border-l-4 px-2 py-1.5 text-sm transition-colors motion-reduce:transition-none {rungTone(
          rung.refuses,
        )} {on
          ? 'bg-primary-100 ring-primary-600 dark:bg-primary-900/50 dark:ring-primary-400 ring-2'
          : 'bg-slate-50 dark:bg-slate-800/60'}"
      >
        <span class="block font-semibold text-slate-900 dark:text-white">
          {rung.name}
          {#if on}<span
              class="bg-primary-600 dark:bg-primary-500 ml-1 rounded px-1 text-xs font-bold text-white"
              >Selected</span
            >{/if}
        </span>
        <span class="block text-xs text-slate-600 dark:text-slate-300">
          {rung.refuses ? 'Refuses' : 'Asks'} · {rung.power}
        </span>
      </li>
    {/each}
  </ol>
  <p class="min-h-10 text-xs text-slate-600 dark:text-slate-300" aria-live="polite">
    {#if selectionLabel && litRung}
      {selectionLabel} sits on “{litRung.name}”: {litRung.power}.
    {:else if selectionLabel && offLadderNote}
      {offLadderNote}
    {:else}
      Select a mechanism, a card, or a linted line to light its rung.
    {/if}
  </p>
</aside>
