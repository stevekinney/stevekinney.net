<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
  import TargetToggle from '$lib/experiments/editor-fields/target-toggle.svelte';
  import TextField from '$lib/experiments/editor-fields/text-field.svelte';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import MarkdownEditor from '$lib/experiments/markdown-editor.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import ExportFileCard from './export-file.svelte';
  import { experiment } from './experiment';
  import SkillField from './skill-field.svelte';
  import { checkFields } from './skill-checks';
  import {
    blankDocument,
    effectiveDirectory,
    notWrittenFor,
    pickSkillFiles,
    targetNames,
    unknownKeys,
  } from './skill-document';
  import type { DraftKey, SkillDocument, SkillResults, Target } from './skill-document';
  import { applyDraft, fieldsFor, groupOrder, groups, isFieldSet, readText } from './skill-fields';
  import type { FieldDefinition, GroupId } from './skill-fields';
  import VerdictPanel from './verdict-panel.svelte';

  type Workbench = typeof import('./workbench');

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/skill-editor` },
  ]);

  const MAXIMUM_FILE_SIZE = 1_000_000;
  const RECOMMENDED_LINES = 500;

  // The page starts with the sample, and the server's results for it, so the
  // verdict and the export are there before any script runs.
  let skill = $state.raw<SkillDocument>(untrack(() => structuredClone(data.sample)));
  let target = $state<Target>('claude');
  let computed = $state.raw<SkillResults | null>(null);
  let workbench = $state.raw<Workbench | null>(null);
  let mounted = $state(false);
  let draftErrors = $state<Partial<Record<DraftKey, string>>>({});

  let loading = $state(false);
  let loadStatus = $state<string | null>(null);
  let loadError = $state<string | null>(null);
  let loadNotes = $state<string[]>([]);

  const loadWorkbench = (): Promise<Workbench> => import('./workbench');

  onMount(() => {
    mounted = true;
    let cancelled = false;

    void loadWorkbench().then((module) => {
      if (!cancelled) workbench = module;
    });

    return () => {
      cancelled = true;
    };
  });

  // Typing is checked after a short pause; a new target or a loaded file at once,
  // so the export never shows the previous skill or target.
  let checkImmediately = true;

  $effect(() => {
    const current = skill;
    const currentTarget = target;
    const bench = workbench;
    if (!bench) return;

    const check = (): void => {
      computed = bench.analyzeSkill(current, currentTarget);
    };

    if (checkImmediately || untrack(() => computed?.target) !== currentTarget) {
      checkImmediately = false;
      check();

      return;
    }

    const timer = setTimeout(check, 150);

    return () => clearTimeout(timer);
  });

  const results = $derived(
    computed && computed.target === target ? computed : data.initial[target],
  );

  const ownIssues = $derived(checkFields(skill, target));
  const issuesFor = (key: string): FieldIssue[] => [
    ...(results.fieldIssues[key] ?? []),
    ...(ownIssues[key] ?? []),
    ...(key in draftErrors && draftErrors[key as DraftKey]
      ? [{ severity: 'error' as const, message: draftErrors[key as DraftKey] ?? '' }]
      : []),
  ];

  const notWritten = $derived(notWrittenFor(skill, target));
  const kept = $derived(unknownKeys(skill));
  const directory = $derived(effectiveDirectory(skill));
  const skillFile = $derived(results.files[0]);
  const lineCount = $derived(skillFile ? skillFile.text.split('\n').length : 0);

  const update = (next: SkillDocument): void => {
    skill = next;
  };

  const updateDraft = (key: DraftKey, text: string): void => {
    if (!workbench) return;

    const parsed = workbench.parseDraft(key, text);
    skill = applyDraft(skill, key, text, parsed);
    draftErrors = { ...draftErrors, [key]: parsed.ok ? undefined : parsed.message };
  };

  const replaceDocument = (next: SkillDocument, status: string | null): void => {
    checkImmediately = true;
    skill = next;
    draftErrors = {};
    loadError = null;
    loadNotes = [];
    loadStatus = status;
  };

  const startBlank = (): void => replaceDocument(blankDocument(), 'Started a blank skill.');
  const loadSample = (): void =>
    replaceDocument(structuredClone(data.sample), 'Loaded the sample skill.');

  const plural = (count: number, word: string): string =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

  const readFile = async (
    file: SourceFile | null,
  ): Promise<{ path: string; text: string } | null> =>
    file ? { path: file.path, text: await file.file.text() } : null;

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    loadError = null;
    loadStatus = null;

    try {
      const files = await source;
      const picked = pickSkillFiles(files);

      if (!picked.skill && !picked.openai) {
        loadError =
          files.length === 0
            ? 'That was empty. Drop a `SKILL.md`, or the folder that holds one.'
            : 'That didn’t include a `SKILL.md`. Drop the file, or the skill’s folder.';

        return;
      }

      const tooBig = [picked.skill, picked.openai].find(
        (file) => file && file.file.size > MAXIMUM_FILE_SIZE,
      );
      if (tooBig) {
        loadError = `\`${tooBig.path}\` is over 1 MB, which is too big for a skill file. Nothing was changed.`;

        return;
      }

      const bench = workbench ?? (await loadWorkbench());
      const result = bench.readSkillFiles(
        {
          skill: await readFile(picked.skill),
          openai: await readFile(picked.openai),
          directoryName: picked.directoryName,
        },
        skill,
      );

      if (!result.ok) {
        loadError = `${result.message} Nothing was changed.`;

        return;
      }

      if (result.target) target = result.target;

      // The drop zone shows its status as plain text, so the paths aren't backticked.
      const loadedNames = [picked.skill?.path, picked.openai?.path].filter(Boolean).join(' and ');
      const notes: string[] = [];
      if (result.foldedAlias) {
        notes.push('Folded `disallowedTools`, an undocumented alias, into `disallowed-tools`.');
      }
      if (picked.otherSkills > 0) {
        notes.push(
          `Found ${plural(picked.otherSkills, 'more skill')} in that folder. Drop one skill’s folder to edit another.`,
        );
      }
      if (picked.otherFiles > 0) {
        notes.push(
          `${plural(picked.otherFiles, 'other file')} in the folder ${picked.otherFiles === 1 ? 'isn’t' : 'aren’t'} edited here. Export writes only \`SKILL.md\` and \`agents/openai.yaml\`, so scripts and references stay where they are.`,
        );
      }

      replaceDocument(
        result.document,
        `Loaded ${loadedNames}${result.target ? ` for ${targetNames[result.target]}` : ''}.`,
      );
      loadNotes = notes;
    } catch {
      loadError = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      loading = false;
    }
  };

  const groupSummary = (group: GroupId): string => {
    const groupFields = fieldsFor(target, group);
    const set = groupFields.filter((field) => isFieldSet(skill, field)).length;
    const found = groupFields.flatMap((field) => issuesFor(field.key));
    const errors = found.filter((issue) => issue.severity === 'error').length;
    const warnings = found.filter((issue) => issue.severity === 'warning').length;

    return [
      set > 0 ? `${set} set` : null,
      errors > 0 ? plural(errors, 'error') : null,
      warnings > 0 ? plural(warnings, 'warning') : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const groupDescription = (group: GroupId): string | null => {
    const { description } = groups[group];
    if (!description) return null;

    return typeof description === 'function' ? description(target) : description;
  };
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

{#snippet fieldControl(field: FieldDefinition)}
  <SkillField
    {field}
    {skill}
    {target}
    options={data.options}
    issues={issuesFor(field.key)}
    ready={workbench !== null}
    onChange={update}
    onDraft={updateDraft}
  />
{/snippet}

<div class="max-w-3xl space-y-10">
  <header class="space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Skill Editor</h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Set every frontmatter option a skill can have, with checks for the mistakes that quietly break
      one, then export the files for Claude Code or Codex. Start from the sample below, a blank
      skill, or a <code>SKILL.md</code> of your own.
    </p>
  </header>

  <div class="flex flex-wrap gap-2">
    <Button variant="secondary" disabled={!mounted || loading} onclick={loadSample}>
      Load the sample
    </Button>
    <Button variant="secondary" disabled={!mounted || loading} onclick={startBlank}>
      Start blank
    </Button>
  </div>

  <section aria-label="Skill settings" class="space-y-5">
    {#if target === 'codex'}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Codex reads <code>name</code>, <code>description</code>, and
        <code>metadata.short-description</code> from <code>SKILL.md</code>, and the rest from
        <code>agents/openai.yaml</code>.
      </p>
    {/if}

    {#each groupOrder[target] as group (group)}
      {#if group === 'essentials'}
        <div class="space-y-5">
          {#each fieldsFor(target, group) as field (field.key)}
            {@render fieldControl(field)}
            {#if field.key === 'name'}
              <TextField
                id="skill-directory"
                label="Folder name"
                value={skill.directoryName ?? ''}
                onChange={(value) =>
                  update({ ...skill, directoryName: value === '' ? null : value })}
                placeholder={readText(skill.frontmatter.name) || 'release-notes'}
                monospace
                hint="The folder `SKILL.md` goes in. The name has to match it. Leave it blank to use the name."
                issues={issuesFor('directory')}
              />
            {/if}
          {/each}
        </div>
      {:else}
        {@const summary = groupSummary(group)}
        {@const description = groupDescription(group)}
        <details
          class="group rounded-lg border border-slate-200 dark:border-slate-700"
          data-group={group}
          open={groups[group].open}
        >
          <summary
            class="focus-visible:outline-primary-600 flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            <span class="flex items-center gap-1.5">
              <ChevronRight
                aria-hidden="true"
                class="size-4 flex-none transition-transform group-open:rotate-90"
              />
              {groups[group].title}
            </span>
            {#if summary}
              <span class="text-sm font-normal text-slate-500 dark:text-slate-400">{summary}</span>
            {/if}
          </summary>
          <div class="space-y-5 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
            {#if description}
              <p class="text-sm text-slate-600 dark:text-slate-300">
                <CodeText text={description} />
              </p>
            {/if}
            {#each fieldsFor(target, group) as field (field.key)}
              {@render fieldControl(field)}
            {/each}
          </div>
        </details>
      {/if}
    {/each}
  </section>

  <details
    data-testid="body-section"
    class="group rounded-lg border border-slate-200 dark:border-slate-700"
  >
    <summary
      class="focus-visible:outline-primary-600 flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 dark:hover:bg-slate-800/60"
    >
      <span class="flex items-center gap-1.5">
        <ChevronRight
          aria-hidden="true"
          class="size-4 flex-none text-slate-500 transition-transform group-open:rotate-90"
        />
        <h2 id="body-heading" class="text-xl font-bold text-slate-900 dark:text-white">Body</h2>
      </span>
      <span class="text-sm text-slate-500 tabular-nums dark:text-slate-400"
        >{lineCount.toLocaleString('en-US')} {lineCount === 1 ? 'line' : 'lines'}</span
      >
    </summary>
    <div class="space-y-3 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
      <p id="body-hint" class="text-sm text-slate-600 dark:text-slate-300">
        The procedure the agent follows once the skill loads: the steps and decisions, what it must
        not touch, and how to show the work is done. Every line should change a decision. Move long
        detail into reference files and say when to read each one.
        {#if target === 'claude'}
          <code>$ARGUMENTS</code> is what was typed after the skill’s name.
        {/if}
      </p>

      <MarkdownEditor
        bind:value={() => skill.body, (body) => update({ ...skill, body })}
        labelledBy="body-heading"
        describedBy="body-hint"
        placeholder="The steps the agent follows once the skill loads."
        rows={18}
      />
      <p
        data-testid="line-count"
        class={[
          'text-sm',
          lineCount > RECOMMENDED_LINES
            ? 'font-semibold text-amber-800 dark:text-amber-300'
            : 'text-slate-600 dark:text-slate-300',
        ]}
      >
        <code>SKILL.md</code> is {lineCount.toLocaleString('en-US')}
        {lineCount === 1 ? 'line' : 'lines'}.
        {lineCount > RECOMMENDED_LINES
          ? 'That’s over 500; move detail into reference files.'
          : 'Keep it under 500.'}
      </p>
    </div>
  </details>

  <TargetToggle
    value={target}
    onChange={(next) => (target = next)}
    name="skill-target"
    disabled={!mounted}
  />

  <VerdictPanel {target} issues={results.issues} {notWritten} {kept} />

  <section aria-labelledby="export-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="export-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Export for {targetNames[target]}
      </h2>
      <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
        {#if target === 'claude'}
          Save it as <code>.claude/skills/{directory || 'your-skill'}/SKILL.md</code> in a project,
          or in <code>~/.claude/skills/</code> for yourself. Claude Code doesn’t read
          <code>agents/openai.yaml</code>, so this export leaves it out.
        {:else}
          Save it as <code>.agents/skills/{directory || 'your-skill'}/SKILL.md</code> in a
          repository (Codex looks from the working directory up to the repository root), or in
          <code>~/.agents/skills/</code> for every project. Codex reads
          <code>agents/openai.yaml</code> from the same folder.
          {#if results.files.length === 1}
            Set an option from <code>agents/openai.yaml</code> above to export that file too.
          {/if}
        {/if}
      </p>
    </div>
    {#each results.files as file (file.path)}
      <ExportFileCard {file} disabled={!mounted} />
    {/each}
  </section>

  <section aria-labelledby="load-heading" class="space-y-4">
    <h2 id="load-heading" class="text-xl font-bold text-slate-900 dark:text-white">Load a skill</h2>
    <FileDropZone
      title="Drop a SKILL.md or a skill folder here"
      draggingTitle="Drop to load this skill"
      onFiles={loadFiles}
      busy={loading}
      progress="Reading the skill…"
      status={loadStatus}
      accept=".md,.markdown,.yaml,.yml"
      folders
      fileButtonLabel="Choose a SKILL.md"
      folderButtonLabel="Choose a skill folder"
      enterFolder={(path) => !/(^|\/)(node_modules|\.git)$/.test(path)}
      captureWindowDrops
    >
      A folder can hold an <code>agents/openai.yaml</code> for Codex beside its
      <code>SKILL.md</code>; it’s read too. Other files, such as scripts and references, aren’t
      edited here and stay in your folder.
    </FileDropZone>

    {#if loadError}
      <p role="alert" class="text-sm [overflow-wrap:anywhere] text-red-700 dark:text-red-400">
        <CodeText text={loadError} />
      </p>
    {/if}
    {#if loadNotes.length > 0}
      <ul
        class="list-disc space-y-1 pl-5 text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      >
        {#each loadNotes as note (note)}
          <li><CodeText text={note} /></li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="notes-heading" class="space-y-2">
    <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">Notes</h2>
    <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
      <li>
        The verdict checks the file the export would write: the frontmatter schema for the target,
        the naming and description rules, unknown keys, and a <code>SKILL.md</code> over 500 lines.
      </li>
      <li>
        The notes under each field restate those rules where they apply and add a few of their own,
        such as unscoped <code>Bash</code>, a tool both pre-approved and removed, arguments the body
        never uses, and options that only matter with <code>context: fork</code>. Tips are
        suggestions; only errors break a rule.
      </li>
      <li>
        Fields one target doesn’t read stay in the editor when you switch, and come back when you
        switch back. Keys neither tool reads are written back unchanged.
      </li>
      <li>Everything runs in your browser. Nothing you load or type is uploaded.</li>
    </ul>
  </section>
</div>
