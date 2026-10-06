<script lang="ts">
  import { ChevronRight, FilePlus, RotateCcw } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import { copyText } from '$lib/experiments/copy-text';
  import { downloadText } from '$lib/experiments/download-text';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
  import TargetToggle from '$lib/experiments/editor-fields/target-toggle.svelte';
  import TextField from '$lib/experiments/editor-fields/text-field.svelte';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import MarkdownEditor from '$lib/experiments/markdown-editor.svelte';
  import ToolAccessEditor from '$lib/experiments/tool-rules/tool-access-editor.svelte';
  import { readToolAccess } from '$lib/experiments/tool-rules/tool-rules';
  import type { ToolAccess } from '$lib/experiments/tool-rules/tool-rules';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import AgentField from './agent-field.svelte';
  import { code, ownChecks } from './checks';
  import CodexSkillsEditor from './codex-skills-editor.svelte';
  import {
    blankDocument,
    codexCheckedVersion,
    fieldPath,
    hasValue,
    keptAsIs,
    notWrittenFor,
    readValue,
    sampleDocument,
    switchTarget,
    targetLabels,
    writeToolList,
    writeValue,
  } from './document';
  import type { AgentDocument, FieldPath, Target } from './document';
  import ExportPanel from './export-panel.svelte';
  import { experiment } from './experiment';
  import { essentialsGroup, fieldGroups, fieldsFor } from './fields';
  import type { FieldDefinition } from './fields';
  import NoEffect from './no-effect.svelte';
  import VerdictPanel from './verdict-panel.svelte';
  import type { AgentReport, ClaudeSource } from './workbench';

  type Workbench = typeof import('./workbench');

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/agent-editor` },
  ]);

  const initialAgent = sampleDocument();

  let target = $state<Target>('claude');
  let agent = $state.raw<AgentDocument>(initialAgent);
  // The frontmatter of a loaded `.md` file, so its comments survive an export.
  let claudeSource = $state.raw<ClaudeSource | null>(null);
  // While the document is the untouched sample, the prerendered reports are its answer.
  let pristine = $state(true);
  let report = $state.raw<AgentReport>(untrack(() => data.sample.claude));
  // The document the current report was built from, so the verdict can say it's catching up.
  let checkedAgent = $state.raw<AgentDocument>(initialAgent);

  // What's typed into each YAML or TOML field, which may not parse yet.
  let drafts = $state<Record<FieldPath, string>>({});
  let draftErrors = $state<Record<FieldPath, string>>({});

  // "Only the tools you check" with nothing checked writes no `tools` key, which
  // reads back as inheriting. This keeps the editor in the mode the person chose.
  let emptyAllowlist = $state(false);

  let interactive = $state(false);
  let workbench = $state.raw<Workbench | null>(null);
  let workbenchFailed = $state(false);
  let workbenchLoading: Promise<Workbench> | null = null;

  let loading = $state(false);
  let loadMessage = $state<string | null>(null);
  let loadError = $state<string | null>(null);
  let choices = $state.raw<SourceFile[]>([]);

  onMount(() => {
    interactive = true;
    workbenchLoading = import('./workbench');
    workbenchLoading
      .then((module) => {
        workbench = module;
      })
      .catch(() => {
        workbenchFailed = true;
      });
  });

  // Rechecks after a short pause in typing, and right away for a new target.
  $effect(() => {
    const current = { agent, target, claudeSource, workbench };

    if (!current.workbench) {
      if (pristine) report = data.sample[current.target];
      return;
    }

    const loaded = current.workbench;
    const waiting = untrack(() => report.target === current.target);
    const timer = setTimeout(
      () => {
        report = loaded.buildReport(current.agent, current.target, current.claudeSource);
        checkedAgent = current.agent;
      },
      waiting ? 150 : 0,
    );

    return () => clearTimeout(timer);
  });

  const checking = $derived(
    report.target !== target || (workbench === null ? !pristine : checkedAgent !== agent),
  );

  const own = $derived(ownChecks(agent, target, { codexModels: data.suggestions.codexModels }));

  const issuesFor = (field: FieldPath): FieldIssue[] => {
    const draftError = draftErrors[field];

    return [
      ...(draftError
        ? [
            {
              severity: 'error' as const,
              message: `${draftError} The export keeps the last version that parsed.`,
            },
          ]
        : []),
      ...(report.target === target ? (report.fieldIssues[field] ?? []) : []),
      ...own
        .filter((issue) => issue.field === field)
        .map(({ severity, message }) => ({ severity, message })),
    ];
  };

  const toolAccess = $derived.by((): ToolAccess => {
    const access = readToolAccess(agent.claude['tools'], agent.claude['disallowedTools']);

    return emptyAllowlist && access.mode === 'inherit' ? { ...access, mode: 'only' } : access;
  });

  const toolIssues = $derived<FieldIssue[]>([
    ...(emptyAllowlist && toolAccess.allowed.length === 0
      ? [
          {
            severity: 'warning' as const,
            message:
              'With nothing checked, `tools` is left out of the file, so the agent gets every tool the session has.',
          },
        ]
      : []),
    ...issuesFor('claude.tools'),
    ...issuesFor('claude.disallowedTools'),
  ]);

  const setToolAccess = (next: ToolAccess): void => {
    emptyAllowlist = next.mode === 'only' && next.allowed.length === 0;
    const tools =
      next.mode === 'only' ? writeToolList(agent.claude['tools'], next.allowed) : undefined;
    const withTools = writeValue(agent, 'claude', 'tools', tools);

    edit(
      writeValue(
        withTools,
        'claude',
        'disallowedTools',
        writeToolList(agent.claude['disallowedTools'], next.blocked),
      ),
    );
  };

  const toolSummary = $derived.by(() => {
    const errors = toolIssues.filter((issue) => issue.severity === 'error').length;
    const warnings = toolIssues.filter((issue) => issue.severity === 'warning').length;
    const count = toolAccess.allowed.length;

    return [
      toolAccess.mode === 'only' ? `${count} ${count === 1 ? 'tool' : 'tools'}` : 'Every tool',
      toolAccess.blocked.length > 0 ? `${toolAccess.blocked.length} removed` : null,
      errors > 0 ? `${errors} ${errors === 1 ? 'error' : 'errors'}` : null,
      warnings > 0 ? `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}` : null,
    ]
      .filter(Boolean)
      .join(', ');
  });

  const errorCount = $derived(report.issues.filter((issue) => issue.severity === 'error').length);
  const notWritten = $derived(notWrittenFor(agent, target));
  const kept = $derived(keptAsIs(agent, target));
  const otherTarget = $derived<Target>(target === 'claude' ? 'codex' : 'claude');
  const bodyLines = $derived(
    agent.body === '' ? 0 : agent.body.replace(/\n$/, '').split('\n').length,
  );

  const edit = (next: AgentDocument): void => {
    agent = next;
    pristine = false;
  };

  const changeTarget = (next: Target): void => {
    agent = switchTarget(agent, next);
    target = next;
  };

  const setStructured = (field: FieldDefinition, text: string): void => {
    const id = fieldPath(field.target, field.key);
    drafts[id] = text;
    if (!workbench) return;

    const parsed = workbench.parseStructured(field, text);
    if (parsed.ok) {
      delete draftErrors[id];
      edit(writeValue(agent, field.target, field.key, parsed.value));
    } else {
      draftErrors[id] = parsed.message;
      pristine = false;
    }
  };

  const replaceDocument = (next: AgentDocument, source: ClaudeSource | null): void => {
    agent = next;
    claudeSource = source;
    drafts = workbench?.structuredDrafts(next) ?? {};
    draftErrors = {};
    choices = [];
    emptyAllowlist = false;
  };

  const startBlank = (): void => {
    replaceDocument(blankDocument(), null);
    pristine = false;
    loadMessage = 'Started a blank agent.';
    loadError = null;
  };

  const useSample = (): void => {
    replaceDocument(sampleDocument(), null);
    pristine = true;
    loadMessage = 'Loaded the sample code reviewer.';
    loadError = null;
  };

  const isAgentPath = (path: string): boolean => /\.(md|toml)$/i.test(path);
  const skipFolder = (path: string): boolean => !/(^|\/)(node_modules|\.git)$/.test(path);

  const loadOne = async (source: SourceFile): Promise<void> => {
    const module = workbench ?? (await workbenchLoading);
    if (!module) throw new Error('The file reader isn’t ready.');

    const loaded = module.readAgentFile(source.path, await source.file.text());
    if (!loaded.ok) {
      loadError = `${code(source.path)}: ${loaded.message} Nothing was changed.`;
      return;
    }

    agent = loaded.document;
    claudeSource = loaded.source;
    drafts = module.structuredDrafts(loaded.document);
    draftErrors = {};
    choices = [];
    emptyAllowlist = false;
    pristine = false;
    target = loaded.target;
    loadMessage = `Loaded ${source.path} as a ${targetLabels[loaded.target]} agent.`;
  };

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    loadError = null;
    loadMessage = null;

    try {
      const files = (await source).filter((file) => isAgentPath(file.path));

      if (files.length === 0) {
        loadError =
          'That didn’t include an agent file. Claude Code agents are `.md` files, and Codex agents are `.toml` files.';
      } else if (files.length === 1 && files[0]) {
        await loadOne(files[0]);
      } else {
        choices = files;
        loadMessage = `Found ${files.length} agent files. Pick one below.`;
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
      loadError = `${code(file.path)} couldn’t be read. Try choosing it again.`;
    } finally {
      loading = false;
    }
  };

  /** Builds the file at the moment it's saved, so an edit inside the recheck pause is included. */
  const currentReport = (): AgentReport =>
    workbench ? workbench.buildReport(agent, target, claudeSource) : report;

  const download = (): void => {
    const latest = currentReport();
    downloadText(
      latest.fileName,
      latest.text,
      target === 'claude' ? 'text/markdown' : 'application/toml',
    );
  };

  const copy = (): Promise<boolean> => copyText(currentReport().text);

  const fieldId = (field: FieldDefinition): string =>
    `agent-${field.target}-${field.key.replace(/\./g, '-')}`;

  const groupSummary = (fields: readonly FieldDefinition[]): string => {
    const set = fields.filter((field) =>
      hasValue(readValue(agent, field.target, field.key)),
    ).length;
    const issues = fields.flatMap((field) => issuesFor(fieldPath(field.target, field.key)));
    const errors = issues.filter((issue) => issue.severity === 'error').length;
    const warnings = issues.filter((issue) => issue.severity === 'warning').length;

    return [
      set > 0 ? `${set} set` : null,
      errors > 0 ? `${errors} ${errors === 1 ? 'error' : 'errors'}` : null,
      warnings > 0 ? `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}` : null,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const modelHint = $derived(
    target === 'claude'
      ? '`sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit` for the main conversation’s model. A model passed when the agent is spawned overrides it. The Codex file uses this field too.'
      : 'The model Codex runs this agent on, as an OpenAI model ID. The Claude Code file uses this field too.',
  );
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

{#snippet field(definition: FieldDefinition)}
  {@const id = fieldPath(definition.target, definition.key)}
  {#if definition.noEffect}
    <p class="mb-1.5"><NoEffect appliesInstead={definition.appliesInstead} /></p>
  {/if}
  {#if definition.kind === 'skills'}
    <CodexSkillsEditor
      id={fieldId(definition)}
      value={readValue(agent, definition.target, definition.key)}
      onChange={(value) => edit(writeValue(agent, definition.target, definition.key, value))}
      hint={definition.hint}
      issues={issuesFor(id)}
      disabled={!interactive}
    />
  {:else}
    <AgentField
      field={definition}
      id={fieldId(definition)}
      value={readValue(agent, definition.target, definition.key)}
      onChange={(value) => edit(writeValue(agent, definition.target, definition.key, value))}
      issues={issuesFor(id)}
      options={definition.options ? data.options[definition.options] : []}
      suggestions={definition.suggestions ? data.suggestions[definition.suggestions] : []}
      draft={drafts[id] ?? ''}
      onDraft={(text) => setStructured(definition, text)}
      disabled={!interactive || (definition.kind === 'structured' && !workbench)}
    />
  {/if}
{/snippet}

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Agent Editor</h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Build a subagent definition with every option in reach and best-practice checks as you type,
      then export it for Claude Code or Codex. Start from the sample code reviewer, a blank agent,
      or a file of your own.
    </p>
  </header>

  <section aria-label="Agent settings" class="max-w-4xl space-y-6">
    <div class="grid gap-5 sm:grid-cols-2">
      <TextField
        id="agent-name"
        label="Name"
        fieldKey="name"
        value={agent.name}
        onChange={(name) => edit({ ...agent, name })}
        hint={target === 'claude'
          ? 'Lowercase letters, digits, and hyphens. Without a name, Claude Code skips the file.'
          : 'Required. Lowercase letters, digits, and hyphens keep it valid for Claude Code too.'}
        issues={issuesFor('name')}
        placeholder="code-reviewer"
        monospace
        disabled={!interactive}
      />
      <TextField
        id="agent-file-name"
        label="File name"
        value={agent.fileName ?? ''}
        onChange={(fileName) => edit({ ...agent, fileName: fileName === '' ? null : fileName })}
        hint={`Leave it blank to follow the name. Saved with \`${target === 'claude' ? '.md' : '.toml'}\` added.`}
        issues={issuesFor('fileName')}
        placeholder={agent.name || 'code-reviewer'}
        monospace
        disabled={!interactive}
      />
      <div class="sm:col-span-2">
        <TextField
          id="agent-description"
          label="Description"
          fieldKey="description"
          value={agent.description}
          onChange={(description) => edit({ ...agent, description })}
          hint={target === 'claude'
            ? 'Claude Code reads this to decide when to delegate, so treat it as a routing rule: what the agent does, when to use it, and what it isn’t for.'
            : 'Required. What the agent does and when to use it.'}
          issues={issuesFor('description')}
          rows={3}
          disabled={!interactive}
        />
      </div>
      <TextField
        id="agent-model"
        label="Model"
        fieldKey="model"
        value={agent.model}
        onChange={(model) => edit({ ...agent, model })}
        hint={modelHint}
        issues={issuesFor('model')}
        suggestions={target === 'claude'
          ? data.suggestions.claudeModels
          : data.suggestions.codexModels}
        monospace
        disabled={!interactive}
      />
      {#each fieldsFor(target, essentialsGroup) as definition (definition.key)}
        <div class={definition.kind === 'list' ? 'sm:col-span-2' : ''}>
          {@render field(definition)}
        </div>
      {/each}
    </div>

    <div class="space-y-3">
      {#each fieldGroups.filter((group) => group.target === target) as group (group.id)}
        {@const fields = fieldsFor(target, group.id)}
        {@const summary = group.id === 'claude-tools' ? toolSummary : groupSummary(fields)}
        <details
          open={group.open}
          data-testid="group-{group.id}"
          class="group rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        >
          <summary
            class="focus-visible:outline-primary-600 flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg px-4 py-3 font-semibold text-slate-800 focus-visible:outline-2 dark:text-slate-100"
          >
            <span>{group.title}</span>
            {#if summary}
              <span class="text-sm font-normal text-slate-500 dark:text-slate-400">{summary}</span>
            {/if}
          </summary>
          <div class="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
            {#if group.note}
              <p class="text-sm text-slate-600 dark:text-slate-300">
                <CodeText text={group.note} />
              </p>
            {/if}
            {#if group.id === 'claude-tools'}
              <ToolAccessEditor
                id="agent-claude-tools"
                access={toolAccess}
                onChange={setToolAccess}
                allowedKey="tools"
                blockedKey="disallowedTools"
                checkedMeaning="Checked tools are the ones the agent can use."
                issues={toolIssues}
                agentSuggestions={['Explore', 'Plan', 'general-purpose']}
                disabled={!interactive}
              />
            {/if}
            {#if fields.length > 0}
              <div class="grid gap-5 sm:grid-cols-2">
                {#each fields as definition (definition.key)}
                  <div
                    class={definition.kind === 'structured' ||
                    definition.kind === 'skills' ||
                    definition.kind === 'textarea' ||
                    definition.kind === 'list'
                      ? 'sm:col-span-2'
                      : ''}
                  >
                    {@render field(definition)}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </details>
      {/each}
    </div>

    {#if kept.length > 0}
      <p
        data-testid="kept-as-is"
        class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      >
        <span class="font-semibold text-slate-800 dark:text-slate-100">Kept as-is:</span>
        <CodeText
          text={`${kept.map((key) => code(key)).join(', ')}. ${
            target === 'claude'
              ? 'Claude Code ignores these keys, and the export writes them back unchanged.'
              : 'Codex reads any `config.toml` key in an agent file. These aren’t checked here, and the export writes them back unchanged.'
          }`}
        />
      </p>
    {/if}
  </section>

  <details
    data-testid="body-section"
    class="group max-w-4xl rounded-lg border border-slate-200 dark:border-slate-700"
  >
    <summary
      class="focus-visible:outline-primary-600 flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 dark:hover:bg-slate-800/60"
    >
      <span class="flex items-center gap-1.5">
        <ChevronRight
          aria-hidden="true"
          class="size-4 flex-none text-slate-500 transition-transform group-open:rotate-90"
        />
        <h2 id="body-heading" class="text-xl font-bold text-slate-900 dark:text-white">
          {target === 'claude' ? 'System prompt' : 'Developer instructions'}
        </h2>
      </span>
      <span class="text-sm text-slate-500 tabular-nums dark:text-slate-400"
        >{bodyLines.toLocaleString('en-US')} {bodyLines === 1 ? 'line' : 'lines'}</span
      >
    </summary>
    <div class="space-y-3 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
      <p id="body-hint" class="text-sm text-slate-600 dark:text-slate-300">
        The agent starts with this and the task it’s handed, never your conversation. Say what it
        does and doesn’t do, and the exact shape of its report. Leave out facts that change, such as
        commits, branches, and paths: they belong in the task you hand it each time.
      </p>
      <MarkdownEditor
        bind:value={() => agent.body, (body) => edit({ ...agent, body })}
        labelledBy="body-heading"
        describedBy="body-hint"
        placeholder="You review code changes. You don't fix them."
        rows={18}
      />
      {#if issuesFor('body').length > 0}
        <ul class="space-y-1 text-sm">
          {#each issuesFor('body') as issue, index (index)}
            <li
              class="[overflow-wrap:anywhere] {issue.severity === 'tip'
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-amber-800 dark:text-amber-300'}"
            >
              <span class="font-semibold">{issue.severity === 'tip' ? 'Tip' : 'Warning'}:</span>
              <CodeText text={issue.message} />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </details>

  <section aria-label="Target" class="max-w-4xl space-y-2">
    <TargetToggle
      value={target}
      onChange={changeTarget}
      name="agent-target"
      disabled={!interactive}
    />
    <p class="text-sm text-slate-600 dark:text-slate-300">
      <CodeText
        text={target === 'claude'
          ? 'A Markdown file with YAML frontmatter. The body is the system prompt.'
          : 'A TOML file. The body is written as `developer_instructions`.'}
      />
      Switching keeps everything you’ve set for either tool.
    </p>
    {#if notWritten.length > 0}
      <p
        data-testid="not-written"
        class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      >
        <span class="font-semibold text-slate-800 dark:text-slate-100"
          >Not written for {targetLabels[target]}:</span
        >
        <CodeText text={notWritten.map((key) => code(key)).join(', ')} />. They stay here for
        {targetLabels[otherTarget]}.
      </p>
    {/if}
  </section>

  <VerdictPanel target={report.target} issues={report.issues} {checking} />

  <ExportPanel
    target={report.target}
    fileName={report.fileName}
    text={report.text}
    errors={errorCount}
    disabled={!interactive}
    onDownload={download}
    onCopy={copy}
  />

  <section aria-labelledby="load-heading" class="max-w-4xl space-y-4">
    <div class="space-y-1">
      <h2 id="load-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Load an agent
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        A <code>.md</code> file loads as a Claude Code agent and a <code>.toml</code> file as a Codex
        agent. Drop a whole agents folder to pick one from it.
      </p>
    </div>

    <FileDropZone
      title="Drop an agent file or folder here"
      draggingTitle="Drop to load the agent"
      accept=".md,.toml"
      folders
      fileButtonLabel="Choose a file"
      keepFile={isAgentPath}
      enterFolder={skipFolder}
      captureWindowDrops
      busy={loading}
      progress={loading ? 'Reading…' : null}
      status={loadMessage}
      onFiles={loadFiles}
    >
      <ul class="space-y-1">
        <li>
          <span class="font-semibold text-slate-600 dark:text-slate-300">Claude Code:</span>
          <code>.claude/<wbr />agents/</code> in a project, or <code>~/.claude/<wbr />agents/</code>
          for every project.
        </li>
        <li>
          <span class="font-semibold text-slate-600 dark:text-slate-300">Codex:</span>
          <code>.codex/<wbr />agents/</code>.
        </li>
        <li>Both folders are hidden. In the macOS file picker, press ⌘⇧. to show them.</li>
      </ul>
    </FileDropZone>

    {#if loadError}
      <p role="alert" class="text-sm [overflow-wrap:anywhere] text-red-700 dark:text-red-400">
        <CodeText text={loadError} />
      </p>
    {/if}
    {#if workbenchFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The checks couldn’t load. Reload the page to try again.
      </p>
    {/if}

    {#if choices.length > 0}
      <div class="space-y-2">
        <p id="choices-heading" class="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Which agent?
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
      <Button variant="secondary" icon={FilePlus} disabled={!interactive} onclick={startBlank}>
        Start blank
      </Button>
      <Button variant="secondary" icon={RotateCcw} disabled={!interactive} onclick={useSample}>
        Use the sample
      </Button>
    </div>
  </section>

  <section aria-labelledby="notes-heading" class="max-w-3xl space-y-3">
    <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">Notes</h2>
    <ul class="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
      <li>
        For Claude Code, the verdict checks the subagent schema, the naming rules, MCP server items
        Claude Code would drop, hook fields, unknown keys, and anti-patterns such as
        <code>bypassPermissions</code>. For Codex, it checks the agent file schema, plus this page’s
        checks for names, empty fields, skill rules that name nothing, and
        <code>danger-full-access</code>.
      </li>
      <li>
        Tips under a field are advice, such as listing tools explicitly. They never change the
        verdict.
      </li>
      <li>
        A loaded <code>.md</code> file keeps its comments and formatting for every field you don’t
        change, and a tool list written as a comma-separated string stays one. A loaded
        <code>.toml</code> file is written back in a fixed key order, and its comments are lost.
      </li>
      <li>
        Codex {codexCheckedVersion} checks <code>mcp_servers</code>, <code>sandbox_mode</code>,
        <code>hooks</code>, and <code>tools</code> in an agent file but drops them when it loads the
        agent. Of
        <code>[skills]</code>, it keeps only what turns skills off. The editor keeps the rest so a
        loaded file writes back unchanged, and marks it as having no effect.
      </li>
      <li>Files are read in your browser. Nothing is uploaded.</li>
    </ul>
  </section>
</div>
