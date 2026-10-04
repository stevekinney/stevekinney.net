<script lang="ts">
  import EntryActions from './entry-actions.svelte';
  import EntryTags from './entry-tags.svelte';
  import { findRanges, searchFieldLabels, toSegments } from './search';
  import type { ListResult, QueryTerm } from './search';

  type Props = {
    results: ListResult[];
    terms: QueryTerm[];
    /** Each entry's summary as plain text, so a card can show and highlight it. */
    summaries: ReadonlyMap<string, string>;
    compared: readonly string[];
    comparisonFull: boolean;
    starred: ReadonlySet<string>;
    ready: boolean;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    onToggleCompare: (id: string) => void;
    onToggleStar: (id: string) => void;
    onClearFilters: () => void;
    hasFilters: boolean;
  };

  const {
    results,
    terms,
    summaries,
    compared,
    comparisonFull,
    starred,
    ready,
    hrefFor,
    onOpen,
    onToggleCompare,
    onToggleStar,
    onClearFilters,
    hasFilters,
  }: Props = $props();
</script>

{#snippet highlighted(text: string)}
  {#each toSegments(text, findRanges(text, terms)) as segment, index (index)}
    {#if segment.match}
      <mark class="rounded bg-yellow-200 px-0.5 text-slate-900 dark:bg-yellow-300/80">
        {segment.text}
      </mark>
    {:else}
      {segment.text}
    {/if}
  {/each}
{/snippet}

{#if results.length === 0}
  <div
    class="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"
  >
    <p class="font-semibold text-slate-900 dark:text-white">Nothing matches.</p>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Try fewer words, or take a filter off.
    </p>
    {#if hasFilters}
      <button
        type="button"
        onclick={onClearFilters}
        class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 mt-3 cursor-pointer rounded text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Clear filters
      </button>
    {/if}
  </div>
{:else}
  <ul class="grid gap-3 lg:grid-cols-2">
    {#each results as { entry, hit } (entry.id)}
      {@const summary = summaries.get(entry.id) ?? ''}
      <li
        class="hover:border-primary-400 dark:hover:border-primary-500 relative flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 transition-colors motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 class="min-w-0 text-lg font-semibold text-slate-900 dark:text-white">
            <a
              href={hrefFor(entry.id)}
              onclick={(event) => onOpen(entry.id, event)}
              class="focus-visible:outline-primary-600 rounded break-words after:absolute after:inset-0 after:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:after:outline-2"
              >{@render highlighted(entry.name)}</a
            >
          </h3>
          <div class="relative z-10">
            <EntryActions
              name={entry.name}
              compared={compared.includes(entry.id)}
              {comparisonFull}
              starred={starred.has(entry.id)}
              {ready}
              onToggleCompare={() => onToggleCompare(entry.id)}
              onToggleStar={() => onToggleStar(entry.id)}
            />
          </div>
        </div>
        <EntryTags {entry} />
        <p class="line-clamp-3 text-sm text-slate-700 dark:text-slate-300">
          {#if summary === ''}
            <span class="text-slate-500 italic dark:text-slate-400">No summary recorded.</span>
          {:else}
            {@render highlighted(summary)}
          {/if}
        </p>
        {#if hit && hit.field !== 'name' && hit.field !== 'summary' && hit.snippet}
          <p class="text-sm text-slate-700 dark:text-slate-300">
            <span class="font-medium text-slate-900 dark:text-white"
              >matched in <em>{searchFieldLabels[hit.field]}</em></span
            >:
            {#each toSegments(hit.snippet.text, hit.snippet.ranges) as segment, index (index)}
              {#if segment.match}
                <mark class="rounded bg-yellow-200 px-0.5 text-slate-900 dark:bg-yellow-300/80">
                  {segment.text}
                </mark>
              {:else}
                {segment.text}
              {/if}
            {/each}
          </p>
        {:else if hit && hit.field === 'summary'}
          <p class="text-sm font-medium text-slate-900 dark:text-white">
            matched in <em>{searchFieldLabels.summary}</em>
          </p>
        {:else if hit && hit.field === 'name'}
          <p class="text-sm font-medium text-slate-900 dark:text-white">
            matched in <em>{searchFieldLabels.name}</em>
          </p>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
