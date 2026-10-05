<script lang="ts">
  import { onMount } from 'svelte';

  import type { SourceFile } from '$lib/experiments/dropped-files';
  import { formatTokenCount } from '$lib/experiments/format';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { analyze, emptyFilters } from './analysis';
  import type { Filters } from './analysis';
  import type { AuditData } from './audit-data';
  import { parseMarks, serializeMarks } from './control-rows';
  import type { FixMark } from './control-rows';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses } from './field-styles';
  import IntakePanel from './intake-panel.svelte';
  import LazySection from './lazy-section.svelte';
  import PredictionCard from './prediction-card.svelte';
  import { presetSummaries } from './preset-list';
  import type { PriceRow } from './pricing';
  import { isAbortError, readSessionFiles } from './read-sessions';
  import type { ReadProgress } from './read-sessions';
  import { defaultRules } from './rules';
  import type { Rule } from './rules';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/session-log-auditor` },
  ]);

  const MARKS_KEY = 'session-log-auditor:fix-marks';

  const sharedPrices = (): PriceRow[] => data.prices.map((row) => ({ ...row }));

  // One state object for everything a person sets. The records themselves are
  // large and never edited, so they sit beside it as a raw value.
  const auditor = $state({
    rules: defaultRules.map((rule) => ({ ...rule })) as Rule[],
    prices: sharedPrices(),
    filters: { ...emptyFilters } as Filters,
    marks: [] as FixMark[],
    guess: 50,
    revealed: false,
    presetId: null as string | null,
    presetNotice: null as string | null,
    busy: false,
    progress: null as ReadProgress | null,
    status: null as string | null,
    error: null as string | null,
    ready: false,
  });
  let records = $state.raw<AuditData | null>(null);
  let controller: AbortController | null = null;

  // The one render path: every panel draws from this.
  const analysis = $derived(
    records
      ? analyze({
          data: records,
          rules: auditor.rules,
          prices: auditor.prices,
          filters: auditor.filters,
          marks: auditor.marks,
        })
      : null,
  );

  const readFiles = async (files: SourceFile[]): Promise<void> => {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    auditor.busy = true;
    auditor.error = null;
    auditor.status = null;
    auditor.progress = null;

    try {
      if (files.length === 0) {
        auditor.error = 'No .jsonl files there. Claude Code’s transcripts end in .jsonl.';

        return;
      }

      const result = await readSessionFiles(files, {
        signal: current.signal,
        onProgress: (progress) => (auditor.progress = progress),
      });
      records = result;
      auditor.filters = { ...emptyFilters };
      auditor.revealed = false;

      const unrecognized = result.files.filter((file) => !file.recognized).length;
      auditor.status = [
        `Read ${formatTokenCount(result.files.length)} file${result.files.length === 1 ? '' : 's'}`,
        `${formatTokenCount(result.sessions.length)} session${result.sessions.length === 1 ? '' : 's'}`,
        result.skippedLines > 0
          ? `skipped ${formatTokenCount(result.skippedLines)} malformed lines`
          : '',
        unrecognized > 0
          ? `${formatTokenCount(unrecognized)} files didn’t look like transcripts`
          : '',
      ]
        .filter(Boolean)
        .join(', ')
        .concat('.');
      if (result.sessions.length === 0) {
        auditor.error = 'Nothing in those files looked like a Claude Code session.';
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (controller === current) auditor.status = 'Cancelled. Nothing new was loaded.';
      } else {
        auditor.error = `Couldn’t read those files: ${error instanceof Error ? error.message : String(error)}`;
      }
    } finally {
      if (controller === current) {
        auditor.busy = false;
        controller = null;
      }
    }
  };

  const handleFiles = (files: Promise<SourceFile[]>): void => {
    auditor.presetId = null;
    auditor.presetNotice = null;
    files.then(readFiles).catch(() => {
      auditor.error = 'Couldn’t open what was dropped. Try choosing the files instead.';
    });
  };

  const handlePaste = (text: string): void => {
    auditor.presetId = null;
    auditor.presetNotice = null;
    const name = 'pasted.jsonl';
    void readFiles([{ file: new File([text], name), path: name }]);
  };

  const handlePreset = async (id: string): Promise<void> => {
    auditor.presetId = id;
    auditor.presetNotice = presetSummaries.find((summary) => summary.id === id)?.notice ?? null;

    // The generators load only when a preset is chosen.
    const { findPreset } = await import('./presets');
    const preset = findPreset(id);
    if (!preset) return;

    await readFiles(
      preset.files().map(({ path, text }) => ({
        file: new File([text], path.split('/').at(-1) ?? path),
        path,
      })),
    );
  };

  const setMarks = (marks: FixMark[]): void => {
    auditor.marks = marks;
    try {
      localStorage.setItem(MARKS_KEY, serializeMarks(marks));
    } catch {
      // Storage is a convenience; the marks still work for this visit, and export keeps them.
    }
  };

  onMount(() => {
    try {
      const saved = localStorage.getItem(MARKS_KEY);
      const parsed = saved ? parseMarks(saved) : null;
      if (parsed && 'marks' in parsed) auditor.marks = parsed.marks;
    } catch {
      // Storage can be blocked. Start with no marks.
    }
    auditor.ready = true;

    return () => controller?.abort();
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      What actually goes wrong in your agent sessions?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      When a session goes badly, it’s tempting to blame the model. Often it’s the floor: a missing
      command, a shell option, a flag the installed CLI doesn’t accept. A smarter model doesn’t fix
      any of those. This page reads your session transcripts and counts, in code, which failures
      keep coming back, how many come from your environment, what the sessions cost, and whether the
      problems you fixed stay fixed.
    </p>
  </header>

  <section aria-labelledby="intake-heading" class="space-y-4">
    <h2 id="intake-heading" class={headingClasses}>Your sessions</h2>
    <IntakePanel
      ready={auditor.ready}
      busy={auditor.busy}
      progress={auditor.progress}
      status={auditor.status}
      error={auditor.error}
      presets={presetSummaries}
      presetId={auditor.presetId}
      presetNotice={auditor.presetNotice}
      onFiles={handleFiles}
      onPaste={handlePaste}
      onPreset={(id) => void handlePreset(id)}
      onCancel={() => controller?.abort()}
    />
  </section>

  {#if analysis && records}
    <PredictionCard
      guess={auditor.guess}
      revealed={auditor.revealed}
      overview={analysis.overview}
      ready={auditor.ready}
      onGuess={(guess) => (auditor.guess = guess)}
      onReveal={() => (auditor.revealed = true)}
    />

    {#if auditor.revealed}
      <LazySection
        name="the breakdown"
        load={() => import('./results-panels.svelte')}
        props={{
          analysis,
          records,
          filters: auditor.filters,
          rules: auditor.rules,
          prices: auditor.prices,
          defaultPrices: data.prices,
          pricesUpdated: data.pricesUpdated,
          marks: auditor.marks,
          onFilters: (filters: Filters) => (auditor.filters = filters),
          onRules: (rules: Rule[]) => (auditor.rules = rules),
          onPrices: (prices: PriceRow[]) => (auditor.prices = prices),
          onMarks: setMarks,
        }}
      />
    {/if}
  {:else}
    <p class="max-w-3xl {bodyClasses}">
      Drop your transcripts, or pick one of the made-up sets above, and the audit starts with a
      question for you.
    </p>
  {/if}
</div>
