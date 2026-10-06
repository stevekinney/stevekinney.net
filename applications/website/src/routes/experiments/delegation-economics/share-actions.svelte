<script lang="ts">
  import { Copy, Link, Pin, PinOff } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import type { Verdict } from './checklist';
  import { comparePlans } from './compare';
  import type { Plan } from './compare';
  import type { Evaluation } from './economics';
  import type { WorkerModel } from './pricing';
  import type { Scenario } from './scenario';
  import { encodeScenario } from './share-link';
  import { summaryToMarkdown } from './summary';

  type Props = {
    ready: boolean;
    scenario: Scenario;
    models: WorkerModel[];
    standardModels: WorkerModel[];
    model: WorkerModel;
    evaluation: Evaluation;
    verdict: Verdict;
    current: Plan;
    pinned: Plan | null;
    onPin: () => void;
    onUnpin: () => void;
  };

  const {
    ready,
    scenario,
    models,
    standardModels,
    model,
    evaluation,
    verdict,
    current,
    pinned,
    onPin,
    onUnpin,
  }: Props = $props();

  const rows = $derived(pinned ? comparePlans(pinned, current) : []);

  const sharedLink = (): string =>
    `${window.location.origin}${window.location.pathname}#${encodeScenario(scenario, models, standardModels)}`;

  let message = $state<string | null>(null);
  let fallbackText = $state<string | null>(null);
  let fallbackLabel = $state('');
  let fallbackField = $state<HTMLTextAreaElement | undefined>();

  const copy = async (text: string, success: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      fallbackText = null;
      message = success;
    } catch {
      // The clipboard can reject, such as without permission or outside a secure page.
      fallbackText = text;
      fallbackLabel = label;
      message =
        'Couldn’t reach the clipboard. Press ⌘C on a Mac, or Ctrl+C, to copy the selected text.';
      queueMicrotask(() => fallbackField?.select());
    }
  };

  const changeClasses: Record<string, string> = {
    better: 'text-emerald-800 dark:text-emerald-300',
    worse: 'text-amber-900 dark:text-amber-200',
    same: 'text-slate-600 dark:text-slate-300',
  };
</script>

<div class="space-y-6">
  <section aria-labelledby="compare-heading" class="space-y-3">
    <h3 id="compare-heading" class="text-lg font-bold text-slate-900 dark:text-white">
      Compare two plans
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Pin this scenario as plan A, then change anything to make plan B.
    </p>
    <div class="flex flex-wrap gap-3">
      <Button variant="secondary" size="small" icon={Pin} disabled={!ready} onclick={onPin}>
        {pinned ? 'Pin this as plan A instead' : 'Pin as plan A'}
      </Button>
      {#if pinned}
        <Button variant="secondary" size="small" icon={PinOff} onclick={onUnpin}>Unpin</Button>
      {/if}
    </div>

    {#if pinned}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
        tabindex="0"
        role="region"
        aria-label="Plan comparison"
      >
        <table class="w-full border-collapse text-sm tabular-nums" data-testid="plan-comparison">
          <caption class="sr-only">
            Plan A, pinned, against plan B, the current scenario. Lower is better for all three.
          </caption>
          <thead class="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th scope="col" class="px-3 py-2 text-left">Result</th>
              <th scope="col" class="px-3 py-2 text-right">Plan A</th>
              <th scope="col" class="px-3 py-2 text-right">Plan B</th>
              <th scope="col" class="px-3 py-2 text-right">B − A</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
            {#each rows as row (row.label)}
              <tr class="bg-white dark:bg-slate-900">
                <th scope="row" class="px-3 py-2 text-left font-semibold">{row.label}</th>
                <td class="px-3 py-2 text-right whitespace-nowrap">{row.a}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">{row.b}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap {changeClasses[row.direction]}">
                  {row.change}{row.direction === 'same'
                    ? ''
                    : row.direction === 'better'
                      ? ' (better)'
                      : ' (worse)'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section aria-labelledby="share-heading" class="space-y-3">
    <h3 id="share-heading" class="text-lg font-bold text-slate-900 dark:text-white">Share it</h3>
    <div class="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="small"
        icon={Link}
        disabled={!ready}
        onclick={() =>
          copy(
            sharedLink(),
            'Link copied. It holds these controls and nothing from your sessions.',
            'Link',
          )}
      >
        Copy link
      </Button>
      <Button
        variant="secondary"
        size="small"
        icon={Copy}
        disabled={!ready}
        onclick={() =>
          copy(
            summaryToMarkdown(scenario, model, evaluation, verdict),
            'Summary copied as Markdown.',
            'Summary',
          )}
      >
        Copy summary
      </Button>
    </div>
    <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{message}</p>
    {#if fallbackText !== null}
      <label class="block text-sm text-slate-600 dark:text-slate-300">
        <span class="sr-only">{fallbackLabel} to copy</span>
        <textarea
          bind:this={fallbackField}
          readonly
          rows="6"
          value={fallbackText}
          onfocus={(event) => event.currentTarget.select()}
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        ></textarea>
      </label>
    {/if}
  </section>
</div>
