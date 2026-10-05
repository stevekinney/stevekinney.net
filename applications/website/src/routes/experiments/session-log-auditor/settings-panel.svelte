<script lang="ts">
  import { ArrowDown, ArrowUp, Trash2 } from '@lucide/svelte';

  import { formatCalendarDate } from '$lib/experiments/format';

  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    fieldClasses,
    headCellClasses,
    linkButtonClasses,
    tableClasses,
    tableRegionClasses,
  } from './field-styles';
  import { multiplierOf, readPrice } from './pricing';
  import type { PriceRow } from './pricing';
  import { categoriesOf, defaultRules, parseRules, serializeRules } from './rules';
  import type { Rule } from './rules';

  type Props = {
    rules: Rule[];
    prices: PriceRow[];
    defaultPrices: PriceRow[];
    pricesUpdated: string;
    onRules: (rules: Rule[]) => void;
    onPrices: (prices: PriceRow[]) => void;
  };

  const { rules, prices, defaultPrices, pricesUpdated, onRules, onPrices }: Props = $props();

  const subheadingClasses = 'text-lg font-bold text-slate-900 dark:text-white';
  const iconButtonClasses =
    'focus-visible:outline-primary-600 cursor-pointer rounded p-1 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';

  let importer: HTMLInputElement | undefined = $state();
  let rulesMessage = $state<string | null>(null);
  let nextId = 1;

  const categories = $derived(categoriesOf(rules));

  const editRule = (index: number, field: 'pattern' | 'category' | 'why', value: string): void =>
    onRules(
      rules.map((rule, position) => (position === index ? { ...rule, [field]: value } : rule)),
    );

  const moveRule = (index: number, offset: number): void => {
    const next = [...rules];
    const [rule] = next.splice(index, 1);
    next.splice(index + offset, 0, rule);
    onRules(next);
  };

  const addRule = (): void =>
    onRules([...rules, { id: `custom-${nextId++}`, pattern: '', category: '', why: '' }]);

  const importRules = async (event: Event & { currentTarget: HTMLInputElement }): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const parsed = parseRules(await file.text());
    if ('error' in parsed) {
      rulesMessage = parsed.error;

      return;
    }
    onRules(parsed.rules);
    rulesMessage = `Loaded ${parsed.rules.length} rules.`;
  };

  type PriceField = 'input' | 'cachedInput' | 'output' | 'cacheWrite5m' | 'cacheWrite1h';
  const priceFields: { field: PriceField; label: string }[] = [
    { field: 'input', label: 'Input' },
    { field: 'cachedInput', label: 'Cached input' },
    { field: 'output', label: 'Output' },
    { field: 'cacheWrite5m', label: 'Cache write, 5 minutes' },
    { field: 'cacheWrite1h', label: 'Cache write, 1 hour' },
  ];

  let invalid = $state<Record<string, true>>({});

  const editPrice = (index: number, field: PriceField, text: string): void => {
    const key = `${index}-${field}`;
    const value = readPrice(text);
    if (value === null) {
      invalid[key] = true;

      return;
    }
    delete invalid[key];
    onPrices(
      prices.map((row, position) => (position === index ? { ...row, [field]: value } : row)),
    );
  };

  const edited = $derived(
    prices.some((row, index) =>
      priceFields.some(({ field }) => row[field] !== defaultPrices[index]?.[field]),
    ),
  );
</script>

