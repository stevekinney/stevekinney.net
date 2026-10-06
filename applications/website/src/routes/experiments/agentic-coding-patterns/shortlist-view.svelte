<script lang="ts">
  import { Download, Trash2 } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import type { PatternEntry } from './pattern-types';
  import { downloadText, shortlistToCsv, shortlistToMarkdown } from './shortlist';
  import type { ShortlistRow } from './shortlist';

  type Props = {
    rows: ShortlistRow[];
    /** How many starred entries aren't in the library being viewed. */
    hiddenCount: number;
    ready: boolean;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    onNote: (entry: PatternEntry, note: string) => void;
    onRemove: (entry: PatternEntry) => void;
    onBrowse: () => void;
  };

  const { rows, hiddenCount, ready, hrefFor, onOpen, onNote, onRemove, onBrowse }: Props = $props();

  const markdown = $derived(shortlistToMarkdown(rows));

  let preview = $state<HTMLTextAreaElement>();
  let message = $state('');

  const copyMarkdown = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(markdown);
      message = 'Copied the Markdown.';
    } catch {
      // The clipboard can refuse, so select the text and let the person copy it.
      preview?.focus();
      preview?.select();
      message = 'Couldn’t reach the clipboard. The text is selected: press Command-C or Control-C.';
    }
  };

  const download = (kind: 'markdown' | 'csv'): void => {
    if (kind === 'markdown') {
      downloadText('pattern-shortlist.md', markdown, 'text/markdown');
      message = 'Downloaded pattern-shortlist.md.';
    } else {
      downloadText('pattern-shortlist.csv', shortlistToCsv(rows), 'text/csv');
      message = 'Downloaded pattern-shortlist.csv.';
    }
  };
</script>

<section aria-labelledby="shortlist-heading" class="space-y-4">
  <div class="space-y-1">
    <h2
      id="shortlist-heading"
      tabindex="-1"
      data-view-heading
      class="text-xl font-bold text-slate-900 outline-none dark:text-white"
    >
      Shortlist
    </h2>
    <p class="max-w-prose text-sm text-slate-600 dark:text-slate-300">
      Star entries to collect them here, add a note to each, and export the list. Your shortlist is
      saved in this browser only, and the page works without it.
    </p>
  </div>

  {#if rows.length === 0}
    <div
      class="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"
    >
      <p class="font-semibold text-slate-900 dark:text-white">Nothing on your shortlist yet.</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Use the star on an entry to add it.
      </p>
      <div class="mt-3 flex justify-center">
        <Button variant="secondary" onclick={onBrowse}>Browse the library</Button>
      </div>
    </div>
  {:else}
    <ul class="space-y-3">
      {#each rows as { entry, note } (entry.id)}
        <li
          class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="min-w-0 font-semibold break-words text-slate-900 dark:text-white">
              <a
                href={hrefFor(entry.id)}
                onclick={(event) => onOpen(entry.id, event)}
                class="focus-visible:outline-primary-600 rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >{entry.name}</a
              >
              <span class="text-sm font-normal text-slate-600 dark:text-slate-300">
                · {entry.category}{entry.maturity ? ` · ${entry.maturity}` : ''}{entry.confidence
                  ? ` · ${entry.confidence}`
                  : ''}
              </span>
            </h3>
            <button
              type="button"
              onclick={() => onRemove(entry)}
              class="focus-visible:outline-primary-600 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Trash2 aria-hidden="true" class="size-4" />
              <span class="sr-only">Remove {entry.name} from the shortlist</span>
            </button>
          </div>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-slate-700 dark:text-slate-200">
              Note<span class="sr-only"> for {entry.name}</span> (optional)
            </span>
            <textarea
              value={note}
              oninput={(event) => onNote(entry, event.currentTarget.value)}
              rows="2"
              class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            ></textarea>
          </label>
        </li>
      {/each}
    </ul>

    {#if hiddenCount > 0}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {hiddenCount}
        {hiddenCount === 1 ? 'starred entry isn’t' : 'starred entries aren’t'} in the library you're viewing,
        so {hiddenCount === 1 ? 'it isn’t' : 'they aren’t'} listed or exported.
      </p>
    {/if}

    <section aria-labelledby="export-heading" class="space-y-3">
      <h3 id="export-heading" class="font-bold text-slate-900 dark:text-white">Export</h3>
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!ready} onclick={copyMarkdown}>Copy Markdown</Button>
        <Button
          variant="secondary"
          icon={Download}
          disabled={!ready}
          onclick={() => download('markdown')}
        >
          Download Markdown
        </Button>
        <Button
          variant="secondary"
          icon={Download}
          disabled={!ready}
          onclick={() => download('csv')}
        >
          Download CSV
        </Button>
      </div>
      <p role="status" class="min-h-5 text-sm text-slate-700 dark:text-slate-200">{message}</p>
      <label class="block space-y-1 text-sm">
        <span class="font-medium text-slate-700 dark:text-slate-200">
          Markdown for your vault
        </span>
        <textarea
          bind:this={preview}
          readonly
          rows={Math.min(14, rows.length + 5)}
          value={markdown}
          class="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        ></textarea>
      </label>
    </section>
  {/if}
</section>
