<script lang="ts">
  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { readLines } from '$lib/experiments/read-lines';

  import BarChart from './bar-chart.svelte';
  import { formatLines, formatNumber, plural } from './display';
  import {
    bodyClasses,
    codeClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
  } from './field-styles';
  import {
    defaultAgentRules,
    LISTING_COMMAND,
    MAX_LISTING_CHARACTERS,
    measuredInputs,
    measureThroughput,
    parseListing,
  } from './listing';
  import type { GroupStats, ParsedListing } from './listing';

  type Props = {
    linesPerSitting: number;
    agents: number;
    onLoad: (values: { linesPerPr: number; prsPerAgent: number }) => void;
  };

  const { linesPerSitting, agents, onLoad }: Props = $props();

  let pasted = $state('');
  let listing = $state.raw<ParsedListing | null>(null);
  let problem = $state<string | null>(null);
  let busy = $state(false);
  let status = $state<string | null>(null);
  let useBotFlag = $state(defaultAgentRules.useBotFlag);
  let patterns = $state(defaultAgentRules.patterns);
  let loadedMessage = $state<string | null>(null);

  const report = $derived(
    listing
      ? measureThroughput(listing.pullRequests, { useBotFlag, patterns }, linesPerSitting)
      : null,
  );
  const offer = $derived(report ? measuredInputs(report, agents) : null);

  const read = (text: string): void => {
    loadedMessage = null;
    const result = parseListing(text);

    if ('error' in result) {
      problem = result.error;
      listing = null;
    } else {
      problem = null;
      listing = result;
    }
  };

  const readFile = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (busy) return;

    busy = true;
    status = null;
    try {
      const [first] = await source;
      if (!first) {
        problem = 'That didn’t include a file.';
        return;
      }
      if (first.file.size > MAX_LISTING_CHARACTERS) {
        problem = 'That file is over 5 MB. Ask for fewer pull requests with --limit.';
        return;
      }

      const lines: string[] = [];
      await readLines(first.file.stream(), (line) => lines.push(line));
      const text = lines.join('\n');
      pasted = text;
      read(text);
      status = `Read ${first.file.name}.`;
    } catch {
      problem = 'That file couldn’t be read. Try choosing it again.';
    } finally {
      busy = false;
    }
  };

  const formatHours = (hours: number | null): string =>
    hours === null
      ? '—'
      : hours < 48
        ? `${formatNumber(Math.round(hours * 10) / 10)} h`
        : `${formatNumber(Math.round((hours / 24) * 10) / 10)} d`;

  const formatRate = (value: number | null): string =>
    value === null ? '—' : formatNumber(Math.round(value * 10) / 10);

  const groups = $derived<{ name: string; stats: GroupStats }[]>(
    report
      ? [
          { name: 'Agents', stats: report.agents },
          { name: 'People', stats: report.humans },
          { name: 'All', stats: report.all },
        ]
      : [],
  );
</script>

