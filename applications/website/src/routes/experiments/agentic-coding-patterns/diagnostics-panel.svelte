<script lang="ts">
  import type { DatasetReport, PatternEntry } from './pattern-types';
  import { sectionLabels } from './pattern-constants';

  type Props = {
    report: DatasetReport;
    entries: readonly PatternEntry[];
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    /** Whether the details start open. A folder with problems opens them. */
    open?: boolean;
  };

  const { report, entries, hrefFor, onOpen, open = false }: Props = $props();

  const entryCount = $derived(entries.length);
  const danglingCount = $derived(report.dangling.length);

  const typeSummary = $derived(
    Object.entries(report.includedByType)
      .map(([type, count]) => `${count} ${type}`)
      .join(', '),
  );

  const linkClass =
    'text-primary-700 dark:text-primary-300 rounded font-medium underline underline-offset-2';
</script>

{#snippet entryLink(id: string, name: string)}
  <a href={hrefFor(id)} onclick={(event) => onOpen(id, event)} class={linkClass}>{name}</a>
{/snippet}

<details {open} class="rounded-lg border border-slate-200 dark:border-slate-700">
  <summary
    class="focus-visible:outline-primary-600 cursor-pointer rounded-lg px-4 py-3 font-semibold text-slate-900 focus-visible:outline-2 dark:text-white"
  >
    Diagnostics
    <span class="font-normal text-slate-600 dark:text-slate-300">
      · {entryCount} included, {report.excluded.length} excluded, {report.partial.length} partial,
      {danglingCount} dangling
    </span>
  </summary>

  <div class="space-y-5 border-t border-slate-200 px-4 py-4 text-sm dark:border-slate-700">
    <p class="text-slate-700 dark:text-slate-200">
      The same report the build script prints. {report.notesRead}
      {report.notesRead === 1 ? 'note was' : 'notes were'} read, and {entryCount} included{typeSummary
        ? ` (${typeSummary})`
        : ''}. Included types: {report.includedTypes.join(', ') || 'none'}.
    </p>

    <section aria-labelledby="diagnostics-excluded" class="space-y-1.5">
      <h3 id="diagnostics-excluded" class="font-bold text-slate-900 dark:text-white">
        Excluded notes ({report.excluded.length})
      </h3>
      {#if report.excluded.length === 0}
        <p class="text-slate-600 dark:text-slate-300">None.</p>
      {:else}
        <ul class="space-y-1">
          {#each report.excluded as { path, reason } (path)}
            <li>
              <code class="rounded bg-slate-100 px-1 py-0.5 break-all dark:bg-slate-800"
                >{path}</code
              >
              {reason}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section aria-labelledby="diagnostics-partial" class="space-y-1.5">
      <h3 id="diagnostics-partial" class="font-bold text-slate-900 dark:text-white">
        Partial entries ({report.partial.length})
      </h3>
      {#if report.partial.length === 0}
        <p class="text-slate-600 dark:text-slate-300">
          None. Every entry has a summary and both when-to-use sections.
        </p>
      {:else}
        <ul class="space-y-1">
          {#each report.partial as { id, name, missing } (id)}
            <li>
              {@render entryLink(id, name)} is missing
              {missing.map((section) => sectionLabels[section]).join(', ')}.
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section aria-labelledby="diagnostics-dangling" class="space-y-1.5">
      <h3 id="diagnostics-dangling" class="font-bold text-slate-900 dark:text-white">
        Dangling related links ({danglingCount})
      </h3>
      {#if danglingCount === 0}
        <p class="text-slate-600 dark:text-slate-300">None.</p>
      {:else}
        <p class="text-slate-600 dark:text-slate-300">
          Related Patterns that point at a note this library doesn't have.
        </p>
        <ul class="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {#each report.dangling as { id, name, target } (id + target)}
            <li>{@render entryLink(id, name)} links to “{target}”</li>
          {/each}
        </ul>
      {/if}
    </section>

    <section aria-labelledby="diagnostics-unknown" class="space-y-1.5">
      <h3 id="diagnostics-unknown" class="font-bold text-slate-900 dark:text-white">
        Unknown category, maturity, or confidence ({report.unknown.length})
      </h3>
      {#if report.unknown.length === 0}
        <p class="text-slate-600 dark:text-slate-300">None.</p>
      {:else}
        <ul class="space-y-1">
          {#each report.unknown as { id, name, field, value } (id + field)}
            <li>
              {@render entryLink(id, name)}: {field}
              {value === '' ? 'is missing' : `“${value}” isn’t one of the known values`}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <p class="text-slate-700 dark:text-slate-200">
      Related links in total: <span class="font-semibold tabular-nums"
        >{report.relatedLinkCount}</span
      >.
    </p>
  </div>
</details>
