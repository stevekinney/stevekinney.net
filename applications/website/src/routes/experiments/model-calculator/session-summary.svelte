<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { calculateCost } from './calculate-cost';
  import { formatCompactTokenCount, formatCost, formatTokenCount } from '$lib/experiments/format';
  import { findModelPricing } from '$lib/experiments/model-pricing';
  import type { ModelPricing } from '$lib/experiments/model-pricing';
  import type { SessionFormat, SessionUsage } from './session-usage';
  import { totalInputTokens } from './token-usage';

  type Props = {
    session: SessionUsage;
    models: ModelPricing[];
    /** Whether the token counts still match this session's totals. */
    totalsApplied: boolean;
    onApplyTotals: () => void;
    onClear: () => void;
  };

  const { session, models, totalsApplied, onApplyTotals, onClear }: Props = $props();

  const FORMAT_LABELS: Record<SessionFormat, string> = {
    'claude-code': 'Claude Code',
    codex: 'Codex',
  };

  const usageRows = $derived(
    session.models.map((entry) => {
      const pricing = findModelPricing(entry.model, models);

      return { ...entry, cost: pricing ? calculateCost(entry.usage, pricing) : null };
    }),
  );

  const unpricedModels = $derived(
    usageRows.filter((row) => row.cost === null).map((row) => row.model),
  );
  const pricedCost = $derived(usageRows.reduce((sum, row) => sum + (row.cost ?? 0), 0));
  const unrecognizedFiles = $derived(session.files.filter((file) => file.format === null));
  const unreadableLines = $derived(
    session.files.reduce((sum, file) => sum + file.unreadableLines, 0),
  );

  const statistics = $derived([
    { label: 'Requests', value: formatTokenCount(session.requests) },
    { label: 'Input tokens', value: formatCompactTokenCount(totalInputTokens(session.total)) },
    { label: 'Output tokens', value: formatCompactTokenCount(session.total.output) },
    {
      label: unpricedModels.length > 0 ? 'Cost of the listed models' : 'Cost as run',
      value: unpricedModels.length === usageRows.length ? '—' : formatCost(pricedCost),
    },
  ]);

  const cell = 'px-3 py-2 text-right whitespace-nowrap tabular-nums';
</script>

<section
  aria-labelledby="session-summary-heading"
  class="space-y-5 rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-700"
>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 id="session-summary-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Session usage
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {session.files.length === 1 ? '1 file' : `${session.files.length} files`} read in your browser.
      </p>
    </div>
    <Button variant="secondary" size="small" onclick={onClear}>Clear session</Button>
  </div>

  {#if session.requests === 0}
    <p class="text-slate-700 dark:text-slate-200">
      These files don't contain any model usage. Claude Code and Codex record usage in their session
      files as a session runs, so try a session that has at least one response.
    </p>
  {:else}
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {#each statistics as statistic (statistic.label)}
        <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
          <dt class="text-sm text-slate-500 dark:text-slate-400">{statistic.label}</dt>
          <dd class="text-2xl font-semibold text-slate-900 tabular-nums dark:text-white">
            {statistic.value}
          </dd>
        </div>
      {/each}
    </dl>

    {#if !totalsApplied}
      <p
        class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        You've changed the token counts since loading this session, so the comparison no longer
        matches it.
        <Button variant="ghost" size="small" onclick={onApplyTotals}
          >Use the session's totals</Button
        >
      </p>
    {/if}

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
      tabindex="0"
      role="region"
      aria-label="Session usage by model"
    >
      <table class="w-full min-w-[44rem] border-collapse text-sm">
        <caption class="sr-only">Tokens and cost for each model the session used</caption>
        <thead>
          <tr
            class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            <th scope="col" class="px-3 py-2 text-left font-semibold">Model</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Requests</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Uncached input</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Cached input</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Cache writes</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Output</th>
            <th scope="col" class="px-3 py-2 text-right font-semibold">Cost</th>
          </tr>
        </thead>
        <tbody>
          {#each usageRows as row (row.model)}
            <tr class="border-b border-slate-200 dark:border-slate-800">
              <th scope="row" class="px-3 py-2 text-left font-mono text-xs font-normal">
                {row.model}
              </th>
              <td class={cell}>{formatTokenCount(row.requests)}</td>
              <td class={cell}>{formatTokenCount(row.usage.uncachedInput)}</td>
              <td class={cell}>{formatTokenCount(row.usage.cacheRead)}</td>
              <td class={cell}>
                {formatTokenCount(row.usage.cacheWrite5m + row.usage.cacheWrite1h)}
              </td>
              <td class={cell}>{formatTokenCount(row.usage.output)}</td>
              <td class={cell}>
                {#if row.cost === null}
                  <span class="text-slate-500 dark:text-slate-400">Not listed</span>
                {:else}
                  {formatCost(row.cost)}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
      {#if session.reportedCost !== null}
        <li>
          Claude Code recorded its own total of <span class="font-semibold"
            >{formatCost(session.reportedCost)}</span
          >. That figure also counts requests the transcript doesn't record, such as session titles
          and web searches, so the two won't match exactly.
        </li>
      {/if}
      {#if unpricedModels.length > 0}
        <li>
          The price list doesn't include <span class="font-mono text-xs"
            >{unpricedModels.join(', ')}</span
          >, so {unpricedModels.length === 1 ? 'its' : 'their'} cost as run is left out. Every token still
          counts in the comparison below.
        </li>
      {/if}
    </ul>
  {/if}

  {#if unrecognizedFiles.length > 0 || unreadableLines > 0}
    <ul class="space-y-2 text-sm text-amber-800 dark:text-amber-300">
      {#if unrecognizedFiles.length > 0}
        <li class="flex items-start gap-2">
          <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          <span>
            Skipped {unrecognizedFiles.length === 1 ? 'a file that isn’t' : 'files that aren’t'} a Claude
            Code or Codex session:
            <span class="font-mono text-xs break-all"
              >{unrecognizedFiles.map((file) => file.name).join(', ')}</span
            >
          </span>
        </li>
      {/if}
      {#if unreadableLines > 0}
        <li class="flex items-start gap-2">
          <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          <span>
            {unreadableLines === 1 ? 'One line' : `${formatTokenCount(unreadableLines)} lines`}
            couldn't be read, which usually means a session was still being written. Everything else counted.
          </span>
        </li>
      {/if}
    </ul>
  {/if}

  <details class="text-sm">
    <summary
      class="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
    >
      Files read
    </summary>
    <ul class="mt-2 space-y-1">
      {#each session.files as file, index (index)}
        <li class="flex flex-wrap justify-between gap-x-4 text-slate-600 dark:text-slate-300">
          <span class="font-mono text-xs break-all">{file.name}</span>
          <span class="whitespace-nowrap">
            {file.format ? FORMAT_LABELS[file.format] : 'Not a session'} · {formatTokenCount(
              file.requests,
            )}
            {file.requests === 1 ? 'request' : 'requests'}
          </span>
        </li>
      {/each}
    </ul>
  </details>
</section>
