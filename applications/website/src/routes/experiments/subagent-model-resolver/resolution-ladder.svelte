<script lang="ts">
  import { Check, Info, X } from '@lucide/svelte';

  import InlineCode from './inline-code.svelte';
  import type { ResolutionStep } from './resolve';

  type Props = { steps: ResolutionStep[] };

  const { steps }: Props = $props();

  const spokenLabels = {
    win: 'Decided: ',
    dead: 'Ignored: ',
    skip: 'Not applicable: ',
    info: 'Note: ',
  } as const;
</script>

<ol data-testid="resolution-ladder" class="space-y-2">
  {#each steps as step, index (index)}
    <li
      data-step={step.state}
      class="flex items-start gap-3 rounded-md px-3 py-2 {step.state === 'win'
        ? 'bg-primary-50 dark:bg-primary-950/40 font-bold text-slate-900 dark:text-white'
        : step.state === 'dead'
          ? 'text-slate-500 line-through dark:text-slate-400'
          : 'text-slate-500 dark:text-slate-400'}"
    >
      <span aria-hidden="true" class="mt-0.5 flex size-5 flex-none items-center justify-center">
        {#if step.state === 'win'}
          <Check class="text-primary-700 dark:text-primary-300 size-5" strokeWidth={3} />
        {:else if step.state === 'dead'}
          <X class="size-4" />
        {:else if step.state === 'info'}
          <Info class="size-4" />
        {:else}
          <span class="text-xl leading-none">·</span>
        {/if}
      </span>
      <span class="min-w-0">
        <span class="sr-only">{spokenLabels[step.state]}</span>
        <InlineCode text={step.text} />
      </span>
    </li>
  {/each}
</ol>
