<script lang="ts">
  import { X } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { guessSettingsScope, settingsScopeLabels } from '$lib/experiments/settings-scope';
  import type { SettingsScope } from '$lib/experiments/settings-scope';

  import { fieldClasses, hintClasses, labelClasses, panelClasses } from './field-styles';
  import { analyzeSettings } from './settings-import';
  import type { SettingsReport } from './settings-import';
  import type { SettingsSetup } from './settings-setup';

  type Props = {
    setup: SettingsSetup;
    ready: boolean;
    onReport: (report: SettingsReport | null) => void;
  };

  let { setup = $bindable(), ready, onReport }: Props = $props();

  // Settings files are small. Anything bigger isn't one.
  const maximumFileBytes = 1_000_000;
  const scopes = Object.keys(settingsScopeLabels) as SettingsScope[];

  let reading = $state(false);
  let message = $state<string | null>(null);

  const report = $derived(
    setup.files.length > 0 ? analyzeSettings(setup.files, setup.precedence) : null,
  );

  // Every change to the files or the precedence fills the controls in again. Only the
  // report is tracked, so a toggle the learner changes afterward stays changed.
  $effect(() => {
    const current = report;
    untrack(() => onReport(current));
  });

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (reading) return;
    reading = true;
    message = null;

    try {
      const files = await source;
      const added: SettingsSetup['files'] = [];
      let skipped = 0;

      for (const { file, path } of files) {
        if (file.size > maximumFileBytes || !/\.json$/i.test(path)) {
          skipped += 1;
          continue;
        }
        added.push({
          id: `file-${setup.nextId + added.length}`,
          path,
          scope: guessSettingsScope(path),
          text: await file.text(),
        });
      }

      setup.files = [...setup.files, ...added];
      setup.nextId += added.length;
      message =
        added.length === 0
          ? 'That didn’t include a settings file. Settings files end in .json.'
          : `Read ${added.length === 1 ? '1 settings file' : `${added.length} settings files`}.${skipped > 0 ? ` Skipped ${skipped} that weren’t JSON or were over 1 MB.` : ''}`;
    } catch {
      message = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      reading = false;
    }
  };

  const addPasted = (): void => {
    const label = `pasted ${settingsScopeLabels[setup.pasteScope].toLowerCase()} settings`;
    setup.files = [
      ...setup.files,
      { id: `file-${setup.nextId}`, path: label, scope: setup.pasteScope, text: setup.pasteText },
    ];
    setup.nextId += 1;
    setup.pasteText = '';
    message = `Added the ${label}.`;
  };

  const movePrecedence = (index: number, by: -1 | 1): void => {
    const next = [...setup.precedence];
    const target = index + by;
    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];
    setup.precedence = next;
  };

  const statusText = {
    read: null,
    empty: 'This file is empty, so it changes nothing.',
    invalid: 'This isn’t valid JSON, even without comments and trailing commas. It was ignored.',
    'not-an-object': 'The top level isn’t an object. It was ignored.',
  } as const;
</script>

