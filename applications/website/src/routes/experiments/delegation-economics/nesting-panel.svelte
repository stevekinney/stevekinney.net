<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';

  import { bodyClasses, fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { CONCURRENCY_LIMIT, DEFAULT_LAYER_LIMIT, nesting, nestingRanges } from './nesting';

  type Props = {
    perNode: number;
    layers: number;
    onChange: (patch: { perNode?: number; layers?: number }) => void;
  };

  const { perNode, layers, onChange }: Props = $props();

  const result = $derived(nesting(perNode, layers));

  const read = (text: string, fallback: number): number => {
    const value = Number(text);

    return Number.isFinite(value) && text.trim() !== '' ? value : fallback;
  };
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-4">
    <div class="space-y-1.5">
      <label for="nesting-children" class={labelClasses}>Children per node</label>
      <input
        id="nesting-children"
        type="number"
        min={nestingRanges.children.min}
        max={nestingRanges.children.max}
        step="1"
        value={perNode}
        oninput={(event) => onChange({ perNode: read(event.currentTarget.value, perNode) })}
        class="{fieldClasses} w-28"
      />
    </div>
    <div class="space-y-1.5">
      <label for="nesting-layers" class={labelClasses}>Layers</label>
      <input
        id="nesting-layers"
        type="number"
        min={nestingRanges.layers.min}
        max={nestingRanges.layers.max}
        step="1"
        value={layers}
        oninput={(event) => onChange({ layers: read(event.currentTarget.value, layers) })}
        class="{fieldClasses} w-28"
      />
    </div>
  </div>

  <p class="text-lg text-slate-900 tabular-nums dark:text-white" data-testid="nesting-total">
    {result.perLayer.join(' + ')} =
    <strong>{result.total} {result.total === 1 ? 'worker' : 'workers'}</strong>
  </p>
  <p class={bodyClasses}>
    {#if result.overLimit > 0}
      Claude Code runs at most {CONCURRENCY_LIMIT} subagents at once, so {result.overLimit} of them wait
      their turn, and every one still pays its spawn overhead.
    {:else}
      That fits under the limit of {CONCURRENCY_LIMIT} subagents running at once.
    {/if}
  </p>
  {#if result.deeperThanDefault}
    <p class="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
      <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
      <span>
        Warning: subagents nest {DEFAULT_LAYER_LIMIT} layers deep by default, so this tree is deeper than
        Claude Code allows without changing that limit.
      </span>
    </p>
  {/if}
  <p class={bodyClasses}>
    This is how a runaway happens. In
    <a
      href="https://github.com/anthropics/claude-code/issues/76970"
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
      >one reported case</a
    >, a teammate with no <code>tools</code> or <code>model</code> restriction inherited the ability to
    spawn more agents, on Opus, and recursed. It burned about 77% of a five-hour limit in under an hour.
    Give every role an explicit tools list and model, and leave out the Agent tool for workers that shouldn’t
    delegate.
  </p>
  <p class={hintClasses}>
    Source for the {CONCURRENCY_LIMIT}-at-once and {DEFAULT_LAYER_LIMIT}-layer limits, the 84-worker
    example, and the runaway: the course outline.
  </p>
</div>
