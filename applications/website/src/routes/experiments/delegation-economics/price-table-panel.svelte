<script lang="ts">
  import { Download, RotateCcw, Upload } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { formatCalendarDate } from '$lib/experiments/format';

  import { downloadText } from './download';
  import { bodyClasses, hintClasses } from './field-styles';
  import { parsePriceTable, pricesEqual, serializePriceTable } from './pricing';
  import type { WorkerModel } from './pricing';
  import TextCell from './text-cell.svelte';

  type Props = {
    models: WorkerModel[];
    /** The shared price table's rows, for resetting. */
    standardModels: WorkerModel[];
    updated: string;
    onChange: (models: WorkerModel[]) => void;
  };

  const { models, standardModels, updated, onChange }: Props = $props();

  const MAXIMUM_IMPORT_BYTES = 200_000;

  let message = $state<string | null>(null);
  let problem = $state<string | null>(null);
  let importInput: HTMLInputElement | undefined = $state();

  const custom = $derived(!pricesEqual(models, standardModels));

  type PriceField = 'input' | 'cachedInput' | 'output';

  const columns: { field: PriceField; label: string }[] = [
    { field: 'input', label: 'Input' },
    { field: 'cachedInput', label: 'Cached input' },
    { field: 'output', label: 'Output' },
  ];

  const replace = (index: number, patch: Partial<WorkerModel>): void => {
    onChange(
      models.map((model, position) => (position === index ? { ...model, ...patch } : model)),
    );
  };

  const validatePrice = (text: string): string | null => {
    const price = Number(text.trim());

    return text.trim() !== '' && Number.isFinite(price) && price > 0 && price <= 100_000
      ? null
      : 'Enter a price above zero, in dollars per million tokens.';
  };

  const importFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;

    problem = null;
    message = null;

    if (file.size > MAXIMUM_IMPORT_BYTES) {
      problem = 'That file is too large to be a price table.';

      return;
    }

    try {
      const parsed = parsePriceTable(await file.text());

      if ('error' in parsed) {
        problem = parsed.error;

        return;
      }

      onChange(parsed.models);
      message = `Imported ${parsed.models.length} ${parsed.models.length === 1 ? 'model' : 'models'}.`;
    } catch {
      problem = 'That file couldn’t be read.';
    }
  };

  const reset = (): void => {
    onChange(standardModels.map((model) => ({ ...model })));
    message = 'Prices reset to the shared price table.';
    problem = null;
  };
</script>

<details class="rounded-lg border border-slate-200 dark:border-slate-700" data-testid="price-table">
  <summary
    class="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 hover:text-slate-950 dark:text-slate-100 dark:hover:text-white"
  >
    Price table
    <span class="font-normal text-slate-600 dark:text-slate-300">
      ({models.length}
      {models.length === 1 ? 'model' : 'models'})
    </span>
    {#if custom}
      <span
        class="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-700"
      >
        custom prices
      </span>
    {/if}
  </summary>

  <div class="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
    <p class="max-w-3xl {bodyClasses}">
      Dollars per million tokens, from the site’s shared price table, last checked {formatCalendarDate(
        updated,
      )}. They aren’t fetched live. Edit any of them, or export and import the table as JSON.
    </p>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
      tabindex="0"
      role="region"
      aria-label="Editable prices"
    >
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">
          Worker model prices in dollars per million tokens. Every price is editable.
        </caption>
        <thead class="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th scope="col" class="px-3 py-2 text-left font-semibold">Model</th>
            {#each columns as column (column.field)}
              <th scope="col" class="px-3 py-2 text-right font-semibold whitespace-nowrap">
                {column.label}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
          {#each models as model, index (model.id)}
            <tr class="bg-white dark:bg-slate-900">
              <th
                scope="row"
                class="px-3 py-2 text-left font-normal [overflow-wrap:anywhere] text-slate-900 dark:text-white"
              >
                {model.name}
              </th>
              {#each columns as column (column.field)}
                <td class="px-3 py-2 text-right">
                  <TextCell
                    numeric
                    label="{column.label} price of {model.name}"
                    value={String(model[column.field])}
                    validate={validatePrice}
                    onCommit={(text) => replace(index, { [column.field]: Number(text) })}
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class={hintClasses}>
      A red border means the value isn’t usable, and the last good one stays in effect.
    </p>

    <div class="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="small"
        icon={Download}
        onclick={() =>
          downloadText(
            'delegation-economics-prices.json',
            serializePriceTable(models),
            'application/json',
          )}
      >
        Export JSON
      </Button>
      <Button variant="secondary" size="small" icon={Upload} onclick={() => importInput?.click()}>
        Import JSON
      </Button>
      <Button variant="secondary" size="small" icon={RotateCcw} disabled={!custom} onclick={reset}>
        Reset to the shared table
      </Button>
    </div>
    <input
      bind:this={importInput}
      type="file"
      accept=".json,application/json"
      aria-label="Import a price table"
      class="sr-only"
      tabindex="-1"
      onchange={async (event) => {
        await importFile(event.currentTarget.files?.[0]);
        event.currentTarget.value = '';
      }}
    />
    <p class={hintClasses}>An imported file is read in your browser. Nothing is uploaded.</p>

    <p class="min-h-5 text-sm text-slate-700 dark:text-slate-200" aria-live="polite">{message}</p>
    {#if problem}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
    {/if}
  </div>
</details>
