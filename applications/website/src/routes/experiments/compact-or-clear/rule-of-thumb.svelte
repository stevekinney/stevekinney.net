<script lang="ts">
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

  import { bodyClasses, headingClasses } from './field-styles';
  import type { SessionPricing } from './pricing';
  import { PAYBACK_HORIZON, project } from './projection';
  import { createScenario, defaultAssumptions, findModel, toProjectionInputs } from './scenario';

  type Props = { pricing: SessionPricing };

  const { pricing }: Props = $props();

  // Computed with the same projection as the calculator below, from its default scenario.
  const contexts = [50_000, 100_000, 200_000, 400_000, 800_000];

  const model = $derived(findModel(pricing.models, pricing.defaultModelId));
  const destination = $derived(findModel(pricing.models, pricing.defaultSwitchId));

  const rows = $derived.by(() => {
    const scenario = createScenario(pricing);
    const payback = (contextNow: number, warm: boolean) =>
      project(
        toProjectionInputs(
          { ...scenario, contextNow, warm, turns: PAYBACK_HORIZON },
          pricing.models,
        ),
      );

    return contexts.map((contextNow) => {
      const warm = payback(contextNow, true);

      return {
        contextNow,
        warm: warm.compactCrossover,
        cold: payback(contextNow, false).compactCrossover,
        switch: warm.switchCrossover,
      };
    });
  });

  const turnsLabel = (turns: number | null): string =>
    turns === null ? `Not within ${PAYBACK_HORIZON}` : turns <= 1 ? 'Right away' : `${turns} turns`;

  const cellClasses = 'px-3 py-2 text-right tabular-nums';
</script>

<section aria-labelledby="rule-heading" class="max-w-3xl space-y-4">
  <h2 id="rule-heading" class={headingClasses}>The short version</h2>
  <ul class="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-200">
    <li>
      <strong>Under about 50K tokens, don't compact.</strong> It takes around thirty turns to pay for
      itself.
    </li>
    <li>
      <strong>Past about 200K, with more than a dozen turns of work left,</strong> compact. Every turn
      re-reads everything, so a big context is the cost.
    </li>
    <li>
      <strong>Switch to a cheaper model early, not late.</strong> Switching re-writes your whole context
      to the new model's cache, so the bigger the context, the longer it takes to earn that back. Compacting
      first shrinks the bill.
    </li>
    <li>
      <strong>If you've been away longer than the cache lasts, act now.</strong> The next turn pays to
      rebuild the whole context anyway, so compacting or switching first costs almost nothing extra.
    </li>
    <li>
      <strong>Starting a different task? Just clear.</strong> There's nothing to compare, because you
      don't need the old context at all.
    </li>
  </ul>

  <div class="space-y-2">
    <p class={bodyClasses}>
      How long each move takes to pay for itself on {model.name}, when every turn adds {formatTokens(
        defaultAssumptions.inputPerTurn,
      )} tokens of input and {formatTokens(defaultAssumptions.outputPerTurn)} of output, and a {defaultAssumptions.summaryPercent}%
      summary replaces the history. These are the calculator's defaults.
    </p>
    <div class="relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table class="w-full min-w-[30rem] border-collapse text-sm" data-testid="rule-of-thumb">
        <caption class="sr-only">
          Turns until compacting, or switching to {destination.name}, is cheaper than keeping going,
          by context size.
        </caption>
        <thead>
          <tr
            class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <th scope="col" class="px-3 py-2 text-left font-semibold">Context now</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Compact, cache warm</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Compact, cache expired</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">
              Switch to {destination.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.contextNow)}
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th scope="row" class="px-3 py-2 text-left font-semibold tabular-nums">
                {formatTokens(row.contextNow)}
              </th>
              <td class={cellClasses}>{turnsLabel(row.warm)}</td>
              <td class={cellClasses}>{turnsLabel(row.cold)}</td>
              <td class={cellClasses}>{turnsLabel(row.switch)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class={bodyClasses}>
      The switch column assumes a warm cache. With an expired one, switching pays off right away
      too.
    </p>
  </div>
</section>
