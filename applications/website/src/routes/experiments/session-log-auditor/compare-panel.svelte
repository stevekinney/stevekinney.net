<script lang="ts">
  import type { Cluster } from './clusters';
  import { comparePeriods, halves } from './compare';
  import type { PeriodChange } from './compare';
  import {
    bodyClasses,
    codeClasses,
    fieldClasses,
    labelClasses,
    wrapAnywhere,
  } from './field-styles';

  type Props = { clusters: Cluster[]; firstDay: string | null; lastDay: string | null };

  const { clusters, firstDay, lastDay }: Props = $props();

  const initial = (): { a: { from: string; to: string }; b: { from: string; to: string } } =>
    firstDay && lastDay
      ? halves(firstDay, lastDay)
      : { a: { from: '', to: '' }, b: { from: '', to: '' } };

  const start = initial();
  let periods = $state({ ...start, threshold: 50 });

  const valid = $derived(
    [periods.a.from, periods.a.to, periods.b.from, periods.b.to].every(Boolean) &&
      periods.a.from <= periods.a.to &&
      periods.b.from <= periods.b.to,
  );
  const comparison = $derived(
    valid ? comparePeriods(clusters, periods.a, periods.b, periods.threshold / 100) : null,
  );

  const groups = $derived(
    comparison
      ? [
          { id: 'appeared', title: 'Appeared in B', items: comparison.appeared },
          { id: 'disappeared', title: 'Gone in B', items: comparison.disappeared },
          {
            id: 'changed',
            title: `Changed by more than ${periods.threshold}%`,
            items: comparison.changed,
          },
        ]
      : [],
  );

  const fields = [
    { period: 'a' as const, edge: 'from' as const, label: 'Period A from' },
    { period: 'a' as const, edge: 'to' as const, label: 'Period A to' },
    { period: 'b' as const, edge: 'from' as const, label: 'Period B from' },
    { period: 'b' as const, edge: 'to' as const, label: 'Period B to' },
  ];

  const describe = (item: PeriodChange): string =>
    `${item.sessionsA} → ${item.sessionsB} session${item.sessionsB === 1 ? '' : 's'}`;
</script>

<div class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    {#each fields as field (`${field.period}-${field.edge}`)}
      <div class="space-y-1.5">
        <label for="period-{field.period}-{field.edge}" class={labelClasses}>{field.label}</label>
        <input
          id="period-{field.period}-{field.edge}"
          type="date"
          value={periods[field.period][field.edge]}
          onchange={(event) => (periods[field.period][field.edge] = event.currentTarget.value)}
          class="{fieldClasses} w-full"
        />
      </div>
    {/each}
    <div class="space-y-1.5">
      <label for="period-threshold" class={labelClasses}>Threshold (%)</label>
      <input
        id="period-threshold"
        type="number"
        min="0"
        max="1000"
        step="5"
        value={periods.threshold}
        oninput={(event) => {
          const value = Number(event.currentTarget.value);
          if (Number.isFinite(value) && value >= 0) periods.threshold = value;
        }}
        class="{fieldClasses} w-full"
      />
    </div>
  </div>
  <p class={bodyClasses}>
    Counts are sessions affected in each period, so a retry storm counts once.
  </p>

  {#if !valid}
    <p class={bodyClasses}>Choose a start and end for both periods.</p>
  {:else}
    <div class="grid gap-4 md:grid-cols-3" data-testid="comparison">
      {#each groups as group (group.id)}
        <section aria-labelledby="compare-{group.id}" class="min-w-0 space-y-2">
          <h3 id="compare-{group.id}" class="font-semibold text-slate-900 dark:text-white">
            {group.title} ({group.items.length})
          </h3>
          {#if group.items.length === 0}
            <p class={bodyClasses}>None.</p>
          {:else}
            <ul class="space-y-2 text-sm">
              {#each group.items as item (item.key)}
                <li class="space-y-0.5">
                  <code class="{codeClasses} {wrapAnywhere}">{item.signature}</code>
                  <span class="block text-xs text-slate-500 dark:text-slate-400 {wrapAnywhere}">
                    {item.tool}, {item.category}: {describe(item)}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</div>
