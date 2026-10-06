<script lang="ts">
  import { Save, X } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import Button from '$lib/components/button';

  import type { CalculatorState } from './calculator-state';
  import { formatPlainDollars, formatSignedDollars, formatTokens } from './display';
  import {
    fieldClasses,
    headingClasses,
    hintClasses,
    labelClasses,
    panelClasses,
  } from './field-styles';
  import type { PricingTable } from './pricing';
  import {
    MAX_COMPARED,
    addScenario,
    browserStorage,
    compareScenarios,
    loadScenarios,
    storeScenarios,
  } from './scenarios';
  import type { SavedScenario } from './scenarios';

  type Props = {
    setup: CalculatorState;
    pricing: PricingTable;
    onLoad: (state: CalculatorState) => void;
  };

  const { setup, pricing, onLoad }: Props = $props();

  let scenarios = $state<SavedScenario[]>([]);
  let name = $state('');
  let compared = $state<string[]>([]);
  let notice = $state<string | null>(null);

  onMount(() => {
    scenarios = loadScenarios(browserStorage());
  });

  const persist = (next: SavedScenario[]): void => {
    scenarios = next;
    compared = compared.filter((id) => next.some((scenario) => scenario.id === id));

    if (!storeScenarios(browserStorage(), next)) {
      notice = 'This browser wouldn’t store the scenarios, so they’ll be gone when you leave.';
    }
  };

  const save = (): void => {
    const saved = name.trim().slice(0, 60) || 'Untitled scenario';

    notice = `Saved “${saved}”.`;
    persist(addScenario(scenarios, name, setup));
    name = '';
  };

  const toggle = (id: string): void => {
    compared = compared.includes(id)
      ? compared.filter((candidate) => candidate !== id)
      : compared.length < MAX_COMPARED
        ? [...compared, id]
        : compared;
  };

  const comparison = $derived(
    compareScenarios(
      scenarios.filter((scenario) => compared.includes(scenario.id)),
      pricing,
    ),
  );
</script>

<section aria-labelledby="scenarios-heading" class={panelClasses}>
  <div class="space-y-1">
    <h2 id="scenarios-heading" class={headingClasses}>Saved scenarios</h2>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Save the setup above under a name to come back to it, and pick up to three to compare side by
      side. Scenarios live in this browser only.
    </p>
  </div>

  <form
    class="flex flex-wrap items-end gap-3"
    onsubmit={(event) => {
      event.preventDefault();
      save();
    }}
  >
    <div class="min-w-0 flex-1 space-y-1.5 sm:max-w-sm">
      <label for="scenario-name" class={labelClasses}>Scenario name</label>
      <input
        id="scenario-name"
        type="text"
        bind:value={name}
        maxlength="60"
        autocomplete="off"
        placeholder="Heavy refactor"
        class={fieldClasses}
      />
    </div>
    <Button type="submit" variant="secondary" icon={Save} class="h-[2.625rem]">
      Save scenario
    </Button>
  </form>
  <p class={hintClasses} role="status">{notice ?? ''}</p>

  {#if scenarios.length > 0}
    <ul class="flex flex-wrap gap-2" aria-label="Saved scenarios">
      {#each scenarios as scenario (scenario.id)}
        {@const selected = compared.includes(scenario.id)}
        <li
          class="flex items-center rounded-full border border-slate-300 bg-white text-sm dark:border-slate-600 dark:bg-slate-800 {selected
            ? 'ring-primary-600 dark:ring-primary-400 ring-2'
            : ''}"
        >
          <button
            type="button"
            aria-pressed={selected}
            disabled={!selected && compared.length >= MAX_COMPARED}
            onclick={() => toggle(scenario.id)}
            class="focus-visible:outline-primary-600 cursor-pointer rounded-l-full px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-700"
          >
            {scenario.name}
          </button>
          <button
            type="button"
            onclick={() => onLoad(scenario.state)}
            aria-label="Load {scenario.name}"
            class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer px-2 py-1.5 text-xs font-semibold hover:bg-slate-100 focus-visible:outline-2 dark:hover:bg-slate-700"
          >
            Load
          </button>
          <button
            type="button"
            onclick={() => persist(scenarios.filter((candidate) => candidate.id !== scenario.id))}
            aria-label="Delete {scenario.name}"
            class="focus-visible:outline-primary-600 cursor-pointer rounded-r-full px-2 py-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X aria-hidden="true" class="size-4" />
          </button>
        </li>
      {/each}
    </ul>
    {#if compared.length >= MAX_COMPARED}
      <p class={hintClasses}>Three are selected, which is the most the comparison shows.</p>
    {/if}
  {/if}

  {#if comparison.length > 0}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
      tabindex="0"
      role="region"
      aria-label="Scenario comparison"
    >
      <table class="w-full min-w-[40rem] border-collapse text-sm" data-scenario-comparison>
        <caption class="sr-only"
          >Cost, value, net, and break-even for each selected scenario.</caption
        >
        <thead>
          <tr
            class="border-b border-slate-300 text-left text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <th scope="col" class="px-3 py-2 font-semibold">Scenario</th>
            <th scope="col" class="px-3 py-2 font-semibold">Change</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Cost</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Value</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Net</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Break-even N</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Break-even R</th>
          </tr>
        </thead>
        <tbody class="text-slate-900 dark:text-slate-100">
          {#each comparison as { scenario, evaluation } (scenario.id)}
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th scope="row" class="px-3 py-2 text-left font-medium">{scenario.name}</th>
              <td class="px-3 py-2">
                {evaluation.from.name} at {evaluation.fromEffort.label} to {evaluation.to.name} at
                {evaluation.toEffort.label}
              </td>
              <td class="px-3 py-2 text-right tabular-nums"
                >{formatPlainDollars(evaluation.cost)}</td
              >
              <td class="px-3 py-2 text-right tabular-nums"
                >{formatPlainDollars(evaluation.value)}</td
              >
              <td class="px-3 py-2 text-right font-semibold tabular-nums">
                {formatSignedDollars(evaluation.net)}
              </td>
              <td class="px-3 py-2 text-right tabular-nums">
                {evaluation.breakEvenContext === null
                  ? 'never'
                  : formatTokens(evaluation.breakEvenContext)}
              </td>
              <td class="px-3 py-2 text-right tabular-nums">
                {evaluation.breakEvenOutput === null
                  ? 'never'
                  : formatTokens(evaluation.breakEvenOutput)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