<div class="grid items-start gap-6 lg:grid-cols-2">
  <section aria-labelledby="upload-heading" class="{panelClasses} min-w-0">
    <h3 id="upload-heading" class="text-lg font-bold text-slate-900 dark:text-white">
      Upload or paste your settings
    </h3>
    <FileDropZone
      title="Drop your settings files or .claude folders"
      draggingTitle="Drop to read them"
      accept=".json"
      folders
      keepFile={(path) => /(^|\/)(settings(\.local)?|managed-settings|\.mcp)\.json$/i.test(path)}
      enterFolder={(path) => !/(^|\/)(node_modules|\.git|projects)$/.test(path)}
      busy={reading}
      progress="Reading files…"
      status={message}
      onFiles={loadFiles}
    >
      <ul class="space-y-1">
        <li>
          Settings files are processed on your machine and never transmitted. A copied link never
          includes them.
        </li>
        <li>Remove any secret values, such as tokens in env, before you upload or paste.</li>
        <li>
          User settings live in ~/.claude/settings.json, project settings in .claude/settings.json,
          and local ones in .claude/settings.local.json.
        </li>
      </ul>
    </FileDropZone>

    <div class="space-y-3">
      <div class="space-y-1.5">
        <label for="paste-settings" class={labelClasses}>Or paste a settings file</label>
        <textarea
          id="paste-settings"
          bind:value={setup.pasteText}
          disabled={!ready}
          rows="6"
          spellcheck="false"
          aria-describedby="paste-settings-hint"
          class="{fieldClasses} font-mono text-sm"></textarea>
        <p id="paste-settings-hint" class={hintClasses}>
          It stays on this page. Comments and trailing commas are fine.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-0 flex-1 basis-40 space-y-1.5">
          <label for="paste-scope" class={labelClasses}>Its scope</label>
          <select
            id="paste-scope"
            bind:value={setup.pasteScope}
            disabled={!ready}
            class={fieldClasses}
          >
            {#each scopes as scope (scope)}
              <option value={scope}>{settingsScopeLabels[scope]}</option>
            {/each}
          </select>
        </div>
        <Button variant="secondary" disabled={!ready} onclick={addPasted}>
          Add pasted settings
        </Button>
      </div>
    </div>
  </section>

  <section
    aria-labelledby="read-heading"
    class="{panelClasses} min-w-0"
    data-testid="settings-read"
  >
    <h3 id="read-heading" class="text-lg font-bold text-slate-900 dark:text-white">
      What your settings say
    </h3>
    {#if !report}
      <p class={hintClasses}>
        Nothing yet. Once you add a file, the controls fill in from it, each with the line that
        justified it. Anything the files can’t settle stays as your toggle.
      </p>
    {:else}
      <ul class="space-y-3">
        {#each report.parsed as parsed (parsed.file.id)}
          <li class="space-y-1" data-settings-file={parsed.file.path}>
            <div class="flex flex-wrap items-end gap-3">
              <div class="min-w-0 flex-1 basis-48 space-y-1.5">
                <label for="scope-{parsed.file.id}" class="{labelClasses} [overflow-wrap:anywhere]"
                  >{parsed.file.path}</label
                >
                <select
                  id="scope-{parsed.file.id}"
                  value={parsed.file.scope}
                  disabled={!ready}
                  onchange={(event) => {
                    const scope = event.currentTarget.value as SettingsScope;
                    setup.files = setup.files.map((file) =>
                      file.id === parsed.file.id ? { ...file, scope } : file,
                    );
                  }}
                  class={fieldClasses}
                >
                  {#each scopes as scope (scope)}
                    <option value={scope}>{settingsScopeLabels[scope]}</option>
                  {/each}
                </select>
              </div>
              <Button
                variant="secondary"
                size="small"
                icon={X}
                disabled={!ready}
                aria-label="Remove {parsed.file.path}"
                onclick={() =>
                  (setup.files = setup.files.filter((file) => file.id !== parsed.file.id))}
              >
                Remove
              </Button>
            </div>
            {#if statusText[parsed.status]}
              <p class="text-sm text-amber-800 dark:text-amber-200">{statusText[parsed.status]}</p>
            {/if}
            {#if parsed.lenient}
              <p class="text-sm text-amber-800 dark:text-amber-200">
                This file has comments or trailing commas. Claude Code tolerates them and strict
                JSON doesn’t, so it was read leniently.
              </p>
            {/if}
            {#if parsed.unknownKeys.length > 0}
              <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
                Keys this tool doesn’t read, and ignores: {parsed.unknownKeys.join(', ')}.
              </p>
            {/if}
          </li>
        {/each}
      </ul>

      {#if report.parsed.length > 1}
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            When files disagree (assumption, highest priority first)
          </h4>
          <ol data-testid="settings-precedence" class="space-y-1 text-sm">
            {#each setup.precedence as scope, index (scope)}
              <li class="flex items-center gap-2">
                <span class="w-32 text-slate-800 dark:text-slate-100"
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
                  disabled={!ready || index === setup.precedence.length - 1}
                  aria-label="Move {settingsScopeLabels[scope]} later"
                  onclick={() => movePrecedence(index, 1)}>↓</Button
                >
              </li>
            {/each}
          </ol>
          <p class={hintClasses}>Lists, such as permission rules, merge across files instead.</p>
        </div>
      {/if}

      {#if report.merged.conflicts.length > 0}
        <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200" data-testid="conflicts">
          {#each report.merged.conflicts as conflict (conflict.key)}
            <li class="[overflow-wrap:anywhere]">
              <strong>{conflict.key}</strong>: assuming {settingsScopeLabels[
                conflict.winner.file.scope
              ]}
              wins with <code class="font-mono">{conflict.winner.value}</code>, over
              {conflict.others
                .map((other) => `${settingsScopeLabels[other.file.scope]} (${other.value})`)
                .join(', ')}. Reorder the scopes above to change it.
            </li>
          {/each}
        </ul>
      {/if}

      <div class="space-y-2" data-testid="settings-warnings">
        <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Warnings</h4>
        {#if report.warnings.length === 0}
          <p class={hintClasses}>
            None. That isn’t the same as safe: the tool never infers safe from settings.
          </p>
        {:else}
          <ul class="space-y-2 text-sm">
            {#each report.warnings as warning, index (index)}
              <li
                data-warning={warning.id}
                class="rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2 [overflow-wrap:anywhere] text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {warning.message}
                {#each warning.evidence as line, lineIndex (lineIndex)}
                  <span class="mt-0.5 block text-xs">
                    {line.file.path}{line.line === null ? '' : `, line ${line.line}`}:
                    <code class="font-mono">{line.lineText}</code>
                  </span>
                {/each}
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <Button
        variant="secondary"
        size="small"
        disabled={!ready}
        onclick={() => {
          setup.files = [];
          message = null;
        }}
      >
        Clear the settings
      </Button>
    {/if}
  </section>
</div>
