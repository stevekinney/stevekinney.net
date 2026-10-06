<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import type { Overview } from './analysis';
  import type { Cluster } from './clusters';
  import { buildDigest, DIGEST_CLUSTERS } from './digest';
  import { downloadText } from './download';
  import { bodyClasses, buttonClasses, codeClasses } from './field-styles';

  type Props = { overview: Overview; clusters: Cluster[]; scope: string | null };

  const { overview, clusters, scope }: Props = $props();

  let redaction = $state(true);
  let format = $state<'markdown' | 'json'>('markdown');

  const digest = $derived(buildDigest({ overview, clusters, scope, redaction }));
  const preview = $derived(format === 'markdown' ? digest.markdown : digest.json);
</script>

<div class="space-y-4">
  <p class="max-w-3xl {bodyClasses}">
    Scripts parse; models read digests. This is the top {DIGEST_CLUSTERS} clusters with their counts and
    verbatim examples, small enough to hand to a model. Every number in it was counted here, in code.
  </p>

  <label class="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
    <input
      type="checkbox"
      bind:checked={redaction}
      class="accent-primary-600 size-4"
      data-testid="redaction-toggle"
    />
    Mask home directories and secrets
  </label>

  <div
    aria-live="polite"
    class="text-sm text-slate-700 dark:text-slate-200"
    data-testid="redaction-findings"
  >
    {#if !redaction}
      <p class="font-semibold text-red-700 dark:text-red-400">
        Redaction is off. The digest shows paths and anything secret-shaped exactly as logged.
      </p>
    {:else if digest.findings.length === 0}
      <p>Nothing needed masking.</p>
    {:else}
      <p>Masked before export:</p>
      <ul class="list-disc pl-5">
        {#each digest.findings as finding (`${finding.kind}:${finding.replacement}`)}
          <li>
            {finding.kind}, {formatTokenCount(finding.count)} time{finding.count === 1 ? '' : 's'},
            shown as
            <code class={codeClasses}>{finding.replacement}</code>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div role="group" aria-label="Preview format" class="flex gap-2">
    {#each [{ id: 'markdown', label: 'Markdown' }, { id: 'json', label: 'JSON' }] as option (option.id)}
      <button
        type="button"
        aria-pressed={format === option.id}
        onclick={() => (format = option.id as 'markdown' | 'json')}
        class="{buttonClasses} aria-pressed:border-primary-600 aria-pressed:ring-primary-600 aria-pressed:ring-1"
      >
        {option.label}
      </button>
    {/each}
  </div>

  <pre
    class="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    aria-label="Digest preview"
    data-testid="digest-preview">{preview}</pre>

  <div class="flex flex-wrap gap-3">
    <button
      type="button"
      class={buttonClasses}
      onclick={() => downloadText('session-digest.md', digest.markdown, 'text/markdown')}
    >
      Download Markdown digest
    </button>
    <button
      type="button"
      class={buttonClasses}
      onclick={() => downloadText('session-digest.json', digest.json, 'application/json')}
    >
      Download JSON digest
    </button>
  </div>
</div>
