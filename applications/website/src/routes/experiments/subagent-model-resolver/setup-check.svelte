<script lang="ts">
  import { X } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import CommandTabs from './command-tabs.svelte';
  import { settingsScopeLabels } from './effective-settings';
  import type { SettingsScope } from './effective-settings';
  import { fieldClasses, hintClasses, labelClasses, panelClasses } from './field-styles';
  import {
    agentGroupKey,
    analyzeFleet,
    isAgentFile,
    isIgnoredFolder,
    isSettingsPath,
    isSetupFile,
  } from './fleet';
  import InlineCode from './inline-code.svelte';
  import { exampleLines, parsePastedOutput } from './paste-parser';
  import type { ResolverConfiguration } from './resolve';
  import { agentScopeLabels, guessSettingsScope, uploadableAgentScopes } from './scopes';
  import type { AgentScope } from './scopes';
  import SelectField from './select-field.svelte';
  import type { SetupState } from './setup-state';
  import { initialSetup } from './setup-state';
  import type { VersionRange } from './versions';

  type FleetAnalysisComponent = typeof import('./fleet-analysis.svelte').default;

  type Props = {
    setup: SetupState;
    controls: ResolverConfiguration;
    range: VersionRange;
    ready: boolean;
    onLoadConfiguration: (configuration: ResolverConfiguration) => void;
  };

  let { setup = $bindable(), controls, range, ready, onLoadConfiguration }: Props = $props();

  // Agent definitions and settings files are small. Anything bigger isn't one.
  const maximumFileBytes = 1_000_000;

  // The table, the fixes, and the exports are the biggest part of this section, and
  // nothing needs them until there are files to show, so they load on first use.
  let FleetAnalysisView = $state.raw<FleetAnalysisComponent | null>(null);
  let fleetFailed = $state(false);

  let reading = $state(false);
  let message = $state<string | null>(null);

  const analysis = $derived(analyzeFleet({ ...setup, controls, range }));

  $effect(() => {
    if (!analysis.hasInput || FleetAnalysisView) return;

    import('./fleet-analysis.svelte')
      .then((module) => {
        FleetAnalysisView = module.default;
      })
      .catch(() => {
        fleetFailed = true;
      });
  });

  const keepFile = (path: string): boolean => isSetupFile(path);
  const enterFolder = (path: string): boolean =>
    !isIgnoredFolder(path) && !/(^|[\\/])\.claude[\\/]projects$/.test(path);

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (reading) return;
    reading = true;
    message = null;

    try {
      const files = await source;
      const batch = setup.nextBatch;
      const agentFiles: SetupState['agentFiles'] = [];
      const settingsFiles: SetupState['settingsFiles'] = [];
      let skipped = 0;

      for (const { file, path } of files) {
        if (file.size > maximumFileBytes) {
          skipped += 1;
        } else if (isSettingsPath(path)) {
          settingsFiles.push({
            id: `${batch}:${path}`,
            path,
            scope: guessSettingsScope(path),
            text: await file.text(),
          });
        } else if (isAgentFile(path)) {
          agentFiles.push({ id: `${batch}:${path}`, batch, path, text: await file.text() });
        }
      }

      setup.agentFiles = [...setup.agentFiles, ...agentFiles];
      setup.settingsFiles = [...setup.settingsFiles, ...settingsFiles];
      setup.nextBatch = batch + 1;

      const parts = [
        agentFiles.length === 1 ? '1 agent file' : `${agentFiles.length} agent files`,
        settingsFiles.length === 1 ? '1 settings file' : `${settingsFiles.length} settings files`,
      ];
      message =
        agentFiles.length + settingsFiles.length === 0
          ? 'That didn’t include any agent definitions or settings files. Agent definitions are .md files inside an agents folder.'
          : `Read ${parts.join(' and ')}.${skipped > 0 ? ` Skipped ${skipped} over 1 MB.` : ''}`;
    } catch {
      message = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      reading = false;
    }
  };

  // The folders that were dropped, with the scope each one is guessed or corrected to.
  const sources = $derived.by(() => {
    const groups = new Map<
      string,
      { key: string; label: string; count: number; scope: AgentScope }
    >();

    for (const definition of analysis.definitions) {
      if (definition.source !== 'upload') continue;

      const group = groups.get(definition.groupKey);
      if (group) group.count += 1;
      else {
        groups.set(definition.groupKey, {
          key: definition.groupKey,
          label: definition.groupKey.replace(/^\d+:/, '') || 'agents',
          count: 1,
          scope: definition.scope,
        });
      }
    }

    return [...groups.values()];
  });

  const removeGroup = (key: string): void => {
    setup.agentFiles = setup.agentFiles.filter(
      (file) => agentGroupKey(file.batch, file.path) !== key,
    );
    delete setup.agentScopes[key];
  };

  const movePrecedence = (index: number, by: -1 | 1): void => {
    const next = [...setup.settingsPrecedence];
    const target = index + by;
    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];
    setup.settingsPrecedence = next;
  };

  const clearAll = (): void => {
    Object.assign(setup, initialSetup());
    message = null;
  };

  const pasted = $derived(parsePastedOutput(setup.pastedText));
  const pastedSomething = $derived(setup.pastedText.trim() !== '');
