<script lang="ts">
  import { bodyClasses } from './field-styles';
  import type { CacheTtl, ModelPrice } from './pricing';
  import type { ProjectionInputs } from './projection';
  import { compactPayback } from './projection';
  import { SENSITIVITY_HORIZON, sensitivityRows } from './sensitivity';

  type Props = {
    inputs: ProjectionInputs;
    models: ModelPrice[];
    ttl: CacheTtl;
    onFocusControl: (controlId: string) => void;
  };

  const { inputs, models, ttl, onFocusControl }: Props = $props();

  const rows = $derived(sensitivityRows(inputs, models, ttl));
  // Looked for as far ahead as the rows are, so the marker lines up with their bars.
  const current = $derived(compactPayback(inputs, SENSITIVITY_HORIZON));

  const turnText = (turn: number | null): string =>
    turn === null ? `none in ${SENSITIVITY_HORIZON}` : `turn ${turn}`;

  // The bars share one scale, set by the furthest payback that does come.
  const scale = $derived(
    Math.max(1, current ?? 1, ...rows.flatMap((row) => [row.low ?? 1, row.high ?? 1])) * 1.08,
  );

  const position = (turn: number | null): number => ((turn ?? scale) / scale) * 100;

  const heading = 'px-3 py-2 text-left font-semibold whitespace-nowrap';
</script>

<div class="space-y-3">
  <p class="max-w-3xl {bodyClasses}">
    Each row moves one input to the bottom and then the top of its slider, holding the rest, and
    shows the turn when compacting starts to pay for itself. The rows with the widest spread are the
    assumptions that matter most. A bar that runs off the end means it doesn’t pay within {SENSITIVITY_HORIZON}
    turns. Choose a row to jump to its control.
  </p>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
    tabindex="0"
    role="region"
    aria-label="What would change this answer"
  >
    <table class="w-full border-collapse text-sm" data-testid="sensitivity-table">
      <caption class="sr-only">
        The compaction payback turn with each input at its minimum and at its maximum, widest spread
        first.
      </caption>
      <thead class="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <tr>
          <th scope="col" class={heading}>Input</th>
          <th scope="col" class={heading}>At minimum</th>
          <th scope="col" class={heading}>At maximum</th>
          <th scope="col" class={heading} aria-sort="descending">Spread</th>
          <th scope="col" class="{heading} min-w-48">Range of paybacks</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
        {#each rows as row (row.id)}
          <tr class="bg-white dark:bg-slate-900" data-row={row.id}>
            <th scope="row" class="px-3 py-2 text-left font-semibold whitespace-nowrap">
              <button
                type="button"
                onclick={() => onFocusControl(row.controlId)}
                class="focus-visible:outline-primary-600 cursor-pointer text-left text-slate-900 underline decoration-slate-400 decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-2 dark:text-white"
              >
                {row.label}
              </button>
            </th>
            <td class="px-3 py-2 whitespace-nowrap text-slate-800 tabular-nums dark:text-slate-100">
              {turnText(row.low)}
              <span class="text-slate-500 dark:text-slate-400">at {row.lowLabel}</span>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-slate-800 tabular-nums dark:text-slate-100">
              {turnText(row.high)}
              <span class="text-slate-500 dark:text-slate-400">at {row.highLabel}</span>
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-slate-800 tabular-nums dark:text-slate-100">
              {row.spread === 0 ? 'none' : `${row.spread} ${row.spread === 1 ? 'turn' : 'turns'}`}
            </td>
            <td class="px-3 py-2">
              <div
                aria-hidden="true"
                class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  class="absolute inset-y-0 rounded-full bg-orange-500 dark:bg-orange-400"
                  style:left="{Math.min(position(row.low), position(row.high))}%"
                  style:width="max({Math.abs(position(row.high) - position(row.low))}%, 4px)"
                ></div>
                {#if current !== null}
                  <div
                    class="absolute -inset-y-1 w-0.5 bg-slate-900 dark:bg-white"
                    style:left="{position(current)}%"
                  ></div>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="text-sm {bodyClasses}">
    The dark marker is where your current scenario sits{current === null
      ? ', which is outside the range, because compacting doesn’t pay within the horizon'
      : `, at turn ${current}`}. Re-read after clear moves the clearing line, not this one, and the
    model only matters when a custom price breaks the 5× ratio between output and input.
  </p>
</div>
