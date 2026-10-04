<script lang="ts">
  import { capacityDescription, capacityName, capacityOptions, maximumTokenCount } from './budget';
  import { fieldClasses, labelClasses } from './field-styles';
  import { getReady } from './ready-context';
  import ValueField from './value-field.svelte';
  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';

  type Props = {
    capacity: number;
    custom: boolean;
    fromReadout: boolean;
    onChoose: (choice: number | 'custom') => void;
    onCustomChange: (capacity: number) => void;
  };

  const { capacity, custom, fromReadout, onChoose, onCustomChange }: Props = $props();

  const isReady = getReady();

  const selected = $derived(custom ? 'custom' : String(capacity));

  const parseCapacity = (text: string): number | null => {
    const parsed = parseTokenCount(text);

    return parsed !== null && parsed >= 1 && parsed <= maximumTokenCount ? parsed : null;
  };
</script>

<div class="space-y-2" data-term="capacity">
  <label for="capacity-select" class={labelClasses}>{capacityName}</label>
  <select
    id="capacity-select"
    value={selected}
    disabled={!isReady()}
    aria-describedby="capacity-description"
    onchange={(event) => {
      const choice = event.currentTarget.value;
      onChoose(choice === 'custom' ? 'custom' : Number(choice));
    }}
    class="{fieldClasses} cursor-pointer"
  >
    {#each capacityOptions as option (option.value)}
      <option value={String(option.value)}>{option.label}</option>
    {/each}
    <option value="custom">Custom…</option>
  </select>
  {#if custom}
    <div class="space-y-1.5">
      <label for="capacity-custom" class={labelClasses}>Custom capacity</label>
      <ValueField
        id="capacity-custom"
        value={capacity}
        format={formatTokenCount}
        parse={parseCapacity}
        onChange={onCustomChange}
        describedBy="capacity-description"
        invalidMessage="Enter a window size above zero, such as 400k or 2M."
      />
    </div>
  {/if}
  <p id="capacity-description" class="text-sm text-slate-600 dark:text-slate-300">
    {capacityDescription}
  </p>
  {#if fromReadout}
    <p class="text-primary-700 dark:text-primary-300 text-sm font-semibold" data-from-readout>
      From your readout
    </p>
  {/if}
</div>