<div class="space-y-10">
  <section aria-labelledby="rules-heading" class="space-y-3">
    <h3 id="rules-heading" class={subheadingClasses}>Classification rules</h3>
    <p class="max-w-3xl {bodyClasses}">
      Rules run top to bottom, and the first match wins. A pattern is plain text matched without
      regard to case; separate alternatives with <code>|</code>. A category that starts with
      <code>floor:</code> counts toward the floor share. Anything no rule matches is unclassified.
    </p>
    <datalist id="category-options">
      {#each categories as category (category)}<option value={category}></option>{/each}
    </datalist>
    <div
      class={tableRegionClasses}
      role="region"
      aria-label="Classification rules table"
      tabindex="-1"
    >
      <table class={tableClasses} data-testid="rules-table">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Order</th>
            <th scope="col" class={headCellClasses}>Pattern</th>
            <th scope="col" class={headCellClasses}>Category</th>
            <th scope="col" class={headCellClasses}>Why</th>
            <th scope="col" class={headCellClasses}><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {#each rules as rule, index (rule.id)}
            <tr>
              <td class="{cellClasses} whitespace-nowrap">
                <span class="mr-1">{index + 1}</span>
                <button
                  type="button"
                  class={iconButtonClasses}
                  disabled={index === 0}
                  aria-label="Move rule {index + 1} up"
                  onclick={() => moveRule(index, -1)}
                  ><ArrowUp aria-hidden="true" class="size-4" /></button
                >
                <button
                  type="button"
                  class={iconButtonClasses}
                  disabled={index === rules.length - 1}
                  aria-label="Move rule {index + 1} down"
                  onclick={() => moveRule(index, 1)}
                  ><ArrowDown aria-hidden="true" class="size-4" /></button
                >
              </td>
              <td class={cellClasses}>
                <input
                  type="text"
                  aria-label="Rule {index + 1} pattern"
                  value={rule.pattern}
                  onchange={(event) => editRule(index, 'pattern', event.currentTarget.value)}
                  class="{fieldClasses} w-64 font-mono text-sm"
                />
              </td>
              <td class={cellClasses}>
                <input
                  type="text"
                  list="category-options"
                  aria-label="Rule {index + 1} category"
                  value={rule.category}
                  onchange={(event) => editRule(index, 'category', event.currentTarget.value)}
                  class="{fieldClasses} w-48 text-sm"
                />
              </td>
              <td class={cellClasses}>
                <input
                  type="text"
                  aria-label="Rule {index + 1} explanation"
                  value={rule.why}
                  onchange={(event) => editRule(index, 'why', event.currentTarget.value)}
                  class="{fieldClasses} w-72 text-sm"
                />
              </td>
              <td class={cellClasses}>
                <button
                  type="button"
                  class={iconButtonClasses}
                  aria-label="Delete rule {index + 1}"
                  onclick={() => onRules(rules.filter((_, position) => position !== index))}
                  ><Trash2 aria-hidden="true" class="size-4" /></button
                >
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class={buttonClasses} onclick={addRule}>Add a rule</button>
      <button
        type="button"
        class={buttonClasses}
        onclick={() =>
          downloadText('classification-rules.json', serializeRules(rules), 'application/json')}
      >
        Export rules
      </button>
      <button type="button" class={buttonClasses} onclick={() => importer?.click()}
        >Import rules</button
      >
      <button
        type="button"
        class={linkButtonClasses}
        onclick={() => onRules(defaultRules.map((rule) => ({ ...rule })))}
      >
        Restore the default rules
      </button>
      <input
        bind:this={importer}
        type="file"
        accept=".json,application/json"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        onchange={(event) => void importRules(event)}
      />
      {#if rulesMessage}<p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {rulesMessage}
        </p>{/if}
    </div>
  </section>

  <section aria-labelledby="prices-heading" class="space-y-3">
    <h3 id="prices-heading" class={subheadingClasses}>Prices</h3>
    <p class="max-w-3xl {bodyClasses}">
      Dollars per million tokens, from this site’s shared price table, checked {formatCalendarDate(
        pricesUpdated,
      )}. Cache writes are billed at 1.25 times the input price for five minutes and twice the input
      price for an hour; that’s an assumption about how the provider bills, so every price here is
      editable. A turn whose transcript doesn’t say how long it cached is billed at the five-minute
      rate.
    </p>
    <div class={tableRegionClasses} role="region" aria-label="Prices table" tabindex="-1">
      <table class={tableClasses} data-testid="prices-table">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Model</th>
            {#each priceFields as { field, label } (field)}
              <th scope="col" class={headCellClasses}>{label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each prices as row, index (row.id)}
            <tr>
              <th scope="row" class="{cellClasses} font-normal">
                {row.name}
                <code class="block text-xs text-slate-500 dark:text-slate-400">{row.id}</code>
              </th>
              {#each priceFields as { field, label } (field)}
                <td class={cellClasses}>
                  <input
                    type="text"
                    inputmode="decimal"
                    aria-label="{row.name} {label.toLowerCase()} price per million tokens"
                    aria-invalid={invalid[`${index}-${field}`] ? 'true' : undefined}
                    value={row[field]}
                    onchange={(event) => editPrice(index, field, event.currentTarget.value)}
                    class="{fieldClasses} w-24 text-sm"
                  />
                  {#if field === 'cacheWrite5m' || field === 'cacheWrite1h'}
                    <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {multiplierOf(row[field], row.input)} input
                    </span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if edited}
      <button
        type="button"
        class={linkButtonClasses}
        onclick={() => {
          invalid = {};
          onPrices(defaultPrices.map((row) => ({ ...row })));
        }}
      >
        Restore the shared prices
      </button>
    {/if}
  </section>
</div>
