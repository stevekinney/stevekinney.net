<script lang="ts">
  import { X } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { hasActiveFilters } from './explorer-state';
  import type { ExplorerState, Filters } from './explorer-state';
  import { knownConfidences } from './pattern-constants';

  type Props = {
    state: ExplorerState;
    /** The types present in the library, such as `pattern` and `methodology`. */
    types: string[];
    ready: boolean;
    shown: number;
    total: number;
    /** What the count says is active, such as `verification` and `established`. */
    description: string[];
    searchInput?: HTMLInputElement;
    onQuery: (query: string) => void;
    onFilters: (filters: Partial<Filters>) => void;
    onClear: () => void;
  };

  let {
    state,
    types,
    ready,
    shown,
    total,
    description,
    searchInput = $bindable(),
    onQuery,
    onFilters,
    onClear,
  }: Props = $props();

  const chipClass =
    'focus-visible:outline-primary-600 cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait aria-pressed:border-transparent aria-pressed:bg-slate-900 aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:bg-white dark:aria-pressed:text-slate-900';

  const countText = $derived([`${shown} of ${total}`, ...description].join(' · '));

  type ActiveChip = { key: string; label: string; remove: () => void };

  const activeChips = $derived.by((): ActiveChip[] => {
    const { filters, query } = state;
    const chips: ActiveChip[] = [];

    if (query.trim() !== '') {
      chips.push({ key: 'query', label: `Search: ${query.trim()}`, remove: () => onQuery('') });
    }
    if (filters.category) {
      chips.push({
        key: 'category',
        label: `Category: ${filters.category}`,
        remove: () => onFilters({ category: null }),
      });
    }
    if (filters.maturity) {
      chips.push({
        key: 'maturity',
        label: `Maturity: ${filters.maturity}`,
        remove: () => onFilters({ maturity: null }),
      });
    }
    if (filters.confidence) {
      chips.push({
        key: 'confidence',
        label: `Confidence: ${filters.confidence}`,
        remove: () => onFilters({ confidence: null }),
      });
    }
    if (filters.type) {
      chips.push({
        key: 'type',
        label: `Type: ${filters.type}`,
        remove: () => onFilters({ type: null }),
      });
    }
    if (filters.partialOnly) {
      chips.push({
        key: 'partial',
        label: 'Partial only',
        remove: () => onFilters({ partialOnly: false }),
      });
    }

    return chips;
  });
</script>

<div class="space-y-3" role="search" aria-label="Search and filter the library">
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-1 basis-64">
      <label for="pattern-search" class="sr-only">Search patterns</label>
      <input
        bind:this={searchInput}
        id="pattern-search"
        type="search"
        value={state.query}
        oninput={(event) => onQuery(event.currentTarget.value)}
        placeholder="Search every section. Press / to focus."
        autocomplete="off"
        spellcheck="false"
        class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 outline-none focus-visible:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
      />
    </div>
    <Button variant="secondary" onclick={onClear} disabled={!ready || !hasActiveFilters(state)}>
      Clear filters
    </Button>
  </div>

  <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
    {#if types.length > 1}
      <div role="group" aria-label="Type" class="flex flex-wrap items-center gap-1.5">
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">Type</span>
        {#each types as type (type)}
          <button
            type="button"
            disabled={!ready}
            class={chipClass}
            aria-pressed={state.filters.type === type}
            onclick={() => onFilters({ type: state.filters.type === type ? null : type })}
          >
            {type}
          </button>
        {/each}
      </div>
    {/if}
    <div role="group" aria-label="Confidence" class="flex flex-wrap items-center gap-1.5">
      <span class="text-sm font-medium text-slate-600 dark:text-slate-300">Confidence</span>
      {#each knownConfidences as confidence (confidence)}
        <button
          type="button"
          disabled={!ready}
          class={chipClass}
          aria-pressed={state.filters.confidence === confidence}
          onclick={() =>
            onFilters({ confidence: state.filters.confidence === confidence ? null : confidence })}
        >
          {confidence}
        </button>
      {/each}
    </div>
    <button
      type="button"
      disabled={!ready}
      class={chipClass}
      aria-pressed={state.filters.partialOnly}
      onclick={() => onFilters({ partialOnly: !state.filters.partialOnly })}
    >
      Partial only
    </button>
  </div>

  {#if activeChips.length > 0}
    <ul class="flex flex-wrap gap-1.5" aria-label="Active filters">
      {#each activeChips as chip (chip.key)}
        <li>
          <button
            type="button"
            onclick={chip.remove}
            aria-label="Remove filter: {chip.label}"
            class="focus-visible:outline-primary-600 bg-primary-100 text-primary-900 hover:bg-primary-200 dark:bg-primary-900/60 dark:text-primary-100 dark:hover:bg-primary-900 inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {chip.label}
            <X aria-hidden="true" class="size-3.5" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <p role="status" class="text-sm font-medium text-slate-700 tabular-nums dark:text-slate-200">
    {countText}
  </p>
</div>
