<script lang="ts">
  import { Download } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { downloadText } from './download';
  import { defaultIntendedModel, suggestFix } from './fixes';
  import type { FleetAnalysis } from './fleet';
  import InlineCode from './inline-code.svelte';
  import { families } from './models';
  import type { Family } from './models';
  import SelectField from './select-field.svelte';

  type Props = { analysis: FleetAnalysis; ready: boolean };

  const { analysis, ready }: Props = $props();

  let intended = $state<Record<string, Family>>({});

  const changed = $derived(
    analysis.rows.filter((row) => row.changed && row.status.kind !== 'shadowed'),
  );
</script>

<section aria-labelledby="fixes-heading" class="space-y-3">
  <div class="space-y-1">
    <h3 id="fixes-heading" class="text-lg font-bold text-slate-900 dark:text-white">
      Suggested fixes
    </h3>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Each fix pins a model by editing one line. It starts with the model the agent ran on before,
      so the upgrade changes nothing. Pick another model if that isn’t what you want. A patched file
      is a copy with only the <InlineCode text="`model:`" /> line changed. Nothing is modified in place.
    </p>
  </div>

  {#if changed.length === 0}
    <p class="text-slate-700 dark:text-slate-200">No agent changes, so there is nothing to fix.</p>
  {:else}
    <ul class="space-y-2">
      {#each changed as row (row.id)}
        {@const choice = intended[row.id] ?? defaultIntendedModel(row)}
        {@const fix = suggestFix(row, analysis, choice)}
        <li>
          <details
            data-fix={row.name}
            class="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
          >
            <summary class="cursor-pointer font-semibold text-slate-900 dark:text-white">
              {row.name}
              <span class="font-mono text-sm font-normal text-slate-600 dark:text-slate-300">
                {row.before} → {row.after}
              </span>
            </summary>
            <div class="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <div class="max-w-xs">
                <SelectField
                  id="fix-{row.id}"
                  label="Pin to"
                  value={choice}
                  options={families.map((family) => ({ value: family, label: family }))}
                  disabled={!ready}
                  onChange={(value) => (intended[row.id] = value as Family)}
                />
              </div>
              <p><InlineCode text={fix.editInstruction} /></p>
              {#if fix.editProblem}
                <p class="text-amber-800 dark:text-amber-300">
                  <InlineCode text={fix.editProblem} />
                </p>
              {/if}
              {#if fix.forceInstruction}
                <p>
                  <span class="font-semibold">Or, to put everything on one model:</span>
                  <InlineCode text={fix.forceInstruction} />
                </p>
              {:else if fix.forceUnavailable}
                <p class="text-slate-500 dark:text-slate-400">{fix.forceUnavailable}</p>
              {/if}

              {#if fix.patch}
                {#if fix.patch.alreadySet}
                  <p>This file already says <InlineCode text={`\`model: ${choice}\``} />.</p>
                {:else}
                  <figure class="space-y-2">
                    <figcaption class="font-semibold">
                      Diff preview for {fix.patch.fileName}
                    </figcaption>
                    <pre
                      class="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100"><code
                        >{#each fix.patch.diff as line, index (index)}<span
                            class={line.kind === 'add'
                              ? 'block bg-emerald-900/60'
                              : line.kind === 'remove'
                                ? 'block bg-red-900/60'
                                : 'block text-slate-400'}
                            >{line.kind === 'add'
                              ? '+ '
                              : line.kind === 'remove'
                                ? '- '
                                : '  '}{line.text}</span
                          >{/each}</code
                      ></pre>
                  </figure>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={Download}
                    disabled={!ready}
                    onclick={() =>
                      fix.patch &&
                      downloadText(fix.patch.fileName, fix.patch.contents, 'text/markdown')}
                  >
                    Download patched {fix.patch.fileName}
                  </Button>
                {/if}
              {:else if fix.noPatchReason}
                <p class="text-slate-500 dark:text-slate-400">{fix.noPatchReason}</p>
              {/if}
            </div>
          </details>
        </li>
      {/each}
    </ul>
  {/if}
</section>
