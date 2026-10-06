<script lang="ts">
  import {
    ArrowDown,
    ArrowRight,
    Braces,
    Flag,
    GitFork,
    Layers,
    MessageSquareText,
    Repeat,
    Rows3,
    ShieldAlert,
    Split,
    SquareFunction,
    Workflow,
  } from '@lucide/svelte';

  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import FlowAgent from './flow-agent.svelte';
  import FlowSteps from './flow-steps.svelte';
  import FlowText from './flow-text.svelte';
  import type { BranchArm, Step } from './workflow-model';

  type Props = {
    steps: readonly Step[];
    /** The script line selected from the diagram, so its agents stand out. */
    selectedLine: number | null;
    onReveal: (line: number) => void;
    /** What to say when a branch, stage, or block has nothing in it. */
    empty?: string;
  };

  const { steps, selectedLine, onReveal, empty = 'Nothing runs here.' }: Props = $props();

  const armTitle = (arm: BranchArm): string => {
    switch (arm.kind) {
      case 'if':
        return 'If';
      case 'else if':
        return 'Else if';
      case 'else':
        return 'Else';
      case 'case':
        return 'Case';
      case 'default':
        return 'Default';
    }
  };

  const plural = (count: number, noun: string, nouns = `${noun}s`): string =>
    `${count.toLocaleString('en-US')} ${count === 1 ? noun : nouns}`;

  const lineRange = (start: number, end: number): string =>
    start === end ? `Line ${start}` : `Lines ${start}–${end}`;

  const box = 'rounded-lg border p-3 dark:bg-slate-950/40';
  const heading = 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm';
  const lineText = 'text-xs font-normal text-slate-500 tabular-nums dark:text-slate-400';
  const inlineCode = 'font-mono text-[0.9em] [overflow-wrap:anywhere]';
</script>

