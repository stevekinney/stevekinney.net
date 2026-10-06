<script lang="ts">
  import { Download, Plus, RotateCcw, Upload, X } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { downloadText } from './download';
  import { fieldClasses, hintClasses } from './field-styles';
  import NumberField from './number-field.svelte';
  import {
    MAX_EFFORT_FACTOR,
    MAX_NAME_LENGTH,
    MIN_EFFORT_FACTOR,
    MAX_MODELS,
    defaultPricing,
    isCustomPricing,
    parsePricingTable,
    serializePricingTable,
    uniqueModelId,
  } from './pricing';
  import type { EffortLevel, ModelPrice, PricingTable } from './pricing';

  type Props = {
    pricing: PricingTable;
    onChange: (table: PricingTable) => void;
  };

  const { pricing, onChange }: Props = $props();

  /** Files bigger than this aren't price tables. */
  const MAX_FILE_BYTES = 256 * 1024;

  let filePicker: HTMLInputElement | undefined = $state();
  let message = $state<string | null>(null);
  let problem = $state<string | null>(null);

  const editModel = (id: string, patch: Partial<ModelPrice>): void =>
    onChange({
      ...pricing,
      models: pricing.models.map((model) => (model.id === id ? { ...model, ...patch } : model)),
    });

  const editEffort = (id: string, patch: Partial<EffortLevel>): void =>
    onChange({
      ...pricing,
      efforts: pricing.efforts.map((effort) =>
        effort.id === id ? { ...effort, ...patch } : effort,
      ),
    });

  const addModel = (): void => {
    const name = 'New model';

    onChange({
      ...pricing,
      models: [
        ...pricing.models,
        { id: uniqueModelId(pricing, name), name, input: 1, output: 5, preservesCache: false },
      ],
    });
  };

  const removeModel = (id: string): void =>
    onChange({ ...pricing, models: pricing.models.filter((model) => model.id !== id) });

  const reset = (): void => {
    problem = null;
    message = 'Prices and assumptions are back to their defaults.';
    onChange(defaultPricing);
  };

  const exportTable = (): void => {
    problem = null;
    downloadText(
      'cache-break-even-prices.json',
      serializePricingTable(pricing),
      'application/json',
    );
    message = 'Exported the table as cache-break-even-prices.json.';
  };

  const importFile = async (event: Event & { currentTarget: HTMLInputElement }): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    message = null;
    problem = null;

    if (file.size > MAX_FILE_BYTES) {
      problem = 'That file is too large to be a price table.';

      return;
    }

    try {
      const result = parsePricingTable(JSON.parse(await file.text()));

      if (!result.ok) {
        problem = result.error;

        return;
      }

      onChange(result.table);
      message = `Imported ${result.table.models.length} ${
        result.table.models.length === 1 ? 'model' : 'models'
      }.${result.warnings.length > 0 ? ` ${result.warnings.join(' ')}` : ''}`;
    } catch {
      problem = 'That file isn’t valid JSON.';
    }
  };

  const headerClasses = 'px-3 py-2 text-left text-sm font-semibold';
  const checkboxClasses = 'accent-primary-600 dark:accent-primary-400 size-5 cursor-pointer';
</script>

