<script lang="ts">
  import { formatCompactTokenCount, formatCost, formatTokenCount } from '$lib/experiments/format';

  import type { WorkflowConfig } from './config';
  import { bodyClasses, codeClasses } from './field-styles';
  import { modelSourceLabels } from './models';
  import type { WorkflowModel } from './models';
  import NumberField from './number-field.svelte';
  import type { WorkflowRun } from './run';
  import { LIMITS } from './scale';
  import { INHERIT_WARNING } from './summary';

  type Props = {
    config: WorkflowConfig;
    run: WorkflowRun;
    models: WorkflowModel[];
    defaultModels: WorkflowModel[];
    ready: boolean;
    onPriceChange: (id: string, patch: Partial<Pick<WorkflowModel, 'input' | 'output'>>) => void;
    onResetPrices: () => void;
  };

  const { config, run, models, defaultModels, ready, onPriceChange, onResetPrices }: Props =
    $props();

  const { estimate, scale } = $derived(run);
  const customPrices = $derived(
    models.some(
      (model, index) =>
        model.input !== defaultModels[index]?.input ||
        model.output !== defaultModels[index]?.output,
    ),
  );

  const badges = $derived([
    {
      id: 'agents',
      label: `${formatTokenCount(estimate.agents)} agents`,
      detail: scale.agentsRefused
        ? `over the ${formatTokenCount(LIMITS.agentsPerRun)}-agent limit`
        : scale.largeByAgents
          ? `Large workflow: over ${LIMITS.warningAgents}`
          : `under the ${LIMITS.warningAgents}-agent warning`,
      tone: scale.agentsRefused ? 'refused' : scale.largeByAgents ? 'warning' : 'ok',
    },
    {
      id: 'tokens',
      label: `${formatCompactTokenCount(estimate.tokens)} tokens`,
      detail: scale.largeByTokens ? 'Large workflow: over 1.5M' : 'under the 1.5M warning',
      tone: scale.largeByTokens ? 'warning' : 'ok',
    },
    {
      id: 'items',
      label: `${formatTokenCount(config.items)} items`,
      detail: scale.itemsRejected
        ? `over the ${formatTokenCount(LIMITS.itemsPerCall)}-item limit`
        : `within ${formatTokenCount(LIMITS.itemsPerCall)} per call`,
      tone: scale.itemsRejected ? 'refused' : 'ok',
    },
  ]);

  const toneClasses: Record<string, string> = {
    ok: 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-50',
    warning:
      'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50',
    refused:
      'border-red-600 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950/40 dark:text-red-50',
  };
</script>