{#if steps.length === 0}
  <p class="text-sm text-slate-500 italic dark:text-slate-400">{empty}</p>
{:else}
  <ol class="flex min-w-0 flex-col">
    {#each steps as step, index (step.id)}
      <li class="flex min-w-0 flex-col">
        {#if index > 0}
          <svg
            aria-hidden="true"
            viewBox="0 0 12 18"
            class="mx-auto h-[18px] w-3 flex-none text-slate-400 dark:text-slate-500"
          >
            <path
              d="M6 1v15M2.5 12.5 6 16l3.5-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}

        {#if step.kind === 'agent'}
          <FlowAgent {step} selected={selectedLine === step.line} {onReveal} />
        {:else if step.kind === 'phase'}
          <section
            data-testid="phase"
            aria-labelledby="{step.id}-title"
            class="border-primary-300 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/20 space-y-3 rounded-xl border-2 border-dashed p-3"
          >
            <header class="space-y-0.5">
              <p class="{heading} text-primary-800 dark:text-primary-200">
                <span class="text-xs font-semibold tracking-wide uppercase">Phase</span>
                <span class={lineText}>Line {step.line}</span>
              </p>
              <h3
                id="{step.id}-title"
                class="text-lg font-bold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
              >
                {#if step.dynamic}<code class={inlineCode}>{step.title}</code
                  >{:else}{step.title}{/if}
              </h3>
              {#if step.detail}
                <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
                  {step.detail}
                </p>
              {/if}
            </header>
            <FlowSteps
              steps={step.steps}
              {selectedLine}
              {onReveal}
              empty="Nothing runs in this phase."
            />
          </section>
        {:else if step.kind === 'parallel'}
          <div class="{box} @container space-y-3 border-sky-300 dark:border-sky-800">
            <p class={heading}>
              <span class="flex items-center gap-1.5 font-semibold text-sky-900 dark:text-sky-200">
                <GitFork aria-hidden="true" class="size-4 flex-none" />
                {step.via === 'parallel'
                  ? `Run ${plural(step.branches.length, 'branch', 'branches')} at once, then wait for all`
                  : `Wait for ${plural(step.branches.length, 'promise')} started together`}
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            {#if step.result}
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Results saved as <code class={inlineCode}>{step.result}</code>, in order
              </p>
            {/if}
            <ul class="grid gap-3 @lg:grid-cols-2">
              {#each step.branches as branch, branchIndex (branch.id)}
                <li
                  class="min-w-0 space-y-2 rounded-md border border-sky-200 bg-sky-50/50 p-2 dark:border-sky-900 dark:bg-sky-950/20"
                >
                  <p class="text-xs font-semibold text-sky-900 dark:text-sky-200">
                    Branch {branchIndex + 1}
                  </p>
                  <FlowSteps steps={branch.steps} {selectedLine} {onReveal} />
                </li>
              {/each}
            </ul>
          </div>
        {:else if step.kind === 'fan-out'}
          <div data-testid="fan-out" class="relative mr-2 mb-2">
            <div
              aria-hidden="true"
              class="absolute inset-0 translate-x-2 translate-y-2 rounded-lg border border-violet-200 bg-white dark:border-violet-900 dark:bg-slate-900"
            ></div>
            <div
              aria-hidden="true"
              class="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-violet-300 bg-white dark:border-violet-800 dark:bg-slate-900"
            ></div>
            <div
              class="relative space-y-3 rounded-lg border border-violet-400 bg-white p-3 dark:border-violet-700 dark:bg-slate-900"
            >
              <p class={heading}>
                <span
                  class="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-violet-900 dark:text-violet-200"
                >
                  <Layers aria-hidden="true" class="size-4 flex-none" />
                  <span class="min-w-0 [overflow-wrap:anywhere]">
                    × each item in <code class={inlineCode}>{step.over || '…'}</code>
                  </span>
                </span>
                <span class={lineText}>Line {step.line}</span>
              </p>
              <p class="text-xs text-slate-600 dark:text-slate-300">
                {step.via === 'parallel'
                  ? 'One copy per item, all at once, then it waits for every one. How many is known only when it runs, and an item that throws comes back as '
                  : 'One copy per item, all started together. How many is known only when it runs. '}
                {#if step.via === 'parallel'}<code class={inlineCode}>null</code>.{/if}
                {#if step.result}
                  Saved as <code class={inlineCode}>{step.result}</code>.
                {/if}
              </p>
              {#if step.item}
                <p class="text-xs font-semibold text-violet-900 dark:text-violet-200">
                  For each <code class={inlineCode}>{step.item}</code>
                </p>
              {/if}
              <FlowSteps
                steps={step.branch}
                {selectedLine}
                {onReveal}
                empty="The work for each item is built elsewhere in the script."
              />
            </div>
          </div>
        {:else if step.kind === 'pipeline'}
          <div
            data-testid="pipeline"
            class="{box} @container space-y-3 border-teal-300 dark:border-teal-800"
          >
            <p class={heading}>
              <span
                class="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-teal-900 dark:text-teal-200"
              >
                <Rows3 aria-hidden="true" class="size-4 flex-none" />
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  Each item in <code class={inlineCode}>{step.over || '…'}</code>, no barrier
                  between stages
                </span>
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-300">
              An item moves to the next stage as soon as it’s through this one. A stage that throws
              drops that item to <code class={inlineCode}>null</code>.
              {#if step.result}
                Saved as <code class={inlineCode}>{step.result}</code>.
              {/if}
            </p>
            <ol class="flex flex-col gap-2 @lg:flex-row @lg:flex-wrap">
              {#each step.stages as stage, stageIndex (stage.id)}
                <li class="flex min-w-0 flex-col gap-2 @lg:min-w-52 @lg:flex-1 @lg:flex-row">
                  {#if stageIndex > 0}
                    <ArrowDown
                      aria-hidden="true"
                      class="mx-auto size-4 flex-none text-teal-600 @lg:hidden dark:text-teal-400"
                    />
                    <ArrowRight
                      aria-hidden="true"
                      class="hidden size-4 flex-none self-center text-teal-600 @lg:block dark:text-teal-400"
                    />
                  {/if}
                  <div
                    class="min-w-0 flex-1 space-y-2 rounded-md border border-teal-200 bg-teal-50/50 p-2 dark:border-teal-900 dark:bg-teal-950/20"
                  >
                    <p
                      class="text-xs font-semibold [overflow-wrap:anywhere] text-teal-900 dark:text-teal-200"
                    >
                      Stage {stageIndex + 1}
                      <code class="{inlineCode} font-normal">{stage.parameters}</code>
                    </p>
                    <FlowSteps
                      steps={stage.steps}
                      {selectedLine}
                      {onReveal}
                      empty="Plain code, no agents."
                    />
                  </div>
                </li>
              {/each}
            </ol>
          </div>
        {:else if step.kind === 'branch'}
          <div class="{box} @container space-y-3 border-amber-300 dark:border-amber-800">
            <p class={heading}>
              <span
                class="flex min-w-0 items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200"
              >
                <Split aria-hidden="true" class="size-4 flex-none" />
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  {#if step.subject}
                    Switch on <code class={inlineCode}>{step.subject}</code>
                  {:else}
                    Branch
                  {/if}
                </span>
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            <ul class="grid gap-3 @lg:grid-cols-2">
              {#each step.arms as arm (arm.id)}
                <li
                  class="min-w-0 space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900 dark:bg-amber-950/20"
                >
                  <p
                    class="text-xs font-semibold [overflow-wrap:anywhere] text-amber-900 dark:text-amber-200"
                  >
                    {armTitle(arm)}
                    {#if arm.test}<code class="{inlineCode} font-normal">{arm.test}</code>{/if}
                  </p>
                  <FlowSteps steps={arm.steps} {selectedLine} {onReveal} />
                </li>
              {/each}
            </ul>
            {#if !step.arms.some((arm) => arm.kind === 'else' || arm.kind === 'default')}
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Otherwise, it carries on below.
              </p>
            {/if}
          </div>
        {:else if step.kind === 'loop'}
          <div class="{box} space-y-3 border-orange-300 dark:border-orange-800">
            <p class={heading}>
              <span
                class="flex min-w-0 items-center gap-1.5 font-semibold text-orange-900 dark:text-orange-200"
              >
                <Repeat aria-hidden="true" class="size-4 flex-none" />
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  Repeat <code class="{inlineCode} font-normal">{step.header}</code>
                </span>
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            <FlowSteps steps={step.steps} {selectedLine} {onReveal} />
          </div>
        {:else if step.kind === 'try'}
          <div class="{box} space-y-3 border-rose-300 dark:border-rose-800">
            <p class={heading}>
              <span
                class="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-200"
              >
                <ShieldAlert aria-hidden="true" class="size-4 flex-none" />
                Try
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            <FlowSteps steps={step.steps} {selectedLine} {onReveal} />
            {#if step.handler}
              <p class="text-xs font-semibold text-rose-900 dark:text-rose-200">
                If it throws{#if step.handler.parameter}
                  (<code class="{inlineCode} font-normal">{step.handler.parameter}</code>){/if}
              </p>
              <FlowSteps steps={step.handler.steps} {selectedLine} {onReveal} />
            {/if}
            {#if step.finalizer}
              <p class="text-xs font-semibold text-rose-900 dark:text-rose-200">Finally</p>
              <FlowSteps steps={step.finalizer} {selectedLine} {onReveal} />
            {/if}
          </div>
        {:else if step.kind === 'helper'}
          <div
            data-testid="helper"
            class="{box} space-y-3 border-dashed border-slate-400 dark:border-slate-500"
          >
            <p class={heading}>
              <span
                class="flex min-w-0 items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100"
              >
                <SquareFunction aria-hidden="true" class="size-4 flex-none" />
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  Calls <code class={inlineCode}>{step.name}()</code>
                </span>
              </span>
              <span class={lineText}>Line {step.line}, defined on line {step.definedOn}</span>
            </p>
            {#if step.result}
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Saved as <code class={inlineCode}>{step.result}</code>
              </p>
            {/if}
            {#if step.status === 'recursive'}
              <p class="text-sm text-slate-600 dark:text-slate-300">
                It calls itself here. Its steps are shown once, above.
              </p>
            {:else if step.status === 'limit'}
              <p class="text-sm text-slate-600 dark:text-slate-300">
                Not expanded: the diagram has already drawn as many helper calls as it will.
              </p>
            {:else}
              <FlowSteps steps={step.steps} {selectedLine} {onReveal} />
            {/if}
          </div>
        {:else if step.kind === 'workflow'}
          <div class="{box} border-indigo-300 dark:border-indigo-800">
            <p class={heading}>
              <span
                class="flex min-w-0 items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-200"
              >
                <Workflow aria-hidden="true" class="size-4 flex-none" />
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  Runs the workflow <code class={inlineCode}>{step.reference}</code>
                </span>
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Its own agents run inside this one, one level deep.
              {#if step.result}
                Saved as <code class={inlineCode}>{step.result}</code>.
              {/if}
            </p>
          </div>
        {:else if step.kind === 'log'}
          <p
            class="flex items-start gap-1.5 px-1 text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
          >
            <MessageSquareText aria-hidden="true" class="mt-0.5 size-4 flex-none" />
            <span class="min-w-0 flex-1">
              <span class="font-semibold">Log:</span>
              <FlowText text={step.message} />
            </span>
            <span class={lineText}>Line {step.line}</span>
          </p>
        {:else if step.kind === 'return'}
          <div
            class="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-950/40"
          >
            <p class={heading}>
              <span
                class="flex min-w-0 items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200"
              >
                <Flag aria-hidden="true" class="size-4 flex-none" />
                Returns
              </span>
              <span class={lineText}>Line {step.line}</span>
            </p>
            {#if step.expression}
              <code
                class="mt-1 block font-mono text-sm [overflow-wrap:anywhere] text-emerald-950 dark:text-emerald-100"
                >{step.expression}</code
              >
            {:else}
              <p class="mt-1 text-sm text-emerald-900 dark:text-emerald-200">Nothing.</p>
            {/if}
          </div>
        {:else if step.kind === 'code'}
          <div
            data-testid="code-step"
            class={[
              'rounded-md px-2 py-1.5 text-xs',
              step.muted
                ? 'bg-slate-100/70 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
                : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
            ]}
          >
            <p class="flex flex-wrap items-baseline justify-between gap-x-3">
              <span class="flex items-center gap-1.5 font-semibold">
                <Braces aria-hidden="true" class="size-3.5 flex-none" />
                Code
              </span>
              <span class="tabular-nums">{lineRange(step.line, step.endLine)}</span>
            </p>
            <ul class="mt-1 space-y-0.5">
              {#each step.statements.slice(0, 3) as statement, statementIndex (statementIndex)}
                <li><code class={inlineCode}>{statement}</code></li>
              {/each}
              {#if step.statements.length > 3}
                <li>and {plural(step.statements.length - 3, 'more statement')}</li>
              {/if}
            </ul>
            {#if step.note}
              <p class="mt-1 text-sm [overflow-wrap:anywhere] text-amber-800 dark:text-amber-300">
                <CodeText text={step.note} />
              </p>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
