<script lang="ts">
  import { Download, Plus, RotateCcw, Trash2, Upload } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { bodyClasses, hintClasses } from './field-styles';
  import {
    defaultModels,
    MAXIMUM_MODELS,
    MODEL_ID_PATTERN,
    parsePriceTable,
    pricesEqual,
    serializePriceTable,
  } from './pricing';
  import type { ModelPrice } from './pricing';
  import TextCell from './text-cell.svelte';

  type Props = {
    models: ModelPrice[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (models: ModelPrice[]) => void;
    onDownload: (fileName: string, contents: string, type: string) => void;
  };

  const { models, open, onOpenChange, onChange, onDownload }: Props = $props();

  const MAXIMUM_IMPORT_BYTES = 200_000;

  let message = $state<string | null>(null);
  let problem = $state<string | null>(null);
  let importInput: HTMLInputElement | undefined = $state();

  const custom = $derived(!pricesEqual(models, defaultModels));

  const replace = (index: number, patch: Partial<ModelPrice>): void => {
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

  const validateName = (text: string): string | null =>
    text.trim() ? null : 'A model needs a name.';

  const validateId = (text: string, index: number): string | null => {
    const id = text.trim();
    if (!MODEL_ID_PATTERN.test(id)) {
      return 'Use lowercase letters, numbers, and hyphens, up to 60 characters.';
    }

    return models.some((model, position) => position !== index && model.id === id)
      ? 'Another model already uses that ID.'
      : null;
  };

  const addModel = (): void => {
    if (models.length >= MAXIMUM_MODELS) return;

    let number = models.length + 1;
    while (models.some((model) => model.id === `model-${number}`)) number += 1;

    onChange([...models, { id: `model-${number}`, name: `Model ${number}`, input: 5, output: 25 }]);
    message = 'Added a row. Give it the ID your session reports, such as opus-5-5, to match it.';
    problem = null;
  };

  const removeModel = (index: number): void => {
    if (models.length <= 1) {
      problem = 'The table needs at least one model.';

      return;
    }

    onChange(models.filter((_, position) => position !== index));
    problem = null;
    message = null;
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
    onChange(defaultModels.map((model) => ({ ...model })));
    message = 'Prices reset to the defaults.';
    problem = null;
  };
</script>

<details
  {open}
  ontoggle={(event) => onOpenChange(event.currentTarget.open)}
  class="rounded-lg border border-slate-200 dark:border-slate-700"
  data-testid="price-table"
>
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
      Prices are dollars per million tokens, and they’re the specification’s defaults, not live
      prices. Edit any of them. A session’s model matches a row when its ID, without the
      <code>claude-</code> prefix, date, or <code>[1m]</code> suffix, equals the row’s ID.
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
          Model prices in dollars per million tokens. Every cell is editable.
        </caption>
        <thead class="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th scope="col" class="px-3 py-2 text-left font-semibold">Name</th>
            <th scope="col" class="px-3 py-2 text-left font-semibold">Match ID</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold whitespace-nowrap"
              >Input $/MTok</th
            >
            <th scope="col" class="px-3 py-2 text-right font-semibold whitespace-nowrap"
              >Output $/MTok</th
            >
            <th scope="col" class="px-3 py-2"><span class="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
          {#each models as model, index (index)}
            <tr class="bg-white dark:bg-slate-900">
              <td class="px-3 py-2">
                <TextCell
                  label="Name of model {index + 1}"
                  value={model.name}
                  validate={validateName}
                  onCommit={(text) => replace(index, { name: text.trim() })}
                />
              </td>
              <td class="px-3 py-2">
                <TextCell
                  label="Match ID of {model.name}"
                  value={model.id}
                  validate={(text) => validateId(text, index)}
                  onCommit={(text) => replace(index, { id: text.trim() })}
                />
              </td>
              <td class="px-3 py-2 text-right">
                <TextCell
                  numeric
                  label="Input price of {model.name}"
                  value={String(model.input)}
                  validate={validatePrice}
                  onCommit={(text) => replace(index, { input: Number(text) })}
                />
              </td>
              <td class="px-3 py-2 text-right">
                <TextCell
                  numeric
                  label="Output price of {model.name}"
                  value={String(model.output)}
                  validate={validatePrice}
                  onCommit={(text) => replace(index, { output: Number(text) })}
                />
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  type="button"
                  onclick={() => removeModel(index)}
                  aria-label="Remove {model.name}"
                  class="focus-visible:outline-primary-600 cursor-pointer rounded p-1 text-slate-600 hover:text-red-700 focus-visible:outline-2 dark:text-slate-300 dark:hover:text-red-400"
                >
                  <Trash2 aria-hidden="true" class="size-4" />
                </button>
              </td>
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
        icon={Plus}
        onclick={addModel}
        disabled={models.length >= MAXIMUM_MODELS}>Add a model</Button
      >
      <Button
        variant="secondary"
        size="small"
        icon={Download}
        onclick={() =>
          onDownload(
            'compact-or-clear-prices.json',
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
        Reset to defaults
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
