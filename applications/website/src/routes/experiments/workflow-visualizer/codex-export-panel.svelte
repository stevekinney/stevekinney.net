<script lang="ts">
  import { Copy, Download } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import Button from '$lib/components/button';
  import { copyText } from '$lib/experiments/copy-text';
  import { downloadText } from '$lib/experiments/download-text';

  import {
    codexSandboxModes,
    inheritedModelKey,
    noteSegments,
    type CodexSandboxMode,
    type CompatibilityNote,
  } from './codex-export-options';
  import type { CodexExportResult, WorkflowModelUse } from './codex-export';

  type Props = {
    source: string;
    disabled?: boolean;
    /** OpenAI model ids to suggest for each Claude model. */
    openAiModels: readonly string[];
    /** Show a line of the script, from a compatibility note. */
    onRevealLine?: (line: number) => void;
  };

  const { source, disabled = false, openAiModels, onRevealLine }: Props = $props();

  type Exporter = typeof import('./codex-export');
  type ModelRow = { key: string; label: string; calls: number };

  let exporter = $state.raw<Exporter | null>(null);
  let loadFailed = $state(false);
  let result = $state.raw<CodexExportResult | null>(null);
  let rows = $state.raw<ModelRow[]>([]);
  let modelChoices = $state<Record<string, string>>({});
  let sandboxMode = $state<CodexSandboxMode>('workspace-write');
  let networkAccessEnabled = $state(false);
  let copyStatus = $state<string | null>(null);

  const ready = $derived(exporter !== null && !disabled);
  const file = $derived(result?.ok ? result : null);
  const warnings = $derived(file ? file.notes.filter((note) => note.severity === 'warning') : []);
  const information = $derived(file ? file.notes.filter((note) => note.severity === 'info') : []);

  const sandboxHints: Record<CodexSandboxMode, string> = {
    'read-only': 'Agents can read files and run commands, but can’t change anything.',
    'workspace-write':
      'Agents can edit files in the working directory. This is what most workflows need; `codex exec` alone defaults to `read-only`.',
    'danger-full-access': 'No sandbox: agents can change anything on the machine.',
  };

  onMount(() => {
    import('./codex-export')
      .then((module) => {
        exporter = module;
      })
      .catch(() => {
        loadFailed = true;
      });
  });

  const toRows = (models: readonly WorkflowModelUse[], inheritedCalls: number): ModelRow[] => [
    ...models.map((use) => ({ key: use.name, label: use.name, calls: use.calls })),
    ...(inheritedCalls > 0 ? [{ key: inheritedModelKey, label: '', calls: inheritedCalls }] : []),
  ];

  // Generate right away when the converter arrives, then wait for a pause in typing.
  let firstRun = true;
  $effect(() => {
    const module = exporter;
    const script = source;
    const options = {
      models: { ...modelChoices },
      sandboxMode,
      networkAccessEnabled,
    };
    if (!module) return;

    const timer = setTimeout(
      () => {
        firstRun = false;
        result = module.generateCodexWorkflow(script, options);
        const models = module.listClaudeModels(script);
        if (models.ok) rows = toRows(models.models, models.inherited.calls);
      },
      firstRun ? 0 : 250,
    );
    return () => clearTimeout(timer);
  });

  const setModel = (key: string, value: string): void => {
    modelChoices = { ...modelChoices, [key]: value };
  };

  const download = (): void => {
    if (file) downloadText(file.fileName, file.text, 'text/javascript');
  };

  const copy = async (): Promise<void> => {
    if (!file) return;
    copyStatus = (await copyText(file.text))
      ? `Copied ${file.fileName}.`
      : 'Couldn’t reach the clipboard. Select the text below and copy it instead.';
  };
</script>