<div class="space-y-6">
  <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
    Everything the calculator knows about models and effort levels is in these tables, in dollars
    per million tokens. Change a value and every figure on the page follows. Prices go stale, so
    check them against your provider.
  </p>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Models</h3>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
      tabindex="0"
      role="region"
      aria-label="Model prices"
    >
      <table class="w-full min-w-[40rem] border-collapse text-sm">
        <caption class="sr-only">Prices for each model, in dollars per million tokens.</caption>
        <thead>
          <tr
            class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <th scope="col" class={headerClasses}>Name</th>
            <th scope="col" class={headerClasses}>Input $/MTok</th>
            <th scope="col" class={headerClasses}>Output $/MTok</th>
            <th scope="col" class={headerClasses}>Can change effort without resetting cache</th>
            <th scope="col" class={headerClasses}><span class="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {#each pricing.models as model, index (model.id)}
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="px-3 py-2">
                <input
                  type="text"
                  value={model.name}
                  aria-label="Model {index + 1} name"
                  maxlength={MAX_NAME_LENGTH}
                  autocomplete="off"
                  spellcheck="false"
                  oninput={(event) => {
                    const name = event.currentTarget.value;

                    event.currentTarget.setAttribute('aria-invalid', String(!name.trim()));
                    if (name.trim()) editModel(model.id, { name });
                  }}
                  onblur={(event) => {
                    // A model needs a name, so an emptied field goes back to the one it has.
                    if (!event.currentTarget.value.trim()) event.currentTarget.value = model.name;
                    event.currentTarget.removeAttribute('aria-invalid');
                  }}
                  class="{fieldClasses} min-w-40 py-1.5"
                />
              </td>
              <td class="px-3 py-2">
                <NumberField
                  label="Model {index + 1} input price"
                  value={model.input}
                  onChange={(input) => editModel(model.id, { input })}
                />
              </td>
              <td class="px-3 py-2">
                <NumberField
                  label="Model {index + 1} output price"
                  value={model.output}
                  onChange={(output) => editModel(model.id, { output })}
                />
              </td>
              <td class="px-3 py-2">
                <input
                  type="checkbox"
                  checked={model.preservesCache}
                  aria-label="Model {index + 1} can change effort without resetting cache"
                  onchange={(event) =>
                    editModel(model.id, { preservesCache: event.currentTarget.checked })}
                  class={checkboxClasses}
                />
              </td>
              <td class="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="small"
                  icon={X}
                  disabled={pricing.models.length <= 1}
                  aria-label="Remove model {index + 1}"
                  onclick={() => removeModel(model.id)}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Button
      variant="secondary"
      size="small"
      icon={Plus}
      disabled={pricing.models.length >= MAX_MODELS}
      onclick={addModel}
    >
      Add a model
    </Button>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Effort levels</h3>
    <p class={hintClasses}>
      A factor is output volume relative to high. Untick “Sourced” for a number that no published
      run backs.
    </p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
      tabindex="0"
      role="region"
      aria-label="Effort factors"
    >
      <table class="w-full min-w-[24rem] border-collapse text-sm">
        <caption class="sr-only">Output volume factor for each effort level.</caption>
        <thead>
          <tr
            class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <th scope="col" class={headerClasses}>Effort</th>
            <th scope="col" class={headerClasses}>Factor</th>
            <th scope="col" class={headerClasses}>Sourced</th>
          </tr>
        </thead>
        <tbody>
          {#each pricing.efforts as effort (effort.id)}
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th
                scope="row"
                class="px-3 py-2 text-left font-medium text-slate-900 dark:text-slate-100"
              >
                {effort.label}
              </th>
              <td class="px-3 py-2">
                <NumberField
                  label="{effort.label} effort factor"
                  value={effort.factor}
                  allowZero={false}
                  min={MIN_EFFORT_FACTOR}
                  max={MAX_EFFORT_FACTOR}
                  onChange={(factor) => editEffort(effort.id, { factor })}
                />
              </td>
              <td class="px-3 py-2">
                <input
                  type="checkbox"
                  checked={effort.sourced}
                  aria-label="{effort.label} effort factor is sourced from published runs"
                  onchange={(event) =>
                    editEffort(effort.id, { sourced: event.currentTarget.checked })}
                  class={checkboxClasses}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <Button variant="secondary" icon={Download} onclick={exportTable}>Export</Button>
    <Button variant="secondary" icon={Upload} onclick={() => filePicker?.click()}>Import</Button>
    <Button
      variant="secondary"
      icon={RotateCcw}
      disabled={!isCustomPricing(pricing)}
      onclick={reset}
    >
      Reset to defaults
    </Button>
    <input
      bind:this={filePicker}
      type="file"
      accept="application/json,.json"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      onchange={importFile}
    />
  </div>
  <p class={hintClasses} role="status">{message ?? ''}</p>
  {#if problem}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
  {/if}
</div>
