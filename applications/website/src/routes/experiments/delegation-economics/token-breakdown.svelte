<script lang="ts">
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

  import { formatMultiplier } from './display';
  import type { EconomicsInputs, Evaluation, TokenBreakdown } from './economics';
  import { teamMultiplierFor } from './economics';

  type Props = {
    evaluation: Evaluation;
    inputs: EconomicsInputs;
  };

  const { evaluation, inputs }: Props = $props();

  type Part = 'spawn' | 'shared' | 'unique' | 'reports' | 'output';

  /** Each part has a color and a fill pattern, so color is never the only way to tell them apart. */
  const parts: { id: Part; name: string; classes: string; pattern: string }[] = [
    {
      id: 'spawn',
      name: 'Spawn overhead',
      classes: 'bg-amber-400 dark:bg-amber-500',
      pattern: 'repeating-linear-gradient(45deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 7px)',
    },
    {
      id: 'shared',
      name: 'Shared context',
      classes: 'bg-violet-500 dark:bg-violet-400',
      pattern:
        'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.25) 0 2px, transparent 2px 6px)',
    },
    { id: 'unique', name: 'Unique work', classes: 'bg-sky-500 dark:bg-sky-400', pattern: 'none' },
    {
      id: 'reports',
      name: 'Reports',
      classes: 'bg-emerald-500 dark:bg-emerald-400',
      pattern: 'radial-gradient(rgb(0 0 0 / 0.25) 1px, transparent 1.5px) 0 0 / 5px 5px',
    },
    {
      id: 'output',
      name: 'Output',
      classes: 'bg-slate-500 dark:bg-slate-400',
      pattern:
        'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.25) 0 2px, transparent 2px 6px)',
    },
  ];

  const team = $derived(inputs.mode !== 'subagents' && evaluation.workers > 1);
  const largest = $derived(Math.max(evaluation.solo.total, evaluation.fan.total, 1));

  /** How many times the shared context shows up in a bar, so the repeats are visible. */
  const sharedCopies = (breakdown: TokenBreakdown, fan: boolean): number =>
    fan && !team && breakdown.shared > 0 ? Math.min(evaluation.workers, 32) : 1;

  const rows = $derived([
    { id: 'solo', name: 'Solo', breakdown: evaluation.solo, fan: false },
    {
      id: 'fan',
      name: team
        ? `Team, ${formatMultiplier(teamMultiplierFor(inputs))} solo`
        : evaluation.workers === 1
          ? 'One worker'
          : `Fan-out, ${evaluation.workers} workers`,
      breakdown: evaluation.fan,
      fan: true,
    },
  ]);

  const describe = (breakdown: TokenBreakdown, fan: boolean): string =>
    parts
      .filter((part) => breakdown[part.id] > 0)
      .map((part) => {
        const copies = part.id === 'shared' ? sharedCopies(breakdown, fan) : 1;

        return copies > 1
          ? `${part.name} ${formatTokens(breakdown[part.id])} (${copies} × ${formatTokens(breakdown[part.id] / copies)})`
          : `${part.name} ${formatTokens(breakdown[part.id])}`;
      })
      .join(', ');
</script>

<div class="space-y-4">
  <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    {#each parts as part (part.id)}
      <li class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="inline-block size-3.5 rounded-sm {part.classes}"
          style:background-image={part.pattern === 'none' ? undefined : part.pattern}
        ></span>
        {part.name}
      </li>
    {/each}
  </ul>

  {#each rows as row (row.id)}
    <figure class="space-y-1.5" data-testid="{row.id}-bar">
      <figcaption class="flex flex-wrap justify-between gap-x-3 text-sm">
        <span class="font-semibold text-slate-800 dark:text-slate-100">{row.name}</span>
        <span class="text-slate-600 tabular-nums dark:text-slate-300">
          {formatTokens(row.breakdown.total)} tokens
        </span>
      </figcaption>
      <div
        role="img"
        aria-label="{row.name}: {formatTokens(row.breakdown.total)} tokens. {describe(
          row.breakdown,
          row.fan,
        )}."
        class="flex h-7 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
      >
        <div class="flex h-full" style:width="{(row.breakdown.total / largest) * 100}%">
          {#each parts as part (part.id)}
            {#if row.breakdown[part.id] > 0}
              {@const copies = part.id === 'shared' ? sharedCopies(row.breakdown, row.fan) : 1}
              {#each { length: copies }, copy (copy)}
                <div
                  class="h-full border-r border-white last:border-r-0 dark:border-slate-900 {part.classes}"
                  style:width="{(row.breakdown[part.id] / copies / row.breakdown.total) * 100}%"
                  style:background-image={part.pattern === 'none' ? undefined : part.pattern}
                  data-part={part.id}
                ></div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>
      <p class="text-sm text-slate-600 tabular-nums dark:text-slate-300">
        {describe(row.breakdown, row.fan) || 'Nothing to read or write.'}
      </p>
    </figure>
  {/each}

  {#if team}
    <p class="text-sm text-slate-600 dark:text-slate-300">
      A team’s bar is the solo session scaled by the course outline’s multiplier. The page doesn’t
      split a team’s tokens any further than that.
    </p>
  {/if}
</div>
