<script lang="ts">
  import { Play } from '@lucide/svelte';

  import FlowSteps from './flow-steps.svelte';
  import type { WorkflowDiagram } from './workflow-model';

  type Props = {
    diagram: WorkflowDiagram;
    selectedLine: number | null;
    onReveal: (line: number) => void;
  };

  const { diagram, selectedLine, onReveal }: Props = $props();
</script>

<div class="space-y-0">
  <div
    data-testid="workflow-start"
    class="rounded-lg border-2 border-slate-700 bg-white p-3 dark:border-slate-300 dark:bg-slate-900"
  >
    <p
      class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
    >
      <Play aria-hidden="true" class="size-3.5 flex-none" />
      Workflow
    </p>
    {#if diagram.header}
      <p
        class="mt-1 font-mono font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
      >
        {diagram.header.name}
      </p>
      {#if diagram.header.title}
        <p class="font-semibold [overflow-wrap:anywhere] text-slate-800 dark:text-slate-100">
          {diagram.header.title}
        </p>
      {/if}
      <p class="mt-1 text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
        {diagram.header.description}
      </p>
      {#if diagram.header.whenToUse}
        <p class="mt-1 text-xs [overflow-wrap:anywhere] text-slate-500 dark:text-slate-400">
          <span class="font-semibold">When to use it:</span>
          {diagram.header.whenToUse}
        </p>
      {/if}
    {:else}
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Its <code class="font-mono text-[0.9em]">meta</code> block doesn’t read, so Claude Code won’t
        list it. The checks say why.
      </p>
    {/if}
  </div>

  <svg
    aria-hidden="true"
    viewBox="0 0 12 18"
    class="mx-auto block h-[18px] w-3 text-slate-400 dark:text-slate-500"
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

  <FlowSteps
    steps={diagram.steps}
    {selectedLine}
    {onReveal}
    empty="The script doesn’t do anything yet. Add an agent() call to see it here."
  />
</div>
