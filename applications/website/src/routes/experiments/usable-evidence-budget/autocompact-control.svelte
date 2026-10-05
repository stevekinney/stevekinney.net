<script lang="ts">
  import {
    formatThresholdPercent,
    parsePercent,
    thresholdPercent,
    thresholdTokens,
  } from './autocompact';
  import { labelClasses } from './field-styles';
  import ValueField from './value-field.svelte';
  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';

  type Props = {
    capacity: number;
    margin: number;
    onThresholdTokens: (tokens: number) => void;
    onThresholdPercent: (percent: number) => void;
  };

  const { capacity, margin, onThresholdTokens, onThresholdPercent }: Props = $props();

  const parseThreshold = (text: string): number | null => {
    const parsed = parseTokenCount(text);

    return parsed !== null && parsed <= capacity ? parsed : null;
  };

  const parseThresholdPercent = (text: string): number | null => {
    const parsed = parsePercent(text);

    return parsed !== null && parsed <= 100 ? parsed : null;
  };
</script>

<fieldset class="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
  <legend class="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
    Or set it from the autocompact threshold
  </legend>
  <p class="text-sm text-slate-600 dark:text-slate-300">
    Autocompact at a number of tokens or a share of the window. The margin is whatever is left after
    it.
  </p>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <label for="autocompact-tokens" class="{labelClasses} font-normal"
        >Autocompact at (tokens)</label
      >
      <ValueField
        id="autocompact-tokens"
        value={thresholdTokens(capacity, margin)}
        format={formatTokenCount}
        parse={parseThreshold}
        onChange={onThresholdTokens}
        invalidMessage="Enter a number from 0 up to the window size, such as 900k."
      />
    </div>
    <div class="space-y-1.5">
      <label for="autocompact-percent" class="{labelClasses} font-normal">Autocompact at (%)</label>
      <ValueField
        id="autocompact-percent"
        value={thresholdPercent(capacity, margin)}
        format={formatThresholdPercent}
        parse={parseThresholdPercent}
        onChange={onThresholdPercent}
        invalidMessage="Enter a percentage from 0 to 100, such as 90."
      />
    </div>
  </div>
</fieldset>
