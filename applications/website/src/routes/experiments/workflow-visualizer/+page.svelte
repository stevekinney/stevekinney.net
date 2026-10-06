<script lang="ts">
  import { RotateCcw } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import CodeEditor from '$lib/experiments/code-editor.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import LazySection from '$lib/experiments/lazy-section.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import ChecksVerdict from './checks-verdict.svelte';
  import { experiment } from './experiment';
  import WorkflowDiagram from './workflow-diagram.svelte';
  import { maximumScriptBytes } from './workflow-model';
  import type { ParseError, WorkflowCheck, WorkflowDiagram as Diagram } from './workflow-model';
  import WorkflowSummary from './workflow-summary.svelte';

  type Analyzer = typeof import('./analyze-workflow');
  type Checker = typeof import('./workflow-checks');

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/workflow-visualizer` },
  ]);

  let script = $state(untrack(() => data.sample.source));
  // The last version that parsed. A parse error leaves it on screen, marked stale.
  let diagram = $state.raw<Diagram>(untrack(() => data.sample.analysis));
  let parseError = $state.raw<ParseError | null>(null);
  let checks = $state.raw<readonly WorkflowCheck[]>(untrack(() => data.sample.checks));
  // The script the diagram and checks describe, so the page can say it's catching up.
  let analyzedScript = $state(untrack(() => data.sample.source));

  let mounted = $state(false);
  let tools = $state.raw<{ analyzer: Analyzer; checker: Checker } | null>(null);
  let toolsFailed = $state(false);

  let editor = $state<ReturnType<typeof CodeEditor>>();
  let selectedLine = $state<number | null>(null);

  let loading = $state(false);
  let loadMessage = $state<string | null>(null);
  let loadError = $state<string | null>(null);
  let choices = $state.raw<SourceFile[]>([]);

  onMount(() => {
    mounted = true;
    // The parser and the checks are too big to load up front, so they arrive after the page is interactive.
    Promise.all([import('./analyze-workflow'), import('./workflow-checks')])
      .then(([analyzer, checker]) => {
        tools = { analyzer, checker };
      })
      .catch(() => {
        toolsFailed = true;
      });
  });

  // Redraws after a short pause in typing.
  $effect(() => {
    const current = script;
    const loaded = tools;
    if (!loaded || current === analyzedScript) return;

    const timer = setTimeout(() => {
      const result = loaded.analyzer.analyzeWorkflow(current);
      if (result.ok) {
        diagram = result;
        parseError = null;
      } else {
        parseError = result.error;
      }
      checks = loaded.checker.checkWorkflow(current);
      analyzedScript = current;
    }, 200);

    return () => clearTimeout(timer);
  });

  const checking = $derived(script !== analyzedScript);
  const stale = $derived(parseError !== null);

  const reveal = (line: number): void => {
    selectedLine = line;
    editor?.revealLine(line);
  };

  const formatSize = (bytes: number): string =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024).toLocaleString('en-US')} KB`;

  const isScript = (path: string): boolean => /\.m?js$/i.test(path);
  const skipFolder = (path: string): boolean => !/(^|\/)(node_modules|\.git)$/.test(path);

  const loadOne = async (source: SourceFile): Promise<void> => {
    if (source.file.size > maximumScriptBytes) {
      loadError = `\`${source.path}\` is ${formatSize(source.file.size)}. Claude Code won’t load a workflow over 512 KB, so it wasn’t loaded.`;
      return;
    }

    script = await source.file.text();
    selectedLine = null;
    choices = [];
    loadMessage = `Loaded ${source.path}.`;
  };

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    loadError = null;
    loadMessage = null;

    try {
      const scripts = (await source).filter((file) => isScript(file.path));
      // A dropped project or `.claude` folder holds other scripts too; prefer the workflows.
      const workflows = scripts.filter((file) => /(^|\/)workflows\//.test(file.path));
      const files = workflows.length > 0 ? workflows : scripts;

      if (files.length === 0) {
        loadError =
          'That didn’t include a workflow script. Workflows are `.js` files, usually in `.claude/workflows/`.';
      } else if (files.length === 1 && files[0]) {
        await loadOne(files[0]);
      } else {
        choices = files;
        loadMessage = `Found ${files.length} workflow scripts. Pick one below.`;
      }
    } catch {
      loadError = 'That couldn’t be read. Try choosing it again.';
    } finally {
      loading = false;
    }
  };

  const pick = async (file: SourceFile): Promise<void> => {
    loading = true;
    loadError = null;
    try {
      await loadOne(file);
    } catch {
      loadError = `\`${file.path}\` couldn’t be read. Try choosing it again.`;
    } finally {
      loading = false;
    }
  };

  const useSample = (): void => {
    script = data.sample.source;
    selectedLine = null;
    choices = [];
    loadError = null;
    loadMessage = 'Loaded the sample workflow.';
  };
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Workflow Visualizer
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      See what a Claude Code workflow script runs before you run it: every agent, what fans out,
      what waits, and where each phase starts. Edit the script and the diagram follows. Then export
      it as a Codex workflow.
    </p>
  </header>

  <section aria-label="Summary and checks" class="space-y-4">
    <WorkflowSummary summary={diagram.summary} {stale} />
    <ChecksVerdict {checks} {checking} onReveal={reveal} />
  </section>

  <div class="grid gap-8 lg:grid-cols-2 lg:items-start">
    <section aria-labelledby="diagram-heading" class="min-w-0 space-y-3">
      <div class="space-y-1">
        <h2 id="diagram-heading" class="text-xl font-bold text-slate-900 dark:text-white">
          Diagram
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Top to bottom in the order it runs. Select an agent to find its line in the script.
        </p>
      </div>

      {#if parseError}
        <p
          role="alert"
          data-testid="parse-error"
          class="rounded-md border border-red-300 bg-red-50 p-3 text-sm [overflow-wrap:anywhere] text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <span class="font-semibold">
            {parseError.line === null ? 'The script doesn’t parse:' : `Line ${parseError.line}:`}
          </span>
          {parseError.message}. The diagram below is the last version that parsed.
        </p>
      {/if}
      {#if toolsFailed}
        <p role="alert" class="text-sm text-red-700 dark:text-red-400">
          The diagram can’t follow your edits because part of the page didn’t load. Reload the page
          to try again.
        </p>
      {/if}

      <div
        data-testid="diagram"
        data-stale={stale ? 'true' : 'false'}
        aria-describedby={stale ? 'diagram-stale' : undefined}
        class={stale ? 'opacity-50 grayscale' : 'opacity-100'}
      >
        {#if stale}
          <p id="diagram-stale" class="sr-only">Out of date until the script parses again.</p>
        {/if}
        <WorkflowDiagram {diagram} {selectedLine} onReveal={reveal} />
      </div>
    </section>

    <section aria-labelledby="script-heading" class="min-w-0 space-y-3">
      <div class="space-y-1">
        <h2 id="script-heading" class="text-xl font-bold text-slate-900 dark:text-white">Script</h2>
        <p id="script-hint" class="text-sm text-slate-600 dark:text-slate-300">
          A workflow starts with <code>export const meta = {'{…}'}</code>, then calls
          <code>agent()</code>, <code>parallel()</code>, <code>pipeline()</code>, and
          <code>phase()</code> with top-level <code>await</code>.
        </p>
      </div>
      <CodeEditor
        bind:this={editor}
        bind:value={script}
        language="javascript"
        labelledBy="script-heading"
        describedBy="script-hint"
        rows={28}
      />
    </section>
  </div>

  <section aria-labelledby="codex-export-heading" class="min-w-0 space-y-6">
    <div class="space-y-1">
      <h2 id="codex-export-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Run it on Codex
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Turn the script into one JavaScript file that runs the same body with Codex agents, then run
        it with <code>node</code>, passing <code>args</code> as JSON. The file’s header says what to install
        first and what works differently.
      </p>
    </div>
    <!-- The panel is below the fold and keeps the page's own chunk under budget, so it loads after mount. -->
    <LazySection
      load={() => import('./codex-export-panel.svelte')}
      props={{
        source: script,
        disabled: !mounted,
        openAiModels: data.openAiModels,
        onRevealLine: reveal,
      }}
      name="the converter"
    />
  </section>

  <section aria-labelledby="load-heading" class="max-w-4xl space-y-4">
    <div class="space-y-1">
      <h2 id="load-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Load a workflow
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        A <code>.js</code> workflow script replaces the one above. Drop a whole workflows folder to pick
        one from it.
      </p>
    </div>

    <FileDropZone
      title="Drop a workflow script or folder here"
      draggingTitle="Drop to load the workflow"
      accept=".js,.mjs"
      folders
      fileButtonLabel="Choose a file"
      keepFile={isScript}
      enterFolder={skipFolder}
      captureWindowDrops
      busy={loading}
      progress={loading ? 'Reading…' : null}
      status={loadMessage}
      onFiles={loadFiles}
    >
      <ul class="space-y-1">
        <li>
          <span class="font-semibold text-slate-600 dark:text-slate-300">One project:</span>
          <code>.claude/<wbr />workflows/</code>
        </li>
        <li>
          <span class="font-semibold text-slate-600 dark:text-slate-300">Every project:</span>
          <code>~/.claude/<wbr />workflows/</code>
        </li>
        <li>
          <span class="font-semibold text-slate-600 dark:text-slate-300">A plugin:</span>
          its <code>workflows/</code> folder.
        </li>
        <li>These folders are hidden. In the macOS file picker, press ⌘⇧. to show them.</li>
      </ul>
    </FileDropZone>

    {#if loadError}
      <p role="alert" class="text-sm [overflow-wrap:anywhere] text-red-700 dark:text-red-400">
        <CodeText text={loadError} />
      </p>
    {/if}

    {#if choices.length > 0}
      <div class="space-y-2">
        <p id="choices-heading" class="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Which workflow?
        </p>
        <ul aria-labelledby="choices-heading" class="space-y-1">
          {#each choices as choice (choice.path)}
            <li>
              <button
                type="button"
                disabled={loading}
                onclick={() => pick(choice)}
                class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer text-left font-mono text-sm [overflow-wrap:anywhere] underline-offset-2 hover:underline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {choice.path}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="flex flex-wrap gap-3">
      <Button variant="secondary" icon={RotateCcw} disabled={!mounted} onclick={useSample}>
        Load the sample
      </Button>
    </div>
  </section>

  <section aria-labelledby="notes-heading" class="max-w-3xl space-y-3">
    <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">Notes</h2>
    <ul class="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
      <li>
        The diagram reads the script without running it. How many items a fan-out gets, which way a
        branch goes, and any option computed at run time show as the code that decides them.
      </li>
      <li>
        A helper function that calls <code>agent()</code> is drawn wherever it’s called. One that calls
        itself is drawn once. Plain code with no agents in it folds into a quiet “Code” row.
      </li>
      <li>
        The counts are by call site, so an <code>agent()</code> inside a helper called twice counts
        once. A <code>label</code> built from a template, such as <code>`Review ${'{file}'}`</code>,
        isn’t counted as an unreadable option.
      </li>
      <li>
        The checks cover what Claude Code refuses: a <code>meta</code> block that isn’t a plain
        literal or isn’t first, <code>Date.now()</code>, <code>Math.random()</code>,
        <code>new Date()</code>, and <code>import()</code>, and <code>agent()</code> options it
        doesn’t accept. They also flag
        <code>phase()</code> titles that don’t match <code>meta.phases</code>, and a fan-out’s
        results passed through <code>.filter(Boolean)</code>, which hides the items that failed.
      </li>
      <li>Files are read in your browser. Nothing is uploaded.</li>
    </ul>
  </section>
</div>
