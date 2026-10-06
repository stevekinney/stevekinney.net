<script lang="ts">
  import { emptyFilters } from './analysis';
  import type { FilterOptions, Filters } from './analysis';
  import { fieldClasses, labelClasses, linkButtonClasses } from './field-styles';

  type Props = {
    filters: Filters;
    options: FilterOptions;
    categories: string[];
    onChange: (filters: Filters) => void;
  };

  const { filters, options, categories, onChange }: Props = $props();

  const set = (field: keyof Filters, value: string): void =>
    onChange({ ...filters, [field]: value });

  const selects = $derived([
    {
      field: 'cwd' as const,
      label: 'Working directory',
      all: 'Every directory',
      values: options.cwds,
    },
    {
      field: 'branch' as const,
      label: 'Git branch',
      all: 'Every branch',
      values: options.branches,
    },
    { field: 'model' as const, label: 'Model', all: 'Every model', values: options.models },
    { field: 'tool' as const, label: 'Tool', all: 'Every tool', values: options.tools },
    { field: 'category' as const, label: 'Category', all: 'Every category', values: categories },
  ]);

  const active = $derived(Object.entries(filters).some(([, value]) => value.trim() !== ''));
</script>

<div class="space-y-3" role="group" aria-labelledby="filters-heading">
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div class="space-y-1.5 sm:col-span-2">
      <label for="filter-search" class={labelClasses}>Search signatures and examples</label>
      <input
        id="filter-search"
        type="search"
        value={filters.search}
        oninput={(event) => set('search', event.currentTarget.value)}
        placeholder="command not found"
        class="{fieldClasses} w-full"
      />
    </div>
    <div class="space-y-1.5">
      <label for="filter-from" class={labelClasses}>From</label>
      <input
        id="filter-from"
        type="date"
        value={filters.from}
        min={options.firstDay ?? undefined}
        max={options.lastDay ?? undefined}
        onchange={(event) => set('from', event.currentTarget.value)}
        class="{fieldClasses} w-full"
      />
    </div>
    <div class="space-y-1.5">
      <label for="filter-to" class={labelClasses}>To</label>
      <input
        id="filter-to"
        type="date"
        value={filters.to}
        min={options.firstDay ?? undefined}
        max={options.lastDay ?? undefined}
        onchange={(event) => set('to', event.currentTarget.value)}
        class="{fieldClasses} w-full"
      />
    </div>
    {#each selects as select (select.field)}
      <div class="min-w-0 space-y-1.5">
        <label for="filter-{select.field}" class={labelClasses}>{select.label}</label>
        <select
          id="filter-{select.field}"
          value={filters[select.field]}
          onchange={(event) => set(select.field, event.currentTarget.value)}
          class="{fieldClasses} w-full min-w-0"
        >
          <option value="">{select.all}</option>
          {#each select.values as value (value)}
            <option {value}>{value}</option>
          {/each}
        </select>
      </div>
    {/each}
  </div>
  {#if active}
    <button type="button" class={linkButtonClasses} onclick={() => onChange({ ...emptyFilters })}>
      Clear every filter
    </button>
  {/if}
</div>