</script>

<div class="space-y-8">
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <section aria-labelledby="route-a-heading" class="{panelClasses} min-w-0">
      <div class="space-y-1">
        <h3 id="route-a-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          Upload your files (best)
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Uploading catches agents with no <InlineCode text="`model:`" /> line, which a grep can’t see.
        </p>
      </div>
      <FileDropZone
        title="Drop your agents folders and settings files"
        draggingTitle="Drop to read them"
        accept=".md,.json"
        folders
        {keepFile}
        {enterFolder}
        busy={reading}
        progress="Reading files…"
        status={message}
        folderButtonLabel="Choose a folder"
        onFiles={loadFiles}
      >
        <ul class="space-y-1">
          <li>
            Drop <InlineCode text="`~/.claude/agents`" /> and your project’s <InlineCode
              text="`.claude/agents`"
            />, plus <InlineCode text="`settings.json`" /> and <InlineCode
              text="`settings.local.json`"
            />.
          </li>
          <li>Those folders are hidden. In the macOS file picker, press ⌘⇧. to show them.</li>
          <li>Drop one folder at a time if you want to set each one’s scope.</li>
        </ul>
      </FileDropZone>

      {#if sources.length > 0 || setup.settingsFiles.length > 0}
        <div class="space-y-3" data-testid="sources">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200">What was read</h4>
          <p class={hintClasses}>
            A browser can’t tell your home folder from a project folder, so the scopes below are
            guesses. Correct any that are wrong.
          </p>
          <ul class="space-y-3">
            {#each sources as source (source.key)}
              <li class="flex flex-wrap items-end gap-3" data-source={source.label}>
                <div class="min-w-0 flex-1 basis-48">
                  <SelectField
                    id="scope-{source.key}"
                    label="{source.label} ({source.count} {source.count === 1
                      ? 'agent'
                      : 'agents'})"
                    value={source.scope}
                    options={uploadableAgentScopes.map((scope) => ({
                      value: scope,
                      label: agentScopeLabels[scope],
                    }))}
                    disabled={!ready}
                    onChange={(value) => (setup.agentScopes[source.key] = value as AgentScope)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  icon={X}
                  disabled={!ready}
                  aria-label="Remove {source.label}"
                  onclick={() => removeGroup(source.key)}
                >
                  Remove
                </Button>
              </li>
            {/each}
            {#each setup.settingsFiles as file (file.id)}
              <li class="flex flex-wrap items-end gap-3">
                <div class="min-w-0 flex-1 basis-48">
                  <SelectField
                    id="settings-scope-{file.id}"
                    label={file.path}
                    value={file.scope}
                    options={(Object.keys(settingsScopeLabels) as SettingsScope[]).map((scope) => ({
                      value: scope,
                      label: settingsScopeLabels[scope],
                    }))}
                    disabled={!ready}
                    onChange={(value) => (file.scope = value as SettingsScope)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  icon={X}
                  disabled={!ready}
                  aria-label="Remove {file.path}"
                  onclick={() =>
                    (setup.settingsFiles = setup.settingsFiles.filter(
                      (entry) => entry.id !== file.id,
                    ))}
                >
                  Remove
                </Button>
              </li>
            {/each}
          </ul>

          {#if setup.settingsFiles.length > 1}
            <div class="space-y-2">
              <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                When settings files disagree (assumption, highest priority first)
              </h4>
              <ol data-testid="settings-precedence" class="space-y-1 text-sm">
                {#each setup.settingsPrecedence as scope, index (scope)}
                  <li class="flex items-center gap-2">
                    <span class="w-40 text-slate-800 dark:text-slate-100"
                      >{settingsScopeLabels[scope]}</span
                    >
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={!ready || index === 0}
                      aria-label="Move {settingsScopeLabels[scope]} earlier"
                      onclick={() => movePrecedence(index, -1)}>↑</Button
                    >
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={!ready || index === setup.settingsPrecedence.length - 1}
                      aria-label="Move {settingsScopeLabels[scope]} later"
                      onclick={() => movePrecedence(index, 1)}>↓</Button
                    >
                  </li>
                {/each}
              </ol>
            </div>
          {/if}
        </div>
      {/if}

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label for="working-directory" class={labelClasses}>Working directory (optional)</label>
          <input
            id="working-directory"
            type="text"
            bind:value={setup.workingDirectory}
            disabled={!ready}
            autocomplete="off"
            spellcheck="false"
            aria-describedby="working-directory-hint"
            class={fieldClasses}
          />
          <p id="working-directory-hint" class={hintClasses}>
            When nested project folders define the same agent, the one closest to here wins.
          </p>
        </div>
        <div class="space-y-1.5">
          <label for="cli-agents" class={labelClasses}>The --agents flag (optional)</label>
          <textarea
            id="cli-agents"
            bind:value={setup.cliAgentsText}
            disabled={!ready}
            rows="3"
            spellcheck="false"
            aria-describedby="cli-agents-hint"
            class="{fieldClasses} font-mono text-sm"></textarea>
          <p id="cli-agents-hint" class={hintClasses}>
            It’s session-only, so it can’t be uploaded. Paste its JSON, such as
            <InlineCode text={'`{"reviewer": {"model": "haiku"}}`'} />.
          </p>
        </div>
        <div class="space-y-1.5">
          <label for="shell-environment" class={labelClasses}>Shell environment (optional)</label>
          <textarea
            id="shell-environment"
            bind:value={setup.shellEnvironmentText}
            disabled={!ready}
            rows="2"
            spellcheck="false"
            aria-describedby="shell-environment-hint"
            class="{fieldClasses} font-mono text-sm"></textarea>
          <p id="shell-environment-hint" class={hintClasses}>
            Lines like <InlineCode text="`CLAUDE_CODE_SUBAGENT_MODEL=haiku`" />. The shell overrides
            settings files, and that’s listed as an assumption.
          </p>
        </div>
        <div class="space-y-1.5">
          <label for="claude-version" class={labelClasses}
            >Your Claude Code version (optional)</label
          >
          <input
            id="claude-version"
            type="text"
            bind:value={setup.versionText}
            disabled={!ready}
            autocomplete="off"
            spellcheck="false"
            aria-describedby="claude-version-hint"
            class="{fieldClasses} font-mono"
          />
          <p id="claude-version-hint" class={hintClasses}>
            Type 2.1.278 or paste the line from <InlineCode text="`claude --version`" />.
          </p>
        </div>
      </div>

      <div>
        <Button variant="secondary" size="small" disabled={!ready} onclick={clearAll}>
          Clear everything
        </Button>
      </div>
    </section>

    <section aria-labelledby="route-b-heading" class="{panelClasses} min-w-0">
      <div class="space-y-1">
        <h3 id="route-b-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          Or paste command output
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Run these in a terminal, then paste everything they print. Partial output is fine, and
          order doesn’t matter.
        </p>
      </div>
      <CommandTabs {ready} />
      <div class="space-y-1.5">
        <label for="pasted-output" class={labelClasses}>Paste the output here</label>
        <textarea
          id="pasted-output"
          bind:value={setup.pastedText}
          disabled={!ready}
          rows="6"
          spellcheck="false"
          aria-describedby="pasted-output-hint"
          class="{fieldClasses} font-mono text-sm"></textarea>
        <p id="pasted-output-hint" class={hintClasses}>
          Read in your browser. Nothing is uploaded.
        </p>
      </div>
      {#if pastedSomething}
        {#if pasted.understood === 0}
          <div class="space-y-2 text-sm text-amber-900 dark:text-amber-200" role="status">
            <p>None of those lines could be read. Lines like these work:</p>
            <pre class="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100"><code
                >{exampleLines.join('\n')}</code
              ></pre>
          </div>
        {:else}
          <p class="text-sm text-slate-600 dark:text-slate-300" role="status">
            Read {pasted.understood}
            {pasted.understood === 1 ? 'line' : 'lines'}{pasted.ignored > 0
              ? ` and skipped ${pasted.ignored} that weren’t recognized`
              : ''}.
          </p>
        {/if}
      {/if}
    </section>
  </div>

  <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
    Or enter everything by hand with the controls above. Clicking a row below loads that agent
    there.
  </p>

  {#if analysis.hasInput}
    {#if FleetAnalysisView}
      <FleetAnalysisView {analysis} bind:setup {controls} {range} {ready} {onLoadConfiguration} />
    {:else if fleetFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The results didn’t load. Reload the page to try again.
      </p>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading the results…</p>
    {/if}
  {:else}
    <p class="text-slate-600 dark:text-slate-300">
      Add files or paste command output to see whether anything changes.
    </p>
  {/if}
</div>
