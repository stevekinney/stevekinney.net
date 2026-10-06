<script lang="ts">
  import { formatCalendarDate, formatPrice } from '$lib/experiments/format';

  import { codeClasses } from './field-styles';
  import type { CacheTtl, ModelPrice, Rates } from './pricing';

  type Props = {
    model: ModelPrice;
    destination: ModelPrice | null;
    rates: Rates;
    switchRates: Rates | null;
    ttl: CacheTtl;
    /** When the shared price table was last checked. */
    updated: string;
  };

  const { model, destination, rates, switchRates, ttl, updated }: Props = $props();

  const ttlName = $derived(ttl === '1h' ? '1-hour' : '5-minute');
  const headingClasses = 'text-lg font-bold text-slate-900 dark:text-white';
  const bodyClasses = 'text-slate-700 dark:text-slate-200';
</script>

<div class="max-w-3xl space-y-8">
  <section aria-labelledby="explain-turn" class="space-y-2">
    <h3 id="explain-turn" class={headingClasses}>How a turn is priced</h3>
    <p class={bodyClasses}>
      <code class={codeClasses}>
        turn cost = prefix × cache read + (input + output) × cache write + output × output price
      </code>
    </p>
    <p class={bodyClasses}>
      On {model.name} that’s {formatPrice(rates.read)} per million tokens to read from the cache,
      {formatPrice(rates.write)} to write to it for the {ttlName} lifetime, and
      {formatPrice(rates.output)} for output. Every turn re-reads the whole prefix, so a long context
      is a recurring charge rather than a one-time one. When the cache has expired, the next turn writes
      the whole prefix back at the write price instead of reading it.
    </p>
  </section>

  <section aria-labelledby="explain-compact" class="space-y-2">
    <h3 id="explain-compact" class={headingClasses}>What compacting costs</h3>
    <p class={bodyClasses}>
      Compacting reads your history once to summarize it (at the cache-read price when the cache is
      warm, the full input price when it isn’t), generates the summary at the output price, and
      writes the shorter prefix back to the cache. After that, every turn re-reads the summary and
      the baseline instead of everything.
    </p>
  </section>

  <section aria-labelledby="explain-switch" class="space-y-2">
    <h3 id="explain-switch" class={headingClasses}>What switching models costs</h3>
    <p class={bodyClasses}>
      Each model has its own cache, so switching writes your whole context to the new model’s cache
      at its write price{#if destination && switchRates}: {formatPrice(switchRates.write)} per million
        tokens on {destination.name}{/if}. That’s the one-time cost. After it, every turn is priced
      on the cheaper model, and the savings have to add up to the re-write before switching pays. A
      bigger context makes the re-write bigger, which is why switching pays back fastest early in a
      session or right after compacting. Changing the effort level mid-session can reset the cache
      the same way.
    </p>
  </section>

  <section aria-labelledby="explain-simplifications" class="space-y-2">
    <h3 id="explain-simplifications" class={headingClasses}>What this leaves out</h3>
    <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
      <li>
        Dollars are the smaller reason to compact. A long, stale context also makes the model worse,
        and a cheaper model may need more turns, and neither has a price here.
      </li>
      <li>Turn size is held constant, and real turns are spikier.</li>
      <li>The summary lands at exactly the size you set, and the baseline prefix is fixed.</li>
      <li>Auto-compaction isn’t modeled, so a long projection can run past where it would fire.</li>
      <li>Prices come from the shared price table, last checked {formatCalendarDate(updated)}.</li>
    </ul>
  </section>
</div>
