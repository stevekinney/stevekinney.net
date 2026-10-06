<script lang="ts">
  import { ArrowLeft, ChevronLeft, ChevronRight } from '@lucide/svelte';

  import Collapsible from './collapsible.svelte';
  import EntryActions from './entry-actions.svelte';
  import EntryTags from './entry-tags.svelte';
  import { backlinksOf } from './graph-metrics';
  import type { PatternGraph } from './graph-metrics';
  import MarkdownView from './markdown-view.svelte';
  import NeighborhoodGraph from './neighborhood-graph.svelte';
  import type { PatternEntry } from './pattern-types';
  import { sectionLabels } from './pattern-constants';

  type Props = {
    entry: PatternEntry;
    graph: PatternGraph;
    /** Where this entry sits in the current filtered list, or `null` if the filters leave it out. */
    position: { index: number; total: number } | null;
    compared: boolean;
    comparisonFull: boolean;
    starred: boolean;
    ready: boolean;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    onBack: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onToggleCompare: () => void;
    onToggleStar: () => void;
  };

  const {
    entry,
    graph,
    position,
    compared,
    comparisonFull,
    starred,
    ready,
    hrefFor,
    onOpen,
    onBack,
    onPrevious,
    onNext,
    onToggleCompare,
    onToggleStar,
  }: Props = $props();

  const backlinks = $derived(backlinksOf(graph, entry.id));

  const longSection = 900;

  const pillClass =
    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';
  const navigationButton =
    'focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800';
</script>

{#snippet panel(title: string, markdown: string, tone: string)}
  <section class="space-y-2 rounded-lg border p-4 {tone}">
    <h3 class="font-bold text-slate-900 dark:text-white">{title}</h3>
    {#if markdown === ''}
      <p class="text-sm text-slate-600 italic dark:text-slate-300">Not recorded.</p>
    {:else}
      <Collapsible long={markdown.length > longSection}>
        <MarkdownView
          {markdown}
          resolve={graph.resolve}
          {hrefFor}
          {onOpen}
          class="text-sm text-slate-800 dark:text-slate-200"
        />
      </Collapsible>
    {/if}
  </section>
{/snippet}

<article aria-labelledby="detail-heading" class="space-y-6">
  <nav aria-label="Entry navigation" class="flex flex-wrap items-center justify-between gap-3">
    <button type="button" onclick={onBack} class={navigationButton}>
      <ArrowLeft aria-hidden="true" class="size-4" />
      Back to the list
    </button>
    {#if position}
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onPrevious}
          disabled={position.index === 0}
          class={navigationButton}
          aria-keyshortcuts="k"
        >
          <ChevronLeft aria-hidden="true" class="size-4" />
          Previous
        </button>
        <span class="text-sm text-slate-600 tabular-nums dark:text-slate-300">
          {position.index + 1} of {position.total}
        </span>
        <button
          type="button"
          onclick={onNext}
          disabled={position.index === position.total - 1}
          class={navigationButton}
          aria-keyshortcuts="j"
        >
          Next
          <ChevronRight aria-hidden="true" class="size-4" />
        </button>
      </div>
    {/if}
  </nav>

  <header class="space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <h2
        id="detail-heading"
        tabindex="-1"
        data-view-heading
        class="min-w-0 text-3xl font-bold tracking-tight break-words text-slate-900 outline-none dark:text-white"
      >
        {entry.name}
      </h2>
      <EntryActions
        name={entry.name}
        {compared}
        {comparisonFull}
        {starred}
        {ready}
        {onToggleCompare}
        {onToggleStar}
      />
    </div>
    <EntryTags {entry} showConfidence />
    {#if entry.aliases.length > 0}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Also known as: {entry.aliases.join(', ')}
      </p>
    {/if}
  </header>

  <section aria-label={sectionLabels.summary}>
    {#if entry.summary === ''}
      <p class="text-slate-600 italic dark:text-slate-300">No summary recorded.</p>
    {:else}
      <MarkdownView
        markdown={entry.summary}
        resolve={graph.resolve}
        {hrefFor}
        {onOpen}
        class="text-xl leading-relaxed text-slate-900 dark:text-white"
      />
    {/if}
  </section>

  <div class="grid gap-4 md:grid-cols-2">
    {@render panel(
      sectionLabels.whenToUse,
      entry.whenToUse,
      'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40',
    )}
    {@render panel(
      sectionLabels.whenNotToUse,
      entry.whenNotToUse,
      'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40',
    )}
  </div>

  {@render panel(
    sectionLabels.drawbacks,
    entry.drawbacks,
    'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  )}

  <section aria-labelledby="related-heading" class="space-y-3">
    <h3 id="related-heading" class="font-bold text-slate-900 dark:text-white">Related patterns</h3>
    {#if entry.related.length === 0}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        This note doesn't list any related patterns.
      </p>
    {:else}
      <ul class="flex flex-wrap gap-2">
        {#each entry.related as name (name)}
          {@const target = graph.resolve(name)}
          <li>
            {#if target}
              <a
                href={hrefFor(target.id)}
                onclick={(event) => onOpen(target.id, event)}
                class="{pillClass} focus-visible:outline-primary-600 border-slate-300 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                {target.name}
              </a>
            {:else}
              <span class="group relative inline-flex">
                <span
                  role="link"
                  aria-disabled="true"
                  tabindex="0"
                  title="No note for this pattern yet."
                  aria-describedby="missing-{name.replace(/\W+/g, '-')}"
                  class="{pillClass} focus-visible:outline-primary-600 cursor-not-allowed border-dashed border-slate-300 bg-transparent text-slate-500 dark:border-slate-600 dark:text-slate-400"
                >
                  {name}
                </span>
                <span
                  id="missing-{name.replace(/\W+/g, '-')}"
                  role="tooltip"
                  class="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white group-focus-within:block group-hover:block dark:bg-slate-100 dark:text-slate-900"
                >
                  No note for this pattern yet.
                </span>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="referenced-heading" class="space-y-3">
    <h3 id="referenced-heading" class="font-bold text-slate-900 dark:text-white">Referenced by</h3>
    {#if backlinks.length === 0}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        No other entry lists this one under Related Patterns.
      </p>
    {:else}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Entries whose Related Patterns point here. A mutual link means this entry points back.
      </p>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each backlinks as { entry: source, mutual } (source.id)}
          <li>
            <a
              href={hrefFor(source.id)}
              onclick={(event) => onOpen(source.id, event)}
              class="focus-visible:outline-primary-600 flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 {mutual
                ? 'border-primary-300 bg-primary-50 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-950/40 dark:hover:bg-primary-950'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}"
            >
              <span class="font-medium text-slate-900 dark:text-white">{source.name}</span>
              <span
                class="text-xs font-medium {mutual
                  ? 'text-primary-800 dark:text-primary-200'
                  : 'text-slate-600 dark:text-slate-300'}"
              >
                {mutual ? 'mutual' : 'one-way'}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="neighborhood-heading" class="space-y-3">
    <h3 id="neighborhood-heading" class="font-bold text-slate-900 dark:text-white">Neighborhood</h3>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      This entry and everything linked to or from it. A solid line is a mutual link, and a dashed
      line goes one way. The lists above say the same in text.
    </p>
    <NeighborhoodGraph {entry} {graph} {hrefFor} {onOpen} />
  </section>
</article>
