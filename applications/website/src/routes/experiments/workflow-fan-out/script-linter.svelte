<script lang="ts">
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';

  import { bodyClasses, fieldClasses, labelClasses } from './field-styles';
  import { lintScript } from './lint-script';
  import { readScript } from './script-intake';

  const example = `export const meta = {
  name: 'route-audit',
  description: 'Audit every API route for authorization',
  phases: [{ title: 'Scan' }, { title: 'Review' }],
};

phase('Scan');
const routes = await agent('List API routes as JSON', { schema: ROUTES });

phase('Audit');
const findings = await parallel(
  routes.items.map((route) => () => agent('Review authorization on ' + route.path)),
);

const startedAt = Date.now();
return findings.filter(Boolean);
`;

  let source = $state('');
  let busy = $state(false);
  let status = $state<string | null>(null);

  const findings = $derived(source.trim() ? lintScript(source) : []);

  const conceptLinks: Record<string, string> = {
    nulls: 'Nulls and .filter(Boolean)',
    models: 'How a model is chosen',
    barriers: 'pipeline() and parallel()',
    'script-rules': 'What a script can’t do',
    meta: 'meta and phases',
  };

  const handleFiles = async (files: Promise<SourceFile[]>): Promise<void> => {
    busy = true;
    status = null;
    try {
      const result = await readScript(await files);
      if ('error' in result) status = result.error;
      else {
        source = result.text;
        status = `Read ${result.name}.`;
      }
    } catch {
      status = 'Couldn’t read that file.';
    } finally {
      busy = false;
    }
  };
</script>

<div class="space-y-4">
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="min-w-0 space-y-1.5">
      <label for="script-source" class={labelClasses}>Your orchestration script</label>
      <p id="script-privacy" class={bodyClasses}>
        Checked in this browser. Your script never leaves your machine, and it isn’t put in a copied
        link.
      </p>
      <textarea
        id="script-source"
        rows="14"
        spellcheck="false"
        aria-describedby="script-privacy"
        bind:value={source}
        class="{fieldClasses} font-mono text-sm"
        placeholder="export const meta = &#123; name: '…', description: '…' &#125;;"></textarea>
      <button
        type="button"
        onclick={() => (source = example)}
        class="text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2"
      >
        Paste an example with problems
      </button>
    </div>
    <FileDropZone
      title="Or drop a workflow script"
      accept=".js,.mjs,.cjs,.ts,.txt"
      fileButtonLabel="Choose a script"
      {busy}
      {status}
      onFiles={handleFiles}
      class="h-full"
    >
      <p class={bodyClasses}>Saved workflows live in .claude/workflows/ or ~/.claude/workflows/.</p>
    </FileDropZone>
  </div>

  <div aria-live="polite" data-testid="lint-findings">
    {#if source.trim() === ''}
      <p class={bodyClasses}>Paste or drop a script to check it.</p>
    {:else if findings.length === 0}
      <p class="font-semibold text-emerald-800 dark:text-emerald-200">
        No findings. These checks are heuristic, so that isn’t proof.
      </p>
    {:else}
      <p class="font-semibold text-slate-900 dark:text-white">
        {findings.length}
        {findings.length === 1 ? 'finding' : 'findings'}
      </p>
      <ol class="space-y-2">
        {#each findings as finding, index (index)}
          <li
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
            data-rule={finding.rule}
          >
            <p class="flex flex-wrap items-center gap-2">
              <span class="font-mono font-semibold tabular-nums">Line {finding.line}</span>
              <span
                class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                heuristic{finding.question ? ' · question' : ''}
              </span>
            </p>
            <p class="mt-1 [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200">
              {finding.message}
            </p>
            <a
              href="#concept-{finding.concept}"
              class="text-primary-700 dark:text-primary-300 text-sm underline underline-offset-2"
            >
              {conceptLinks[finding.concept]}
            </a>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>
