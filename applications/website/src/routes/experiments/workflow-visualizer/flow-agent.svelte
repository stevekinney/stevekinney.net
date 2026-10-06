<script lang="ts">
  import { Bot } from '@lucide/svelte';

  import FlowText from './flow-text.svelte';
  import type { AgentStep, OptionValue } from './workflow-model';

  type Props = {
    step: AgentStep;
    /** True when this agent's line is the one selected in the script. */
    selected: boolean;
    onReveal: (line: number) => void;
  };

  const { step, selected, onReveal }: Props = $props();

  const options = $derived(
    (['model', 'effort', 'isolation', 'agentType', 'phase'] as const).flatMap(
      (name): { name: string; value: OptionValue }[] => {
        const value = step[name];

        return value ? [{ name, value }] : [];
      },
    ),
  );

  const schemaShape = $derived.by(() => {
    const { schema } = step;
    if (!schema) return null;
    if (!schema.readable) return schema.text;

    const names = schema.properties.map(({ name, required }) => (required ? name : `${name}?`));

    return names.length > 0 ? `{ ${names.join(', ')} }` : '{}';
  });
</script>

<button
  type="button"
  data-testid="agent-node"
  data-line={step.line}
  aria-current={selected ? 'true' : undefined}
  onclick={() => onReveal(step.line)}
  class={[
    'focus-visible:outline-primary-600 block w-full cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-slate-900',
    selected
      ? 'border-primary-500 ring-primary-500 dark:border-primary-400 dark:ring-primary-400 ring-2'
      : 'hover:border-primary-400 dark:hover:border-primary-500 border-slate-300 dark:border-slate-600',
  ]}
>
  <span class="flex items-start gap-2">
    <Bot
      aria-hidden="true"
      class="text-primary-600 dark:text-primary-400 mt-0.5 size-5 flex-none"
    />
    <span class="min-w-0 flex-1 space-y-1.5">
      <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span class="font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white">
          <span class="sr-only">Agent:</span>
          <FlowText text={step.title} />
        </span>
        <span class="text-xs text-slate-500 tabular-nums dark:text-slate-400">Line {step.line}</span
        >
      </span>
      {#if step.hasLabel && step.prompt}
        <span class="block text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
          <FlowText text={step.prompt} />
        </span>
      {/if}
      {#if options.length > 0 || schemaShape}
        <span class="flex flex-wrap gap-1.5 text-xs">
          {#each options as { name, value } (name)}
            <span
              class={[
                'inline-flex max-w-full flex-wrap items-baseline gap-1 rounded px-1.5 py-0.5 [overflow-wrap:anywhere]',
                value.dynamic
                  ? 'border border-dashed border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-200'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
              ]}
            >
              <code class="font-mono text-slate-500 dark:text-slate-400">{name}</code>
              <code class="min-w-0 font-mono [overflow-wrap:anywhere]">{value.text}</code>
              {#if value.dynamic}<span class="text-slate-500 dark:text-slate-400">at run time</span
                >{/if}
            </span>
          {/each}
          {#if schemaShape}
            <span
              class="inline-flex max-w-full flex-wrap items-baseline gap-1 rounded bg-emerald-50 px-1.5 py-0.5 [overflow-wrap:anywhere] text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
            >
              <span class="text-emerald-700 dark:text-emerald-300">returns</span>
              <code class="min-w-0 font-mono [overflow-wrap:anywhere]">{schemaShape}</code>
            </span>
          {/if}
        </span>
      {/if}
      {#if step.unreadOptions}
        <span class="block text-xs text-amber-800 dark:text-amber-300">
          Some options are set only when it runs.
        </span>
      {/if}
      {#if step.result}
        <span class="block text-xs text-slate-500 dark:text-slate-400">
          Saved as <code class="font-mono [overflow-wrap:anywhere]">{step.result}</code>
        </span>
      {/if}
    </span>
  </span>
</button>
