<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import { formatCalendarDate } from '$lib/experiments/format';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { experiment } from './experiment';
  import { findModelPricing } from '$lib/experiments/model-pricing';
  import ModelPricingTable from './model-pricing-table.svelte';
  import SessionFileInput from './session-file-input.svelte';
  import { readSessionFiles } from './session-files';
  import SessionSummary from './session-summary.svelte';
  import type { SessionUsage } from './session-usage';
  import TokenCountField from './token-count-field.svelte';
  import { tokenUsageEquals } from './token-usage';
  import type { TokenUsage } from './token-usage';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/model-calculator` },
  ]);

  // One million tokens in and out, so the cost column starts out matching the
  // table's "1M in + 1M out" column.
  const defaultUsage: TokenUsage = {
    uncachedInput: 1_000_000,
    cacheRead: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
    output: 1_000_000,
  };

  let usage = $state<TokenUsage>({ ...defaultUsage });
  let session = $state.raw<SessionUsage | null>(null);
  let progress = $state<{ current: number; total: number } | null>(null);
  // Set from the drop, before a dropped folder has been walked, so a second drop can't start.
  let loading = $state(false);
  let readError = $state<string | null>(null);
  let readMessage = $state<string | null>(null);
  let cacheWritesOpen = $state(false);

  const usedModelIds = $derived(
    new Set(
      (session?.models ?? []).flatMap((entry) => {
        const pricing = findModelPricing(entry.model, data.catalog.models);

        return pricing ? [pricing.id] : [];
      }),
    ),
  );

  const totalsApplied = $derived(session !== null && tokenUsageEquals(usage, session.total));

  const applySessionTotals = (): void => {
    if (!session) return;

    usage = { ...session.total };
    if (usage.cacheWrite5m + usage.cacheWrite1h > 0) cacheWritesOpen = true;
  };

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    readError = null;
    readMessage = null;

    try {
      const files = await source;

      if (files.length === 0) {
        readError =
          'That didn’t include any session files. Claude Code and Codex save sessions as .jsonl files.';

        return;
      }

      progress = { current: 1, total: files.length };
      session = await readSessionFiles(files, (index) => {
        progress = { current: index + 1, total: files.length };
      });

      if (session.requests > 0) applySessionTotals();

      // The summary renders below the fold on a phone, so say so where the person dropped the files.
      const fileCount = files.length === 1 ? '1 file' : `${files.length} files`;
      readMessage =
        session.requests > 0
          ? `Read ${fileCount}. The session’s usage is below.`
          : `Read ${fileCount}, but found no model usage.`;
    } catch {
      readError = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      progress = null;
      loading = false;
    }
  };

  const clearSession = (): void => {
    session = null;
    readMessage = null;
    usage = { ...defaultUsage };
    cacheWritesOpen = false;
  };
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Model Pricing Calculator
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      What would the same work cost on a different model? Enter token counts, or drop in a Claude
      Code or Codex session to price its real usage on every model below.
    </p>
  </header>

  <div class="grid gap-8 lg:grid-cols-2">
    <section aria-labelledby="token-counts-heading" class="space-y-4">
      <div class="space-y-1">
        <h2 id="token-counts-heading" class="text-xl font-bold text-slate-900 dark:text-white">
          Token counts
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Shorthand works too, such as 250k or 1.5M.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <TokenCountField
          id="uncached-input"
          label="Uncached input"
          description="Billed at the full input price."
          bind:value={usage.uncachedInput}
        />
        <TokenCountField
          id="cached-input"
          label="Cached input"
          description="Read from a prompt cache."
          bind:value={usage.cacheRead}
        />
        <TokenCountField
          id="output"
          label="Output"
          description="Includes reasoning tokens."
          bind:value={usage.output}
        />
      </div>

      <details bind:open={cacheWritesOpen} class="group space-y-3">
        <summary
          class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        >
          Cache writes
        </summary>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Anthropic charges extra to write to its prompt cache: 1.25 times the input price for an
          entry that lasts five minutes, and twice the input price for one that lasts an hour. Other
          providers bill these tokens as uncached input.
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <TokenCountField
            id="cache-write-five-minutes"
            label="Five-minute cache writes"
            bind:value={usage.cacheWrite5m}
          />
          <TokenCountField
            id="cache-write-one-hour"
            label="One-hour cache writes"
            bind:value={usage.cacheWrite1h}
          />
        </div>
      </details>
    </section>

    <section aria-labelledby="session-heading" class="flex flex-col gap-4">
      <div class="space-y-1">
        <h2 id="session-heading" class="text-xl font-bold text-slate-900 dark:text-white">
          Or price a real session
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          The session's token counts fill in the fields, and the table prices them on every model.
        </p>
      </div>
      <SessionFileInput {progress} busy={loading} message={readMessage} onFiles={loadFiles} />
      {#if readError}
        <p role="alert" class="text-sm text-red-700 dark:text-red-400">{readError}</p>
      {/if}
    </section>
  </div>

  {#if session}
    <SessionSummary
      {session}
      models={data.catalog.models}
      {totalsApplied}
      onApplyTotals={applySessionTotals}
      onClear={clearSession}
    />
  {/if}

  <section aria-labelledby="comparison-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="comparison-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Comparison
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Prices are US dollars per million tokens, last updated {formatCalendarDate(
          data.catalog.updated,
        )}. The cost column prices the token counts above.
      </p>
    </div>

    <ModelPricingTable
      models={data.catalog.models}
      {usage}
      {usedModelIds}
      largestPrompt={session?.largestPrompt ?? null}
    />

    <ul class="max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
      <li>
        Pricing a session on another model assumes that model would use the same tokens. Models
        tokenize text differently and write different amounts of output and reasoning, so treat
        other models' costs as estimates.
      </li>
      <li>
        Codex sessions don't report cache writes, so the Claude prices for a Codex session leave out
        Anthropic's cache-write premium.
      </li>
      <li>Prices marked ≤200K or &lt;200K only cover prompts up to 200,000 tokens.</li>
      <li>Tool fees, such as web searches, aren't included.</li>
    </ul>
  </section>
</div>
