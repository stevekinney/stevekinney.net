<script lang="ts">
  import { formatPrice } from '$lib/experiments/format';

  import { codeClasses } from './field-styles';
  import { CACHE_WRITE_MULTIPLIERS, modelsOffTheRatio } from './pricing';
  import type { CacheTtl, ModelPrice, Rates } from './pricing';

  type Props = {
    model: ModelPrice;
    models: ModelPrice[];
    rates: Rates;
    ttl: CacheTtl;
    warm: boolean;
  };

  const { model, models, rates, ttl, warm }: Props = $props();

  const offTheRatio = $derived(modelsOffTheRatio(models));
  const ttlName = $derived(ttl === '1h' ? '1-hour' : '5-minute');
  const headingClasses = 'text-lg font-bold text-slate-900 dark:text-white';
  const bodyClasses = 'text-slate-700 dark:text-slate-200';
</script>

<div class="max-w-3xl space-y-8">
  <section aria-labelledby="explain-turn" class="space-y-2">
    <h3 id="explain-turn" class={headingClasses}>How a turn is priced</h3>
    <p class={bodyClasses}>
      <code class={codeClasses}>
        turn cost = prefix × read + (input + output) × write + output × output price
      </code>
    </p>
    <p class={bodyClasses}>
      On {model.name} that’s {formatPrice(rates.read)} per million tokens to read from the cache (a tenth
      of the {formatPrice(rates.input)} input price), {formatPrice(rates.write)} to write to it ({CACHE_WRITE_MULTIPLIERS[
        ttl
      ]}× input, for the {ttlName} lifetime), and
      {formatPrice(rates.output)} for output. Every turn re-reads the whole prefix, so a long context
      is a recurring charge rather than a one-time one. That’s the only reason compacting can pay at all.
    </p>
  </section>

  <section aria-labelledby="explain-compact" class="space-y-2">
    <h3 id="explain-compact" class={headingClasses}>What compacting actually costs</h3>
    <p class={bodyClasses}>
      Compacting sends a separate summarization request. On a warm cache, that request reads your
      history at the cheap rate. After a break longer than the cache lifetime, it reprocesses
      everything at the full input price, which is why compacting a session you’ve just resumed is
      the expensive case. {warm
        ? 'Right now the cache is set to warm.'
        : 'Right now the cache is set to cold, so this is that expensive case.'}
      Then it pays for the summary to be generated, and for the cache to be rebuilt around the shorter
      prefix.
    </p>
  </section>

  <section aria-labelledby="explain-clear" class="space-y-2">
    <h3 id="explain-clear" class={headingClasses}>Clearing is cheaper and lossier</h3>
    <p class={bodyClasses}>
      Clearing throws the history away. You pay to rebuild the baseline prefix and whatever you
      deliberately re-read. The re-read slider is the honest version of that cost: push it up and
      clearing converges on compacting, then overtakes it. The numbers can’t show what a clear
      forgets, such as why you made a decision.
    </p>
  </section>

  <section aria-labelledby="explain-model" class="space-y-2">
    <h3 id="explain-model" class={headingClasses}>The turn count barely depends on the model</h3>
    {#if offTheRatio.length === 0}
      <p class={bodyClasses}>
        Every model in the price table prices output at 5× input, and the read and write rates are
        fixed multiples of input. Switching models therefore scales all three lines together. Model
        choice changes how much you spend, not when to compact.
      </p>
    {:else}
      <p class={bodyClasses}>
        With the default prices, every model prices output at 5× input, and the read and write rates
        are fixed multiples of input, so switching models scales all three lines together. Your
        edited price table breaks that for {offTheRatio.map((entry) => entry.name).join(', ')},
        where output isn’t 5× input. Those models can move the crossover as well as the totals. The
        sensitivity panel shows by how much.
      </p>
    {/if}
  </section>

  <section aria-labelledby="explain-simplifications" class="space-y-2">
    <h3 id="explain-simplifications" class={headingClasses}>Simplifications</h3>
    <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
      <li>Turn size is held constant, and real turns are spikier.</li>
      <li>The summary lands at exactly the size you set.</li>
      <li>The baseline prefix is fixed.</li>
      <li>
        Auto-compaction isn’t modelled, so a long projection can run past where it would fire.
      </li>
      <li>
        Latency, a summary that drops something you needed, and the cost of re-deriving it are all
        real, and none of them is counted.
      </li>
      <li>Prices are the ones in the table above, not live prices.</li>
    </ul>
  </section>
</div>
