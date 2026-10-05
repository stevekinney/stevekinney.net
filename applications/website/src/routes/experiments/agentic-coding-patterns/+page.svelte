<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { pushState, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';

  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import CompareTray from './compare-tray.svelte';
  import EntryList from './entry-list.svelte';
  import { experiment } from './experiment';
  import {
    applyGridSelection,
    buildGrid,
    describeFilters,
    emptyFilters,
    filterEntries,
    hasActiveFilters,
    initialState,
    maximumCompared,
    parseUrlState,
    serializeUrlState,
  } from './explorer-state';
  import type { ExplorerState, ExplorerView, Filters, GridDimension } from './explorer-state';
  import FilterToolbar from './filter-toolbar.svelte';
  import { buildGraph } from './graph-metrics';
  import HeatGrid from './heat-grid.svelte';
  import LibraryLoader from './library-loader.svelte';
  import { bundledLibraryPath, defaultIncludedTypes } from './pattern-constants';
  import type { ExcludedNote, NoteSource, PatternDataset, PatternEntry } from './pattern-types';
  import { commonFolderName, readNotes } from './read-notes';
  import { buildSearchDocuments, parseQuery, search } from './search';
  import type { ListResult } from './search';
  import {
    bundledLibrary,
    folderLibraryKey,
    itemsIn,
    readShortlist,
    setNote,
    toggleStar,
    writeShortlist,
  } from './shortlist';
  import type { ShortlistItem, ShortlistRow } from './shortlist';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/agentic-coding-patterns` },
  ]);

  type LoadedFolder = {
    name: string | null;
    /** Tells this upload apart from any other, even one with the same folder name. */
    libraryKey: string;
    notes: NoteSource[];
    skipped: ExcludedNote[];
    truncated: boolean;
    dataset: PatternDataset;
  };

  // The one state object. The address bar holds every part of it except the
  // library itself, and the page reads it only after mounting, because a
  // prerendered page has no query string or fragment to read.
  let explorer = $state<ExplorerState>(initialState);
  let ready = $state(false);
  let folder = $state.raw<LoadedFolder | null>(null);
  // The whole bundled library, fetched after hydration. Until then the page has only the list view's share.
  let bundled = $state.raw<PatternDataset | null>(null);
  let bundledFailed = $state(false);
  let shortlist = $state<ShortlistItem[]>([]);
  let shortlistLoaded = false;

  let includedTypes = $state(defaultIncludedTypes.join(', '));
  let loading = $state(false);
  let loadProgress = $state<string | null>(null);
  let loadStatus = $state<string | null>(null);
  let loadError = $state<string | null>(null);

  let searchInput = $state<HTMLInputElement>();
  let graphComponent = $state.raw<typeof import('./pattern-graph.svelte').default | null>(null);

  const dataset = $derived(folder?.dataset ?? bundled ?? data.dataset);
  const entries = $derived(dataset.entries);
  const graph = $derived(buildGraph(entries));
  const documents = $derived(buildSearchDocuments(entries));
  const summaries = $derived(
    new Map(documents.map((document) => [document.id, document.fields.summary])),
  );
  const terms = $derived(parseQuery(explorer.query));
  const filtered = $derived(filterEntries(entries, explorer.filters));
  const grid = $derived(buildGrid(entries, explorer.gridBy));
  const types = $derived(Object.keys(dataset.report.includedByType));

  const results = $derived.by((): ListResult[] => {
    if (terms.length === 0) return filtered.map((entry) => ({ entry, hit: null }));

    const hits = new Map(search(documents, terms).map((hit) => [hit.id, hit]));

    return filtered
      .flatMap((entry): ListResult[] => {
        const hit = hits.get(entry.id);

        return hit ? [{ entry, hit }] : [];
      })
      .sort(
        (first, second) =>
          (first.hit?.score ?? 0) - (second.hit?.score ?? 0) ||
          first.entry.name.localeCompare(second.entry.name),
      );
  });

  const filtersActive = $derived(hasActiveFilters(explorer));
  // The graph dims what doesn't match, so it needs the matches only when something filters.
  const matching = $derived(filtersActive ? new Set(results.map(({ entry }) => entry.id)) : null);

  const selectedEntry = $derived(explorer.selected ? graph.byId.get(explorer.selected) : undefined);
  const selectedIndex = $derived(results.findIndex(({ entry }) => entry.id === explorer.selected));
  const position = $derived(
    selectedIndex === -1 ? null : { index: selectedIndex, total: results.length },
  );

  const comparedEntries = $derived(
    explorer.compare.flatMap((id) => {
      const entry = graph.byId.get(id);

      return entry ? [entry] : [];
    }),
  );
  const comparisonFull = $derived(explorer.compare.length >= maximumCompared);

  // Entry IDs are slugs, so a custom folder can hold an ID the bundled library also has. The
  // shortlist keeps each library's items apart, and only the open library's are shown.
  const shortlistLibrary = $derived(folder ? folder.libraryKey : bundledLibrary);
  const librarySavedItems = $derived(itemsIn(shortlist, shortlistLibrary));
  const starred = $derived(new Set(librarySavedItems.map((item) => item.id)));
  const shortlistRows = $derived(
    librarySavedItems
      .flatMap((item): ShortlistRow[] => {
        const entry = graph.byId.get(item.id);

        return entry ? [{ entry, note: item.note }] : [];
      })
      .sort((first, second) => first.entry.name.localeCompare(second.entry.name)),
  );
  const hiddenShortlistCount = $derived(librarySavedItems.length - shortlistRows.length);

  // Links keep the filters and view, so a link to an entry opens it with the same filters.
  const linkSearch = $derived(serializeUrlState({ ...explorer, selected: null }).search);
  const hrefFor = (id: string): string => `${linkSearch}#${encodeURIComponent(id)}`;

  const showingDetail = $derived(explorer.selected !== null);
  const showingToolbar = $derived(
    !showingDetail && (explorer.view === 'list' || explorer.view === 'graph'),
  );

  const tabs = $derived.by(() => {
    const list: { view: ExplorerView; label: string }[] = [
      { view: 'list', label: 'List' },
      { view: 'graph', label: 'Graph' },
      {
        view: 'shortlist',
        label:
          librarySavedItems.length > 0 ? `Shortlist (${librarySavedItems.length})` : 'Shortlist',
      },
    ];

    if (explorer.compare.length > 0 || explorer.view === 'compare') {
      list.push({ view: 'compare', label: `Compare (${explorer.compare.length})` });
    }

    return list;
  });

  const problemCount = $derived(
    dataset.report.excluded.length +
      dataset.report.partial.length +
      dataset.report.dangling.length +
      dataset.report.unknown.length,
  );

  // Where the list was scrolled when an entry opened, so closing it can put it back.
  let savedScroll: { view: ExplorerView; y: number } | null = null;

  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  /**
   * Moves focus to the new view's heading. Some views load their code the first
   * time they're opened, so the heading may take a few frames to exist.
   */
  const focusHeading = async (restoreView: ExplorerView | null): Promise<void> => {
    await tick();

    let heading = document.querySelector<HTMLElement>('[data-view-heading]');
    for (let attempt = 0; heading === null && attempt < 60; attempt += 1) {
      await nextFrame();
      heading = document.querySelector<HTMLElement>('[data-view-heading]');
    }

    heading?.focus({ preventScroll: true });

    if (restoreView !== null && savedScroll?.view === restoreView) {
      window.scrollTo({ top: savedScroll.y });
    } else {
      heading?.scrollIntoView({ block: 'start' });
    }
  };

  const writeAddress = (mode: 'push' | 'replace'): void => {
    const { search: query, hash } = serializeUrlState(explorer);
    const address = `${resolve('/experiments/agentic-coding-patterns')}${query}${hash}`;

    if (mode === 'push') {
      pushState(address, {});
    } else {
      replaceState(address, {});
    }
  };

  /**
   * Applies a new state and writes it to the address bar. Opening an entry or
   * switching views is a new history entry, so Back returns to where the
   * person was. Typing and filtering replace the current one.
   */
  const update = (
    next: ExplorerState,
    mode: 'push' | 'replace',
    { focus = false }: { focus?: boolean } = {},
  ): void => {
    const opening = explorer.selected === null && next.selected !== null;
    const closing = explorer.selected !== null && next.selected === null;

    if (opening) savedScroll = { view: explorer.view, y: window.scrollY };

    explorer = next;
    writeAddress(mode);

    if (focus) void focusHeading(closing ? next.view : null);
  };

  const openEntry = (id: string, event?: MouseEvent): void => {
    if (event) {
      // Let the browser handle a modified click, such as opening a new tab.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
    }

    if (!ready) return;
    update({ ...explorer, selected: id }, 'push', { focus: true });
  };

  const closeEntry = (): void => update({ ...explorer, selected: null }, 'push', { focus: true });

  const step = (offset: number): void => {
    const target = results[selectedIndex + offset];
    if (selectedIndex !== -1 && target) openEntry(target.entry.id);
  };

  const setView = (view: ExplorerView): void =>
    update({ ...explorer, view, selected: null }, 'push', { focus: true });

  const setQuery = (query: string): void => update({ ...explorer, query }, 'replace');

  const setFilters = (patch: Partial<Filters>): void =>
    update({ ...explorer, filters: { ...explorer.filters, ...patch } }, 'replace');

  const clearFilters = (): void =>
    update({ ...explorer, query: '', filters: { ...emptyFilters } }, 'replace');

  const selectGridCell = (selection: { category: string | null; label: string | null }): void =>
    update(applyGridSelection(explorer, selection), 'replace');

  const changeGridDimension = (gridBy: GridDimension): void =>
    update(
      { ...explorer, gridBy, filters: { ...explorer.filters, maturity: null, confidence: null } },
      'replace',
    );

  const toggleCompare = (id: string): void => {
    const compare = explorer.compare.includes(id)
      ? explorer.compare.filter((existing) => existing !== id)
      : [...explorer.compare, id].slice(0, maximumCompared);

    update({ ...explorer, compare }, 'replace');
  };

  const removeCompared = (id: string): void =>
    update(
      { ...explorer, compare: explorer.compare.filter((existing) => existing !== id) },
      'replace',
    );

  const toggleShortlist = (id: string): void => {
    shortlist = toggleStar(shortlist, id, shortlistLibrary);
  };

  const noteOnShortlist = (entry: PatternEntry, note: string): void => {
    shortlist = setNote(shortlist, entry.id, note, shortlistLibrary);
  };

  const focusSearch = async (): Promise<void> => {
    if (!showingToolbar) {
      update(
        {
          ...explorer,
          view: explorer.view === 'graph' ? 'graph' : 'list',
          selected: null,
        },
        'push',
      );
      await tick();
    }

    searchInput?.focus();
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!ready || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

    // Shortcuts are for navigating, so they stay out of the way while someone types.
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return;
    }

    if (event.key === '/') {
      event.preventDefault();
      void focusSearch();
    } else if (event.key === 'j' && showingDetail) {
      step(1);
    } else if (event.key === 'k' && showingDetail) {
      step(-1);
    } else if (event.key === 'Escape' && showingDetail) {
      closeEntry();
    }
  };

  const handleTabKeydown = (event: KeyboardEvent, index: number): void => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const target =
      event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : index + offset;

    if (offset === 0 && event.key !== 'Home' && event.key !== 'End') return;

    event.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length];
    if (!next) return;

    setView(next.view);
    void tick().then(() => document.getElementById(`tab-${next.view}`)?.focus());
  };

  const readAddress = (): void => {
    const next = parseUrlState(location.search, location.hash);
    const closing = explorer.selected !== null && next.selected === null;

    explorer = next;
    void focusHeading(closing ? next.view : null);
  };

  const resetLibrary = (): void => {
    explorer = { ...initialState };
    writeAddress('replace');
  };

  const rebuild = async (
    notes: NoteSource[],
    skipped: ExcludedNote[],
  ): Promise<PatternDataset | null> => {
    const { buildDataset, parseTypeList } = await import('./normalize-notes');
    const types = parseTypeList(includedTypes);

    if (types.length === 0) {
      loadError = 'Enter at least one type to include, such as pattern.';

      return null;
    }

    const built = buildDataset(notes, { includedTypes: types });

    return {
      entries: built.entries,
      report: {
        ...built.report,
        notesRead: built.report.notesRead + skipped.length,
        excluded: [...built.report.excluded, ...skipped],
      },
    };
  };

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    loadError = null;
    loadStatus = null;

    try {
      const files = await source;

      if (files.length === 0) {
        loadError = 'That didn’t include any files. Choose a folder of Markdown notes.';

        return;
      }

      const { notes, skipped, truncated } = await readNotes(files, (index, total) => {
        loadProgress = `Reading note ${index + 1} of ${total}…`;
      });

      if (notes.length === 0) {
        loadError = 'That didn’t include any Markdown files.';

        return;
      }

      const built = await rebuild(notes, skipped);
      if (!built) return;

      const name = commonFolderName(notes.map(({ path }) => path));

      folder = {
        name,
        libraryKey: folderLibraryKey(name, notes),
        notes,
        skipped,
        truncated,
        dataset: built,
      };
      resetLibrary();
      loadStatus = `Read ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}.`;
    } catch {
      loadError = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      loading = false;
      loadProgress = null;
    }
  };

  const commitTypes = async (): Promise<void> => {
    if (!folder) return;

    loadError = null;
    const built = await rebuild(folder.notes, folder.skipped);

    if (built) {
      folder = { ...folder, dataset: built };
      resetLibrary();
    }
  };

  const returnToBundled = (): void => {
    folder = null;
    loadStatus = null;
    loadError = null;
    resetLibrary();
  };

  const fetchBundled = async (): Promise<PatternDataset | null> => {
    try {
      const response = await fetch(bundledLibraryPath);

      // The file was validated when the page prerendered, so the browser trusts its shape.
      return response.ok ? ((await response.json()) as PatternDataset) : null;
    } catch {
      return null;
    }
  };

  onMount(() => {
    // The address is read with the library, not before it: an entry named in the address would
    // otherwise open with its sections still empty.
    void fetchBundled().then((library) => {
      bundled = library;
      bundledFailed = library === null;
      explorer = parseUrlState(location.search, location.hash);
      shortlist = readShortlist();
      shortlistLoaded = true;
      ready = true;
    });

    // Warm the views the page loads on demand, so opening one doesn't wait on the network.
    void import('./entry-detail.svelte');
    void import('./shortlist-view.svelte');
    void import('./compare-view.svelte');

    window.addEventListener('popstate', readAddress);

    return () => window.removeEventListener('popstate', readAddress);
  });

  // The shortlist is saved as a convenience, once the saved one has been read.
  $effect(() => {
    const items = $state.snapshot(shortlist);
    if (shortlistLoaded) writeShortlist(items);
  });

  // The graph is the biggest piece of the page, so it loads when it's first wanted.
  $effect(() => {
    if (explorer.view === 'graph' && graphComponent === null) {
      void import('./pattern-graph.svelte').then((module) => {
        graphComponent = module.default;
      });
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-10 {comparedEntries.length > 0 && explorer.view !== 'compare' ? 'pb-24' : ''}">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      The agentic coding pattern landscape
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      {entries.length} named {entries.length === 1 ? 'pattern' : 'patterns'}, each with
      <em>when not to use it</em>. Start from the grid, or search.
    </p>
  </header>

  {#if folder}
    <div
      role="status"
      class="bg-primary-50 border-primary-300 dark:bg-primary-950/50 dark:border-primary-700 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm text-slate-900 dark:text-white"
    >
      <span>
        Viewing {entries.length}
        {entries.length === 1 ? 'note' : 'notes'} from <em>{folder.name ?? 'your files'}</em>
        ·
      </span>
      <button
        type="button"
        onclick={returnToBundled}
        class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer rounded font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Return to bundled library
      </button>
      {#if folder.truncated}
        <span class="w-full text-amber-800 dark:text-amber-300">
          That folder held more notes than this page reads, so the rest were left out.
        </span>
      {/if}
    </div>
  {/if}

  <HeatGrid
    {grid}
    gridBy={explorer.gridBy}
    filters={explorer.filters}
    {ready}
    onSelect={selectGridCell}
    onChangeDimension={changeGridDimension}
  />

  <section aria-labelledby="browser-heading" class="space-y-4">
    <h2 id="browser-heading" class="sr-only">Browse the library</h2>

    <div
      role="tablist"
      aria-label="Views"
      class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700"
    >
      {#each tabs as tab, index (tab.view)}
        <button
          type="button"
          role="tab"
          id="tab-{tab.view}"
          aria-selected={explorer.view === tab.view}
          aria-controls="view-panel"
          tabindex={explorer.view === tab.view ? 0 : -1}
          disabled={!ready}
          onclick={() => setView(tab.view)}
          onkeydown={(event) => handleTabKeydown(event, index)}
          class="focus-visible:outline-primary-600 -mb-px cursor-pointer rounded-t border-b-2 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-wait {explorer.view ===
          tab.view
            ? 'border-primary-600 text-primary-800 dark:border-primary-300 dark:text-primary-200'
            : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div
      id="view-panel"
      role="tabpanel"
      aria-labelledby="tab-{explorer.view}"
      class="space-y-4 rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-700"
    >
      {#if showingToolbar}
        <FilterToolbar
          state={explorer}
          {types}
          {ready}
          shown={results.length}
          total={entries.length}
          description={describeFilters(explorer)}
          bind:searchInput
          onQuery={setQuery}
          onFilters={setFilters}
          onClear={clearFilters}
        />
      {/if}

      {#if showingDetail}
        {#if selectedEntry}
          {#await import('./entry-detail.svelte') then { default: EntryDetail }}
            <EntryDetail
              entry={selectedEntry}
              {graph}
              {position}
              compared={explorer.compare.includes(selectedEntry.id)}
              {comparisonFull}
              starred={starred.has(selectedEntry.id)}
              {ready}
              {hrefFor}
              onOpen={openEntry}
              onBack={closeEntry}
              onPrevious={() => step(-1)}
              onNext={() => step(1)}
              onToggleCompare={() => toggleCompare(selectedEntry.id)}
              onToggleStar={() => toggleShortlist(selectedEntry.id)}
            />
          {/await}
        {:else}
          <div class="space-y-3">
            <h2
              tabindex="-1"
              data-view-heading
              class="text-xl font-bold text-slate-900 outline-none dark:text-white"
            >
              No entry with that link
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              This library has no entry called “{explorer.selected}”. It may be in a different
              library than the one you're viewing.
            </p>
            <button
              type="button"
              onclick={closeEntry}
              class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer rounded text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Back to the list
            </button>
          </div>
        {/if}
      {:else if explorer.view === 'list'}
        <h2
          tabindex="-1"
          data-view-heading
          class="text-xl font-bold text-slate-900 outline-none dark:text-white"
        >
          Patterns
        </h2>
        {#if entries.length === 0}
          <div
            class="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"
          >
            <p class="font-semibold text-slate-900 dark:text-white">No entries loaded.</p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              None of those notes has an included type. Check the included types below, or return to
              the bundled library.
            </p>
            {#if folder}
              <button
                type="button"
                onclick={returnToBundled}
                class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 mt-3 cursor-pointer rounded text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Return to bundled library
              </button>
            {/if}
          </div>
        {:else}
          <EntryList
            {results}
            {terms}
            {summaries}
            compared={explorer.compare}
            {comparisonFull}
            {starred}
            {ready}
            {hrefFor}
            onOpen={openEntry}
            onToggleCompare={toggleCompare}
            onToggleStar={toggleShortlist}
            onClearFilters={clearFilters}
            hasFilters={filtersActive}
          />
        {/if}
      {:else if explorer.view === 'graph'}
        <h2
          id="graph-heading"
          tabindex="-1"
          data-view-heading
          class="text-xl font-bold text-slate-900 outline-none dark:text-white"
        >
          Relationship graph
        </h2>
        {#if graphComponent}
          {@const Graph = graphComponent}
          <Graph {graph} {matching} {hrefFor} onOpen={openEntry} />
        {:else}
          <p class="text-sm text-slate-600 dark:text-slate-300">Loading the graph…</p>
        {/if}
      {:else if explorer.view === 'compare'}
        {#await import('./compare-view.svelte') then { default: CompareView }}
          <CompareView
            entries={comparedEntries}
            {graph}
            {hrefFor}
            onOpen={openEntry}
            onRemove={removeCompared}
            onBack={() => setView('list')}
          />
        {/await}
      {:else}
        {#await import('./shortlist-view.svelte') then { default: ShortlistView }}
          <ShortlistView
            rows={shortlistRows}
            hiddenCount={hiddenShortlistCount}
            {ready}
            {hrefFor}
            onOpen={openEntry}
            onNote={noteOnShortlist}
            onRemove={(entry) => toggleShortlist(entry.id)}
            onBrowse={() => setView('list')}
          />
        {/await}
      {/if}
    </div>
  </section>

  {#if bundledFailed && folder === null}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">
      The full text of the patterns didn’t load, so entries show only their summaries. Reload the
      page to try again.
    </p>
  {/if}

  <LibraryLoader
    bind:includedTypes
    busy={loading}
    progress={loadProgress}
    status={loadStatus}
    error={loadError}
    onFiles={loadFiles}
    onTypesCommit={commitTypes}
  />

  {#if ready}
    {#await import('./diagnostics-panel.svelte') then { default: DiagnosticsPanel }}
      <DiagnosticsPanel
        report={dataset.report}
        {entries}
        {hrefFor}
        onOpen={openEntry}
        open={folder !== null && problemCount > 0}
      />
    {/await}
  {/if}

  <footer
    class="max-w-3xl space-y-2 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
  >
    <p>
      <span class="font-semibold text-slate-800 dark:text-slate-100"
        >Where the data comes from.</span
      >
      {entries.length}
      {entries.length === 1 ? 'note' : 'notes'} typed
      {dataset.report.includedTypes.map((type) => `“${type}”`).join(' or ') || '…'}, out of {dataset
        .report.notesRead} read. The other {dataset.report.excluded.length}, such as an index or a
      reference note, are excluded.
    </p>
    <p>
      <span class="font-semibold text-slate-800 dark:text-slate-100">What a relation is.</span>
      Relations are the curated Related Patterns links in each note, {dataset.report
        .relatedLinkCount} in all, not every incidental mention.
    </p>
    <p>
      <span class="font-semibold text-slate-800 dark:text-slate-100">What the labels mean.</span>
      Maturity, confidence, and category are the library author's judgement and a way to navigate. They
      aren't measured adoption or a standard taxonomy.
    </p>
  </footer>
</div>

{#if comparedEntries.length > 0 && explorer.view !== 'compare'}
  <CompareTray
    entries={comparedEntries}
    onRemove={removeCompared}
    onClear={() => update({ ...explorer, compare: [] }, 'replace')}
    onOpenComparison={() => setView('compare')}
  />
{/if}
