<script lang="ts">
  import type { ChangeEvaluation } from './calculate';
  import { formatPlainDollars, formatRatio, ttlLabel } from './display';
  import { formatPriceNumber } from './pricing';
  import type { PricingTable } from './pricing';
  import { headingClasses } from './field-styles';

  type Props = { evaluation: ChangeEvaluation; pricing: PricingTable };

  const { evaluation, pricing }: Props = $props();

  const multiplier = $derived(evaluation.ttl === '1h' ? 2 : 1.25);
  const hasPlaceholder = $derived(pricing.efforts.some((effort) => !effort.sourced));
</script>

<section aria-labelledby="explanation-heading" class="max-w-3xl space-y-6">
  <h2 id="explanation-heading" class={headingClasses}>How this works</h2>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">The two levers</h3>
    <p class="text-slate-700 dark:text-slate-200">
      Changing the model and changing the effort level both reprocess everything already in context.
      Either one costs <code class="font-mono text-[0.9em]"
        >N × destination input price × write multiplier</code
      >.
      {#if evaluation.unchanged}
        Right now your destination matches your starting point, so nothing is being re-cached and
        the cost is $0.00.
      {:else}
        Right now that is {evaluation.contextTokens.toLocaleString('en-US')} × ${formatPriceNumber(
          evaluation.to.input,
        )} × {multiplier} ÷ 1,000,000 = {formatPlainDollars(evaluation.cost)}.
      {/if}
      The multiplier is 2× on a 1-hour TTL and 1.25× on a 5-minute one, because the coding tool caches
      automatically. You’re on the {ttlLabel(evaluation.ttl)} TTL.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Where they differ</h3>
    <p class="text-slate-700 dark:text-slate-200">
      A model switch changes the price of each output token. An effort change changes how many
      tokens get generated. The value of what’s left is
      <code class="font-mono text-[0.9em]">R × (from output − ratio × to output)</code>,
      {#if evaluation.unchanged}
        which is $0.00 right now, because nothing is changing.
      {:else}
        which is {evaluation.remainingOutput.toLocaleString('en-US')} × (${formatPriceNumber(
          evaluation.from.output,
        )}
        − {formatRatio(evaluation.ratio)} × ${formatPriceNumber(evaluation.to.output)}) ÷ 1,000,000
        = {formatPlainDollars(evaluation.value)}.
      {/if}
      That’s why an effort-only change on an expensive model can cost more to carry out than switching
      to a cheaper one: the re-cache is priced wherever you land.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Effort ratios</h3>
    <p class="text-slate-700 dark:text-slate-200">
      Each factor is output volume relative to <code class="font-mono text-[0.9em]">high</code>:
    </p>
    <ul class="flex flex-wrap gap-x-5 gap-y-1 text-slate-700 tabular-nums dark:text-slate-200">
      {#each pricing.efforts as effort (effort.id)}
        <li>
          {effort.label}: {formatRatio(effort.factor)}{effort.sourced ? '' : '*'}
        </li>
      {/each}
    </ul>
    {#if hasPlaceholder}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        * Placeholder. No published runs back this number, so override the ratio when you know
        better.
      </p>
    {/if}
    <p class="text-slate-700 dark:text-slate-200">
      In the published long-horizon coding runs behind the sourced factors, medium effort costs
      roughly half as much per task and gives up about 2 points of pass rate. Low costs about a
      quarter and gives up about 8 points. Effort curves depend on the workload: research and
      knowledge work is much flatter than coding.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Simplifications</h3>
    <ul class="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
      <li>R counts output tokens only.</li>
      <li>
        Fresh input you add later costs less on a cheaper model, and future turns read your context
        at the destination’s cache-read rate. Both make real break-evens more favorable than the
        ones shown here.
      </li>
      <li>
        Some models also invalidate the tools and system caches on an effort change. This page
        treats everything as a full re-read.
      </li>
    </ul>
  </div>
</section>
