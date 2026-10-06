<script lang="ts">
  import type { WorkflowSummary } from './workflow-model';

  type Props = {
    summary: WorkflowSummary;
    /** True while the counts describe the last version that parsed, not the current one. */
    stale: boolean;
  };

  const { summary, stale }: Props = $props();

  const plural = (count: number, noun: string): string =>
    `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;

  const tile =
    'min-w-0 space-y-1 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900';
  const term = 'text-sm text-slate-600 dark:text-slate-300';
  const value = 'text-2xl font-bold text-slate-900 tabular-nums dark:text-white';
  const note = 'text-xs text-slate-500 dark:text-slate-400';
</script>

<dl
  data-testid="summary"
  class={[
    'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5',
    stale ? 'opacity-60' : 'opacity-100',
  ]}
>
  <div class={tile}>
    <dt class={term}>Agent calls</dt>
    <dd class={value} data-testid="summary-agents">{summary.agentCalls.toLocaleString('en-US')}</dd>
    <dd class={note}>
      <code class="font-mono">agent()</code> call sites. A loop or fan-out runs one many times.
    </dd>
  </div>
  <div class={tile}>
    <dt class={term}>Fan-outs</dt>
    <dd class={value} data-testid="summary-fan-outs">{summary.fanOuts.toLocaleString('en-US')}</dd>
    <dd class={note}>How many items each one runs is known only when it runs.</dd>
  </div>
  <div class={tile}>
    <dt class={term}>Phases</dt>
    <dd class={value}>{summary.phases.toLocaleString('en-US')}</dd>
    <dd class={note}>Progress groups in Claude Code.</dd>
  </div>
  <div class={tile}>
    <dt class={term}>Models named</dt>
    <dd class="flex flex-wrap gap-x-2 gap-y-1 text-sm font-semibold text-slate-900 dark:text-white">
      {#each summary.models as model (model)}
        <code class="font-mono [overflow-wrap:anywhere]">{model}</code>
      {:else}
        <span>None</span>
      {/each}
    </dd>
    <dd class={note}>{plural(summary.sessionModelAgents, 'call')} on the session’s model.</dd>
  </div>
  <div class={tile}>
    <dt class={term}>Unreadable options</dt>
    <dd class={value} data-testid="summary-unread">
      {summary.unreadOptions.toLocaleString('en-US')}
    </dd>
    <dd class={note}>
      Calls whose options are set only when it runs, so the diagram can’t show them.
    </dd>
  </div>
</dl>
