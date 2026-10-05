<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import { accumulatingCumulative, crossoverIteration, freshCumulative } from './cost';
  import { bodyClasses } from './field-styles';
  import type { Config } from './loop-config';

  type Props = { config: Config };

  const { config }: Props = $props();

  const crossover = $derived(crossoverIteration(config.r, config.g));
  const rows = $derived(
    Array.from({ length: Math.min(30, Math.max(6, (crossover ?? 0) + 2)) }, (_, index) => {
      const n = index + 1;
      const fresh = freshCumulative(n, config.c0, config.r);
      const accumulating = accumulatingCumulative(n, config.c0, config.g);

      return {
        n,
        fresh,
        accumulating,
        cheaper: fresh < accumulating ? 'fresh' : fresh > accumulating ? 'accumulating' : 'tie',
      };
    }),
  );
</script>

<div class="space-y-3">
  <p class="font-semibold text-slate-900 dark:text-white" data-testid="crossover">
    {#if crossover === null}
      With no growth per iteration, an accumulating context never costs more than a fresh one.
    {:else if crossover <= 1}
      Fresh context is cheaper in total from the first iteration on.
    {:else}
      From iteration {crossover} on, fresh context is cheaper in total, because n &gt; 2r/g + 1 = {Number(
        ((2 * config.r) / config.g + 1).toFixed(3),
      )}.
    {/if}
  </p>
  <p class={bodyClasses}>
    Fresh costs {formatCost(config.c0)} + {formatCost(config.r)} every iteration. Accumulating costs
    {formatCost(config.c0)} + {formatCost(config.g)} × i at iteration i, so its total grows with the square
    of the iteration count.
  </p>
  <div class="relative max-h-72 overflow-auto">
    <table class="w-full text-sm tabular-nums" data-testid="cost-comparison">
      <caption class="sr-only">Cumulative cost of fresh against accumulating context</caption>
      <thead>
        <tr class="text-left text-slate-500 dark:text-slate-400">
          <th scope="col" class="py-1 pr-3 font-medium">After</th>
          <th scope="col" class="py-1 pr-3 text-right font-medium">Fresh</th>
          <th scope="col" class="py-1 pr-3 text-right font-medium">Accumulating</th>
          <th scope="col" class="py-1 text-right font-medium">Cheaper</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.n)}
          <tr
            class="border-t border-slate-100 dark:border-slate-800 {row.n === crossover
              ? 'bg-emerald-50 dark:bg-emerald-950/40'
              : ''}"
            data-iterations={row.n}
          >
            <th scope="row" class="py-1 pr-3 text-left font-normal"
              >{row.n} {row.n === 1 ? 'iteration' : 'iterations'}</th
            >
            <td class="py-1 pr-3 text-right">{formatCost(row.fresh)}</td>
            <td class="py-1 pr-3 text-right">{formatCost(row.accumulating)}</td>
            <td class="py-1 text-right"
              >{row.cheaper === 'tie'
                ? 'Same'
                : row.cheaper === 'fresh'
                  ? 'Fresh'
                  : 'Accumulating'}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
