<script lang="ts">
  import type { Snippet } from 'svelte';

  import { formatTokens } from './budget';
  import type { TermDefinition } from './budget';
  import { sliderValue } from './budget-state';
  import { labelClasses } from './field-styles';
  import { getReady } from './ready-context';
  import ValueField from './value-field.svelte';
  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';
  import { maximumTokenCount } from './budget';

  type Props = {
    term: TermDefinition;
    value: number;
    fromReadout: boolean;
    onChange: (value: number) => void;
    /** Extra controls under the description, such as the autocompact threshold. */
    children?: Snippet;
  };

  const { term, value, fromReadout, onChange, children }: Props = $props();

  const isReady = getReady();

  const parseTerm = (text: string): number | null => {
    const parsed = parseTokenCount(text);

    return parsed !== null && parsed <= maximumTokenCount ? parsed : null;
  };
</script>

<div class="space-y-2" data-term={term.key}>
  <div class="flex items-baseline justify-between gap-3">
    <label id="{term.key}-label" for="{term.key}-text" class={labelClasses}>{term.name}</label>
    <span class="font-semibold text-slate-900 tabular-nums dark:text-white" data-term-value>
      {formatTokens(value)}
    </span>
  </div>
  <input
    id="slider-{term.key}"
    type="range"
    min="0"
    max={term.sliderMax}
    step="1000"
    value={sliderValue(term.key, value)}
    disabled={!isReady()}
    aria-labelledby="{term.key}-label"
    aria-valuetext="{formatTokens(value)} tokens"
    aria-describedby="{term.key}-description"
    oninput={(event) => onChange(Number(event.currentTarget.value))}
    class="accent-primary-600 dark:accent-primary-400 h-2 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
  />
  <ValueField
    id="{term.key}-text"
    {value}
    format={formatTokenCount}
    parse={parseTerm}
    {onChange}
    describedBy="{term.key}-description"
    invalidMessage="Enter a whole number, such as 25000, 25k, or 1.2M."
  />
  <p id="{term.key}-description" class="text-sm text-slate-600 dark:text-slate-300">
    {term.description}
  </p>
  {#if fromReadout}
    <p class="text-primary-700 dark:text-primary-300 text-sm font-semibold" data-from-readout>
      From your readout
    </p>
  {/if}
  {@render children?.()}
</div>
