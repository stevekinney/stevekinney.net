<script lang="ts">
  import { onMount } from 'svelte';

  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { experiment } from './experiment';
  import InlineCode from './inline-code.svelte';
  import { rungs } from './ladder';
  import { lintInstructions } from './lint';
  import { classificationLabels, defaultRules } from './lint-rules';
  import { readTextFile } from './read-text-file';
  import RewriteHelper from './rewrite-helper.svelte';
  import { breakdown, headline, rungNumber, verdictFor, verdictForFile } from './verdict';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/mechanism-picker` },
  ]);

  // Made up for this page: one line for each thing the linter looks for.
  const sample = [
    '- Maintain high quality code.',
    '- Never read .env files.',
    '- Run `pnpm test:billing` from `apps/api` after billing changes.',
    '- Format files with Prettier after every edit.',
    '- Current branch is feature/invoices-2.',
    '',
  ].join('\n');

  let text = $state(sample);
  let fileName = $state<string | null>('CLAUDE.md');
  let ready = $state(false);
  let busy = $state(false);
  let status = $state<string | null>(null);
  let problem = $state<string | null>(null);
  let rewriting = $state<number | null>(null);

  const items = $derived(lintInstructions(text, defaultRules));
  const fileVerdict = $derived(verdictForFile(items));
  const where = $derived(breakdown(fileVerdict));

  // Strongest at the top, the way a ladder reads.
  const ladder = [...rungs].reverse();

  const setText = (next: string, name: string | null): void => {
    text = next;
    fileName = name;
    rewriting = null;
  };

  const readFiles = async (files: Promise<SourceFile[]>): Promise<void> => {
    busy = true;
    problem = null;
    status = null;
    try {
      const [first] = await files;
      if (!first) return;

      const read = await readTextFile(first.file);
      if (read.ok) {
        setText(read.text, first.file.name);
        status = `Read ${first.file.name}.`;
      } else {
        problem = read.reason;
      }
    } catch {
      problem = 'Couldn’t read that file.';
    } finally {
      busy = false;
    }
  };

  onMount(() => {
    ready = true;
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Does your CLAUDE.md ask, or enforce?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      A rule in an instructions file can only ask. If the rule has to hold every time, it belongs in
      something that can refuse: a permission rule, a hook, a required check, or the OS. Paste your
      file to see which of its lines are written as requests but need to be enforced.
    </p>
  </header>

  <section aria-labelledby="verdict-heading" class="max-w-3xl space-y-2">
    <h2 id="verdict-heading" class="sr-only">Verdict</h2>
    <p
      class="text-2xl font-bold text-slate-900 dark:text-white"
      data-testid="verdict"
      aria-live="polite"
    >
      {headline(fileVerdict)}
    </p>
    {#if where}
      <p class="text-slate-600 dark:text-slate-300" data-testid="verdict-breakdown">
        {where}
      </p>
    {/if}
    <p class="text-sm [overflow-wrap:anywhere] text-slate-500 dark:text-slate-400">
      {fileName ? `Checking ${fileName}.` : 'Checking what you pasted.'}
    </p>
  </section>

  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
    <section aria-labelledby="lines-heading" class="min-w-0 space-y-4">
      <h2 id="lines-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Line by line
      </h2>

      {#if text.trim() === ''}
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Paste a file below, or drop one, to see each line checked.
        </p>
      {:else if items.length === 0}
        <p class="text-sm text-slate-600 dark:text-slate-300" data-testid="lint-empty">
          There’s nothing to check: the file is only headings, code blocks, or blank lines.
        </p>
      {:else}
        <ol class="space-y-2" data-testid="lint-items">
          {#each items as item (item.lineNumber)}
            {@const verdict = verdictFor(item)}
            <li
              data-line={item.lineNumber}
              data-verdict={verdict.kind}
              data-classification={item.primary}
              class="space-y-1.5 rounded-lg border-l-4 bg-slate-50 p-3 dark:bg-slate-800/60 {verdict.kind ===
              'enforce'
                ? 'border-red-600 dark:border-red-400'
                : 'border-slate-300 dark:border-slate-600'}"
            >
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Line {item.lineNumber}
                </span>
                <span
                  data-testid="tag"
                  class="rounded px-1.5 py-0.5 text-xs font-bold ring-1 {verdict.kind === 'enforce'
                    ? 'bg-red-100 text-red-900 ring-red-300 dark:bg-red-900/40 dark:text-red-100 dark:ring-red-700'
                    : 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600'}"
                >
                  {#if verdict.kind === 'enforce'}
                    Enforce: {verdict.rung.name}, rung {rungNumber(verdict.rung.id)}
                  {:else}
                    Asks
                  {/if}
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  {classificationLabels[item.primary]}
                </span>
              </div>
              <p
                class="max-h-40 overflow-y-auto font-mono text-sm [overflow-wrap:anywhere] text-slate-900 dark:text-white"
              >
                {item.text}
              </p>
              <p class="text-sm text-slate-700 dark:text-slate-200" data-testid="suggestion">
                <InlineCode text={item.suggestion} />
              </p>
              {#if item.primary === 'vague'}
                <button
                  type="button"
                  class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed"
                  disabled={!ready}
                  aria-expanded={rewriting === item.lineNumber}
                  onclick={() =>
                    (rewriting = rewriting === item.lineNumber ? null : item.lineNumber)}
                >
                  Rewrite line {item.lineNumber}
                </button>
                {#if rewriting === item.lineNumber}
                  <RewriteHelper line={item.text} />
                {/if}
              {/if}
            </li>
          {/each}
        </ol>
      {/if}
    </section>

    <aside
      aria-labelledby="ladder-heading"
      data-testid="ladder"
      class="order-first space-y-2 self-start rounded-lg border border-slate-200 p-3 lg:order-last dark:border-slate-700"
    >
      <h2 id="ladder-heading" class="text-base font-bold text-slate-900 dark:text-white">
        The enforcement ladder
      </h2>
      <ol class="space-y-1 text-sm">
        {#each ladder as rung (rung.id)}
          <li
            data-rung={rung.id}
            class="border-l-4 px-2 py-0.5 {rung.refuses
              ? 'border-emerald-600 dark:border-emerald-400'
              : 'border-amber-500 dark:border-amber-400'}"
          >
            <span class="font-semibold text-slate-900 dark:text-white">
              {rungNumber(rung.id)}. {rung.name}
            </span>
            <span class="block text-xs text-slate-600 dark:text-slate-300">
              {rung.refuses ? 'Refuses' : 'Asks'}: {rung.power}
            </span>
          </li>
        {/each}
      </ol>
    </aside>
  </div>

  <section aria-labelledby="input-heading" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="input-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Check your own file
      </h2>
      <Button
        variant="secondary"
        size="small"
        disabled={!ready || text === sample}
        onclick={() => setText(sample, 'CLAUDE.md')}
      >
        Use the sample
      </Button>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-1.5">
        <label
          for="lint-source"
          class="block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Paste your CLAUDE.md or AGENTS.md
        </label>
        <textarea
          id="lint-source"
          class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 min-h-48 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          value={text}
          disabled={!ready}
          oninput={(event) => setText(event.currentTarget.value, null)}></textarea>
      </div>
      <div class="space-y-2">
        <FileDropZone
          class="h-full"
          title="Or drop the file here"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          fileButtonLabel="Choose a file"
          onFiles={readFiles}
          {busy}
          {status}
        >
          Everything is checked in your browser. Nothing is sent anywhere.
        </FileDropZone>
        {#if problem}
          <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
        {/if}
      </div>
    </div>
  </section>

  <section
    aria-labelledby="notes-heading"
    class="max-w-3xl space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700"
  >
    <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      How this is checked
    </h2>
    <p class="text-slate-700 dark:text-slate-200">
      Each line and bullet is read with a handful of simple word rules. Headings, code blocks, and
      comments are skipped. Absolute language such as “never” or “do not” next to something
      tool-shaped, like a file, a command, a branch, or a credential, is a rule that has to hold
      every time, so it belongs on a rung that can refuse: a permission rule for files and commands,
      a required check for branches, and the credentials boundary for production. Formatting or
      linting on every edit belongs in a hook. Everything else can stay a request, though the note
      under each line says when it would be better as a skill, in the task prompt, or deleted.
    </p>
    <p class="text-slate-700 dark:text-slate-200">
      These are heuristics, not a description of how any tool behaves, and they only read English.
      The ladder above is the useful part: ask of every rule which rung it needs. If it matters,
      make it executable.
    </p>
  </section>
</div>