{#snippet message(text: string)}
  {#each noteSegments(text) as segment, index (index)}{#if segment.code}<code
        class="[overflow-wrap:anywhere]">{segment.text}</code
      >{:else}{segment.text}{/if}{/each}
{/snippet}

{#snippet noteList(notes: readonly CompatibilityNote[])}
  <ul class="space-y-2">
    {#each notes as note, index (index)}
      <li class="text-sm [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200">
        <span class="font-semibold text-slate-900 dark:text-white">{note.feature}.</span>
        {@render message(note.message)}
        {#if note.line !== undefined}
          {#if onRevealLine}
            <button
              type="button"
              class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 rounded-sm whitespace-nowrap underline underline-offset-2 focus-visible:outline-2 disabled:opacity-60"
              disabled={!ready}
              aria-label="Show line {note.line} of the script"
              onclick={() => onRevealLine?.(note.line ?? 1)}
            >
              Line {note.line}
            </button>
          {:else}
            <span class="whitespace-nowrap text-slate-500 dark:text-slate-400">
              (line {note.line})
            </span>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<!-- The page renders the section and its heading, so they're in the HTML before this loads. -->
<div class="min-w-0 space-y-6">
  {#if loadFailed}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">
      Couldn’t load the converter. Reload the page to try again.
    </p>
  {:else if !exporter}
    <p class="text-sm text-slate-600 dark:text-slate-300">Loading the converter…</p>
  {/if}

  <div class="grid min-w-0 gap-6 lg:grid-cols-2">
    <fieldset class="min-w-0 space-y-3">
      <legend class="text-base font-semibold text-slate-900 dark:text-white">Models</legend>
      <p id="codex-models-hint" class="text-sm text-slate-600 dark:text-slate-300">
        Pick the Codex model for each Claude model the script names. Leave one blank to use Codex’s
        default model, the <code>model</code> in <code>~/.codex/config.toml</code>.
      </p>
      {#if rows.length > 0}
        <table class="w-full table-fixed text-sm">
          <thead>
            <tr class="text-left text-slate-600 dark:text-slate-300">
              <th scope="col" class="w-2/5 pr-3 pb-2 font-semibold">Claude model</th>
              <th scope="col" class="pb-2 font-semibold">Codex model</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row, index (row.key)}
              <tr class="border-t border-slate-200 dark:border-slate-700">
                <th scope="row" class="py-2 pr-3 text-left align-middle font-normal">
                  <label
                    for="codex-model-{index}"
                    class="block [overflow-wrap:anywhere] text-slate-800 dark:text-slate-100"
                  >
                    {#if row.label === ''}
                      No <code>model</code> set (<code>{inheritedModelKey}</code>)
                    {:else}
                      <code>{row.label}</code>
                    {/if}
                    <span class="block text-xs text-slate-500 dark:text-slate-400">
                      {row.calls === 1 ? '1 call' : `${row.calls} calls`}
                    </span>
                  </label>
                </th>
                <td class="py-2 align-middle">
                  <input
                    id="codex-model-{index}"
                    type="text"
                    value={modelChoices[row.key] ?? ''}
                    placeholder="Codex’s default"
                    list="codex-model-suggestions"
                    autocomplete="off"
                    spellcheck="false"
                    disabled={!ready}
                    aria-describedby="codex-models-hint"
                    oninput={(event) => setModel(row.key, event.currentTarget.value)}
                    class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <datalist id="codex-model-suggestions">
          {#each openAiModels as model (model)}
            <option value={model}></option>
          {/each}
        </datalist>
      {:else if exporter}
        <p class="text-sm text-slate-600 dark:text-slate-300">
          The script doesn’t call <code>agent()</code> yet.
        </p>
      {/if}
    </fieldset>

    <fieldset class="min-w-0 space-y-4">
      <legend class="text-base font-semibold text-slate-900 dark:text-white">Sandbox</legend>
      <div class="space-y-1">
        <label
          for="codex-sandbox-mode"
          class="block text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          What agents may change
        </label>
        <select
          id="codex-sandbox-mode"
          bind:value={sandboxMode}
          disabled={!ready}
          aria-describedby="codex-sandbox-hint"
          class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          {#each codexSandboxModes as mode (mode)}
            <option value={mode}>{mode}</option>
          {/each}
        </select>
        <p id="codex-sandbox-hint" class="text-sm text-slate-600 dark:text-slate-300">
          {@render message(sandboxHints[sandboxMode])}
        </p>
      </div>
      <div class="flex items-start gap-2">
        <input
          id="codex-network-access"
          type="checkbox"
          bind:checked={networkAccessEnabled}
          disabled={!ready || sandboxMode !== 'workspace-write'}
          aria-describedby="codex-network-hint"
          class="accent-primary-600 mt-0.5 size-4 flex-none"
        />
        <div class="min-w-0 space-y-1">
          <label
            for="codex-network-access"
            class="block text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            Let agents’ commands reach the network
          </label>
          <p id="codex-network-hint" class="text-sm text-slate-600 dark:text-slate-300">
            Sets <code>networkAccessEnabled</code>, which only applies in the
            <code>workspace-write</code> sandbox. Agents never stop to ask for approval:
            <code>approvalPolicy</code> is <code>'never'</code>.
          </p>
        </div>
      </div>
    </fieldset>
  </div>

  {#if result && !result.ok}
    <p
      class="text-sm [overflow-wrap:anywhere] text-red-700 dark:text-red-400"
      aria-live="polite"
      data-testid="codex-export-error"
    >
      Can’t convert this script: {result.error}
    </p>
  {/if}

  {#if file}
    <div class="grid min-w-0 gap-6 lg:grid-cols-2" data-testid="codex-export-notes">
      {#if warnings.length > 0}
        <div class="min-w-0 space-y-2">
          <h3 class="text-base font-semibold text-slate-900 dark:text-white">
            Works differently ({warnings.length})
          </h3>
          {@render noteList(warnings)}
        </div>
      {/if}
      <div class="min-w-0 space-y-2">
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">
          Good to know ({information.length})
        </h3>
        {@render noteList(information)}
      </div>
    </div>
  {/if}

  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <Button icon={Download} class="max-w-full" disabled={!ready || !file} onclick={download}>
        <span class="[overflow-wrap:anywhere]">Download {file?.fileName ?? 'the Codex script'}</span
        >
      </Button>
      <Button variant="secondary" icon={Copy} disabled={!ready || !file} onclick={copy}>
        Copy
      </Button>
      <p
        class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
        aria-live="polite"
      >
        {copyStatus ?? ''}
      </p>
    </div>

    {#if file}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        role="region"
        tabindex="0"
        aria-label="Preview of {file.fileName}"
        class="focus-visible:outline-primary-600 relative max-h-[36rem] overflow-y-auto rounded-md border border-slate-300 bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-600 dark:bg-slate-900"
      >
        <pre
          data-testid="codex-export-preview"
          class="p-4 font-mono text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:text-slate-100">{file.text}</pre>
      </div>
    {/if}
  </div>
</div>