<div class="space-y-5">
  <ul class="flex flex-wrap gap-2" aria-label="Limits and warnings">
    {#each badges as badge (badge.id)}
      <li
        class="rounded-full border px-3 py-1 text-sm {toneClasses[badge.tone]}"
        data-testid="badge-{badge.id}"
        data-tone={badge.tone}
      >
        <strong class="tabular-nums">{badge.label}</strong>, {badge.detail}
      </li>
    {/each}
  </ul>

  {#each [...run.refusals, ...run.warnings] as message (message)}
    <p
      role={message.startsWith('Large') ? undefined : 'alert'}
      class="rounded-lg border-l-4 px-4 py-2 text-sm font-semibold {message.startsWith('Large')
        ? toneClasses.warning
        : toneClasses.refused}"
    >
      {message}
    </p>
  {/each}

  {#if run.inherits}
    <p
      class="rounded-lg border-l-4 px-4 py-2 font-semibold {toneClasses.warning}"
      data-testid="inherit-warning"
    >
      {INHERIT_WARNING}
      <span class="font-normal"
        >Every stage leaves both the call’s model and the agent definition’s unset, and so does
        CLAUDE_CODE_SUBAGENT_MODEL.</span
      >
    </p>
  {/if}
  {#if run.callout}
    <p
      class="border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40 rounded-lg border-l-4 px-4 py-2 font-semibold text-slate-900 dark:text-white"
      data-testid="model-callout"
    >
      {run.callout}
    </p>
  {/if}

  <div class="relative overflow-x-auto" role="region" aria-label="Cost by stage" tabindex="-1">
    <table class="w-full text-sm text-slate-700 dark:text-slate-200">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700">
          <th scope="col" class="px-3 py-2 text-left">Agent group</th>
          <th scope="col" class="px-3 py-2 text-right">Agents</th>
          <th scope="col" class="px-3 py-2 text-right">Tokens</th>
          <th scope="col" class="px-3 py-2 text-left">Model, from</th>
          <th scope="col" class="px-3 py-2 text-right">Cost</th>
        </tr>
      </thead>
      <tbody>
        {#each estimate.rows as row (row.key)}
          <tr class="border-b border-slate-100 dark:border-slate-800">
            <th scope="row" class="px-3 py-2 text-left font-normal [overflow-wrap:anywhere]"
              >{row.label}</th
            >
            <td class="px-3 py-2 text-right tabular-nums">{formatTokenCount(row.agents)}</td>
            <td class="px-3 py-2 text-right tabular-nums">{formatCompactTokenCount(row.tokens)}</td>
            <td class="px-3 py-2">{row.model.name}, {modelSourceLabels[row.source]}</td>
            <td class="px-3 py-2 text-right tabular-nums">{formatCost(row.cost)}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr class="font-bold text-slate-900 dark:text-white">
          <th scope="row" class="px-3 py-2 text-left">Total</th>
          <td class="px-3 py-2 text-right tabular-nums" data-testid="total-agents"
            >{formatTokenCount(estimate.agents)}</td
          >
          <td class="px-3 py-2 text-right tabular-nums" data-testid="total-tokens"
            >{formatCompactTokenCount(estimate.tokens)}</td
          >
          <td></td>
          <td class="px-3 py-2 text-right tabular-nums" data-testid="total-cost"
            >{formatCost(estimate.cost)}</td
          >
        </tr>
      </tfoot>
    </table>
  </div>

  <p class={bodyClasses}>
    A simplification: every token is priced as uncached input, except the output share ({config.outputPercent}%
    now). It ignores cache reads and writes, so a fan-out whose agents share the first agent’s
    cached prefix costs less than this. The checks on this page assume a 0% output share.
  </p>

  <details
    class="rounded-lg border border-slate-200 dark:border-slate-700"
    data-testid="price-table"
  >
    <summary
      class="focus-visible:outline-primary-600 cursor-pointer px-4 py-3 font-semibold text-slate-900 focus-visible:outline-2 dark:text-white"
    >
      Prices{customPrices ? ' (edited)' : ''}
    </summary>
    <div class="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
      <p class={bodyClasses}>
        Dollars per million tokens, from the site’s shared price table. Edits stay on this page and
        in a copied link.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        {#each models as model (model.id)}
          <fieldset class="grid grid-cols-2 gap-3">
            <legend class="mb-1 text-sm font-semibold text-slate-900 dark:text-white"
              >{model.name}</legend
            >
            <NumberField
              id="price-{model.id}-input"
              label="{model.name} input"
              kind="decimal"
              value={model.input}
              minimum={0}
              maximum={100_000}
              disabled={!ready}
              onChange={(input) => onPriceChange(model.id, { input })}
            />
            <NumberField
              id="price-{model.id}-output"
              label="{model.name} output"
              kind="decimal"
              value={model.output}
              minimum={0}
              maximum={100_000}
              disabled={!ready}
              onChange={(output) => onPriceChange(model.id, { output })}
            />
          </fieldset>
        {/each}
      </div>
      {#if customPrices}
        <button
          type="button"
          onclick={onResetPrices}
          class="text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2"
        >
          Reset to the shared prices
        </button>
      {/if}
      <p class={bodyClasses}>
        Model resolution: the <code class={codeClasses}>model</code> on the
        <code class={codeClasses}>agent()</code>
        call, then the agent definition’s <code class={codeClasses}>model:</code>, then
        <code class={codeClasses}>CLAUDE_CODE_SUBAGENT_MODEL</code>, then your session’s model.
      </p>
    </div>
  </details>
</div>