<div class="space-y-5">
  <p class={bodyClasses}>
    Run this in a repository and paste what it prints, or save it to a file and drop the file:
  </p>
  <pre
    class="overflow-x-auto rounded bg-slate-100 p-3 font-mono text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100"><code
      >{LISTING_COMMAND}</code
    ></pre>

  <div class="grid gap-4 lg:grid-cols-2">
    <div class="min-w-0 space-y-2">
      <label for="listing-json" class={labelClasses}>Paste the listing’s JSON</label>
      <textarea
        id="listing-json"
        rows="6"
        bind:value={pasted}
        spellcheck="false"
        aria-describedby="listing-privacy"
        class="{fieldClasses} w-full font-mono text-xs"></textarea>
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="small" onclick={() => read(pasted)}>Measure</Button>
      </div>
      <p id="listing-privacy" class={hintClasses}>
        The listing is read in this tab and never sent anywhere.
      </p>
    </div>
    <FileDropZone
      title="Or drop a saved listing"
      draggingTitle="Drop to measure this listing"
      accept=".json,application/json"
      fileButtonLabel="Choose a JSON file"
      class="h-full"
      {busy}
      progress={busy ? 'Reading the listing…' : null}
      {status}
      onFiles={readFile}
    >
      <p>
        A file saved from the command above, such as <code class={codeClasses}>prs.json</code>. It’s
        read in this tab and nothing is sent anywhere.
      </p>
    </FileDropZone>
  </div>

  {#if problem}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
  {/if}

  <fieldset class="space-y-2">
    <legend class={labelClasses}>Which authors are agents</legend>
    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input type="checkbox" bind:checked={useBotFlag} class="accent-primary-600 h-4 w-4" />
      Accounts GitHub marks as bots
    </label>
    <label for="agent-patterns" class="block text-sm text-slate-700 dark:text-slate-200">
      Logins and patterns, separated by commas; <code class={codeClasses}>*</code> matches anything
    </label>
    <input
      id="agent-patterns"
      type="text"
      autocomplete="off"
      spellcheck="false"
      bind:value={patterns}
      class="{fieldClasses} w-full max-w-md font-mono text-sm"
    />
    <p class={hintClasses}>
      The GitHub CLI prints a bot as <code class={codeClasses}>app/name</code>; the website shows
      <code class={codeClasses}>name[bot]</code>. An agent that opens pull requests through your own
      account looks like you, so add a pattern for its branch-owning login if it has one.
    </p>
  </fieldset>

  {#if listing && report}
    <section
      aria-labelledby="throughput-results-heading"
      class="space-y-4"
      data-testid="throughput-results"
    >
      <h3 id="throughput-results-heading" class="text-lg font-bold text-slate-900 dark:text-white">
        What your listing says
      </h3>
      <p class="text-slate-800 dark:text-slate-100" data-testid="listing-summary">
        {listing.pullRequests.length}
        {plural(listing.pullRequests.length, 'pull request')} read{listing.skipped.length > 0
          ? `, ${listing.skipped.length} skipped`
          : ''}. {formatNumber(Math.round(report.shareOverOneSitting * 1000) / 10)}% are more than
        one effective sitting ({formatLines(linesPerSitting)} lines).
        {#if report.undated > 0}
          {report.undated} without a merge date count toward sizes but not toward timing.
        {/if}
      </p>

      {#if listing.skipped.length > 0}
        <details>
          <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
            Skipped entries
          </summary>
          <ul
            class="mt-2 list-disc pl-6 text-sm text-slate-700 dark:text-slate-200"
            data-testid="skipped-entries"
          >
            {#each listing.skipped.slice(0, 50) as entry (entry.position)}
              <li>Entry {entry.position}: {entry.reason}</li>
            {/each}
            {#if listing.skipped.length > 50}
              <li>…and {listing.skipped.length - 50} more</li>
            {/if}
          </ul>
        </details>
      {/if}

      <BarChart
        label="Pull requests by lines changed. Striped bars need more than one effective sitting. Arrow keys move between sizes. The table below has the same numbers."
        axisTitle="Lines changed"
        categories={report.histogram.map((bin) => bin.label)}
        series={[
          {
            id: 'fits',
            name: 'Fits one sitting',
            values: report.histogram.map((bin) => (bin.overOneSitting ? 0 : bin.count)),
            tone: 'primary',
          },
          {
            id: 'over',
            name: 'More than one effective sitting',
            values: report.histogram.map((bin) => (bin.overOneSitting ? bin.count : 0)),
            tone: 'amber',
            hatched: true,
          },
        ]}
        formatValue={(value) => `${value} ${plural(value, 'pull request')}`}
        testId="histogram-chart"
      />

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
        role="region"
        aria-label="Throughput by author group"
        tabindex="0"
      >
        <table
          class="w-full min-w-[34rem] text-left text-sm tabular-nums"
          data-testid="throughput-table"
        >
          <thead class="text-slate-600 dark:text-slate-300">
            <tr>
              <th scope="col" class="py-1 pr-3">Authors</th>
              <th scope="col" class="py-1 pr-3">Pull requests</th>
              <th scope="col" class="py-1 pr-3">Median lines</th>
              <th scope="col" class="py-1 pr-3">Per working day</th>
              <th scope="col" class="py-1 pr-3">Lines per day</th>
              <th scope="col" class="py-1">Median to merge</th>
            </tr>
          </thead>
          <tbody class="text-slate-800 dark:text-slate-100">
            {#each groups as group (group.name)}
              <tr class="border-t border-slate-200 dark:border-slate-700">
                <th scope="row" class="py-1 pr-3 font-normal">{group.name}</th>
                <td class="py-1 pr-3">{group.stats.count}</td>
                <td class="py-1 pr-3">
                  {group.stats.medianLines === null ? '—' : formatLines(group.stats.medianLines)}
                </td>
                <td class="py-1 pr-3">{formatRate(group.stats.perDay)}</td>
                <td class="py-1 pr-3">
                  {group.stats.linesPerDay === null ? '—' : formatLines(group.stats.linesPerDay)}
                </td>
                <td class="py-1">{formatHours(group.stats.medianHoursToMerge)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class={hintClasses}>
        Per working day counts weekdays, in UTC, from the first merge to the last ({report.workingDays}
        {plural(report.workingDays, 'day')}). Ninety percent merged within {formatHours(
          report.p90HoursToMerge,
        )}.
      </p>

      <details>
        <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
          By login ({report.authors.length})
        </summary>
        <ul class="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {#each report.authors.slice(0, 40) as author (author.login)}
            <li class="[overflow-wrap:anywhere]">
              <span class="font-mono">{author.login}</span>: {author.count}, median {formatLines(
                author.medianLines,
              )}
              lines{author.agent ? ' (agent)' : ''}
            </li>
          {/each}
        </ul>
      </details>

      {#if offer}
        <div class="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
          <p class="text-slate-800 dark:text-slate-100" data-testid="load-offer">
            From {offer.source === 'agents'
              ? 'your agent pull requests'
              : 'all your pull requests, since no agents matched'}:
            {formatLines(offer.linesPerPr)} lines per pull request and {formatNumber(
              offer.prsPerAgent,
            )}
            {plural(offer.prsPerAgent, 'pull request')} per agent per day, shared across your {agents}
            {plural(agents, 'agent')}.
          </p>
          <Button
            variant="secondary"
            size="small"
            onclick={() => {
              onLoad({ linesPerPr: offer.linesPerPr, prsPerAgent: offer.prsPerAgent });
              loadedMessage = 'Loaded into your scenario above.';
            }}
          >
            Load these into the simulator
          </Button>
          <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
            {loadedMessage}
          </p>
        </div>
      {/if}
    </section>
  {/if}
</div>
