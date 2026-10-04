<script lang="ts">
  import { ArrowLeft, X } from '@lucide/svelte';

  import Collapsible from './collapsible.svelte';
  import { sharedRelations } from './graph-metrics';
  import type { PatternGraph } from './graph-metrics';
  import MarkdownView from './markdown-view.svelte';
  import { sectionLabels } from './pattern-constants';
  import type { PatternEntry } from './pattern-types';

  type Props = {
    entries: PatternEntry[];
    graph: PatternGraph;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    onRemove: (id: string) => void;
    onBack: () => void;
  };

  const { entries, graph, hrefFor, onOpen, onRemove, onBack }: Props = $props();

  const shared = $derived(sharedRelations(entries));
  const longSection = 700;

  const sections = [
    { key: 'summary', label: sectionLabels.summary },
    { key: 'whenToUse', label: sectionLabels.whenToUse },
    { key: 'whenNotToUse', label: sectionLabels.whenNotToUse },
    { key: 'drawbacks', label: sectionLabels.drawbacks },
  ] as const;
</script>

<section aria-labelledby="compare-heading" class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2
      id="compare-heading"
      tabindex="-1"
      data-view-heading
      class="text-xl font-bold text-slate-900 outline-none dark:text-white"
    >
      Compare patterns
    </h2>
    <button
      type="button"
      onclick={onBack}
      class="focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeft aria-hidden="true" class="size-4" />
      Back to the list
    </button>
  </div>

  {#if entries.length === 0}
    <div
      class="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"
    >
      <p class="font-semibold text-slate-900 dark:text-white">Nothing to compare yet.</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Tick Compare on up to three entries in the list, then open the comparison.
      </p>
    </div>
  {:else}
    <p class="text-sm text-slate-600 dark:text-slate-300">
      {#if entries.length > 1}
        Related patterns that appear in more than one of these entries are highlighted.
      {:else}
        Add another entry to see what they share.
      {/if}
    </p>

    <div
      class="grid gap-4 {entries.length === 3
        ? 'md:grid-cols-3'
        : entries.length === 2
          ? 'md:grid-cols-2'
          : ''}"
    >
      {#each entries as entry (entry.id)}
        <article
          aria-labelledby="compare-{entry.id}"
          class="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        >
          <header
            class="sticky top-0 z-10 flex items-start justify-between gap-2 rounded-t-lg border-b border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              id="compare-{entry.id}"
              class="min-w-0 font-bold break-words text-slate-900 dark:text-white"
            >
              <a
                href={hrefFor(entry.id)}
                onclick={(event) => onOpen(entry.id, event)}
                class="focus-visible:outline-primary-600 rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >{entry.name}</a
              >
            </h3>
            <button
              type="button"
              onclick={() => onRemove(entry.id)}
              class="focus-visible:outline-primary-600 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X aria-hidden="true" class="size-4" />
              <span class="sr-only">Remove {entry.name} from the comparison</span>
            </button>
          </header>

          <div class="space-y-5 p-3">
            {#each sections as { key, label } (key)}
              {@const markdown = entry[key]}
              <section class="space-y-1.5">
                <h4
                  class="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
                >
                  {label}
                </h4>
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
            {/each}

            <section class="space-y-1.5">
              <h4
                class="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
              >
                Maturity and confidence
              </h4>
              <p class="text-sm text-slate-800 dark:text-slate-200">
                {entry.maturity || 'No maturity'} · {entry.confidence || 'no confidence'}
              </p>
            </section>

            <section class="space-y-1.5">
              <h4
                class="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
              >
                Related patterns
              </h4>
              {#if entry.related.length === 0}
                <p class="text-sm text-slate-600 italic dark:text-slate-300">Not recorded.</p>
              {:else}
                <ul class="flex flex-wrap gap-1.5">
                  {#each entry.related as name (name)}
                    {@const isShared = shared.has(name.toLowerCase())}
                    <li
                      class="rounded-full border px-2.5 py-0.5 text-xs font-medium {isShared
                        ? 'border-primary-500 bg-primary-100 text-primary-950 dark:border-primary-400 dark:bg-primary-900/70 dark:text-primary-50'
                        : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}"
                    >
                      {name}{#if isShared}<span class="sr-only"> (shared)</span>{/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </section>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
