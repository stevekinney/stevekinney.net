<script lang="ts">
  import type { Snippet } from 'svelte';

  import { formatPercent, formatTokens, percentOf, segments, usable } from './budget';
  import type { Scenario } from './budget';

  type Props = {
    name: string;
    scenario: Scenario;
    /** The line under the bar, such as a preset's notice. */
    children?: Snippet;
  };

  const { name, scenario, children }: Props = $props();

  const left = $derived(usable(scenario));
  const parts = $derived(segments(scenario));
  const description = $derived(
    parts.map((part) => `${part.name} ${formatTokens(part.tokens)}`).join(', '),
  );
</script>

<li class="space-y-2" data-testid="budget-bar" data-name={name}>
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h3 class="font-semibold text-slate-900 dark:text-white">{name}</h3>
    <p class="text-sm text-slate-700 tabular-nums dark:text-slate-200" data-testid="bar-free">
      {#if left > 0}
        <strong class="text-slate-900 dark:text-white">{formatTokens(left)}</strong> free of
        {formatTokens(scenario.capacity)} ({formatPercent(percentOf(left, scenario.capacity), 0)})
      {:else}
        <strong class="text-red-700 dark:text-red-400">Over by {formatTokens(-left)}</strong>
        against {formatTokens(scenario.capacity)}
      {/if}
    </p>
  </div>
  <div
    role="img"
    aria-label="{name}: {description}"
    class="flex h-8 w-full gap-0.5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
  >
    {#each parts as part (part.key)}
      <div
        class="{part.fill} h-full first:rounded-l-md last:rounded-r-md"
        style:width="{part.percent}%"
        title="{part.name}: {formatTokens(part.tokens)} ({formatPercent(
          percentOf(part.tokens, scenario.capacity),
        )} of the window)"
        data-segment={part.key}
        data-tokens={part.tokens}
      ></div>
    {/each}
  </div>
  {#if children}
    <div class="text-sm text-slate-600 dark:text-slate-300">{@render children()}</div>
  {/if}
</li>
