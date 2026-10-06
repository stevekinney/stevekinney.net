<script lang="ts">
  import { untrack } from 'svelte';

  import { formatCount, formatNumber } from './display';
  import { bodyClasses, fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { alphaOptions, plannedTasks, powerOptions } from './planner';
  import { MAX_PLANNER_VALUE } from './share-link';

  type Props = {
    sigma: number;
    delta: number;
    alpha: number;
    power: number;
    paired: boolean;
    /** Whether σ and δ come from the data, rather than from the person. */
    following: boolean;
    /** Whether the data offers numbers to follow. */
    canFollow: boolean;
    unit: string;
    ready: boolean;
    onChange: (patch: { sigma?: number; delta?: number; alpha?: number; power?: number }) => void;
    onFollow: () => void;
  };

  const {
    sigma,
    delta,
    alpha,
    power,
    paired,
    following,
    canFollow,
    unit,
    ready,
    onChange,
    onFollow,
  }: Props = $props();

  const result = $derived(plannedTasks({ sigma, delta, alpha, power, paired }));

  const SLIDER_MAX = { sigma: 100, delta: 60 };

  // The text boxes keep what's typed until it's a valid number.
  let texts = $state(
    untrack(() => ({ sigma: formatNumber(sigma, 1), delta: formatNumber(delta, 1) })),
  );
  let editing = $state<'sigma' | 'delta' | null>(null);

  $effect(() => {
    const next = { sigma: formatNumber(sigma, 1), delta: formatNumber(delta, 1) };
    untrack(() => {
      if (editing !== 'sigma') texts.sigma = next.sigma;
      if (editing !== 'delta') texts.delta = next.delta;
    });
  });

  const parse = (text: string): number | null => {
    const value = Number(text.trim());

    return text.trim() !== '' && Number.isFinite(value) && value > 0 && value <= MAX_PLANNER_VALUE
      ? value
      : null;
  };

  const fields = $derived([
    {
      key: 'sigma' as const,
      label: paired ? 'Spread of the per-task differences, σ_d' : 'Spread of tasks, σ',
      hint: paired
        ? `The standard deviation of A − B across tasks, in ${unit}.`
        : `The standard deviation of one condition’s tasks, in ${unit}.`,
      value: sigma,
    },
    {
      key: 'delta' as const,
      label: 'Smallest difference worth detecting, δ',
      hint: `In ${unit} per task. Smaller differences take many more tasks to see.`,
      value: delta,
    },
  ]);
</script>

<div class="space-y-5">
  <p class="max-w-3xl {bodyClasses}">
    How many tasks would it take to see a difference you care about? The answer grows with the
    square of the spread and shrinks with the square of the difference: halve δ and you need four
    times the tasks.
  </p>

  <div class="grid gap-5 md:grid-cols-2">
    {#each fields as field (field.key)}
      <div class="space-y-1.5">
        <label for="planner-{field.key}" class={labelClasses}>{field.label}</label>
        <div class="flex items-center gap-3">
          <input
            type="range"
            min="0.5"
            max={SLIDER_MAX[field.key]}
            step="0.5"
            disabled={!ready}
            value={Math.min(field.value, SLIDER_MAX[field.key])}
            aria-label={field.label}
            aria-valuetext="{formatNumber(field.value, 1)} {unit}"
            oninput={(event) => onChange({ [field.key]: Number(event.currentTarget.value) })}
            class="accent-primary-600 dark:accent-primary-400 h-2 min-w-0 flex-1 cursor-pointer"
          />
          <input
            id="planner-{field.key}"
            type="text"
            inputmode="decimal"
            disabled={!ready}
            value={texts[field.key]}
            aria-invalid={parse(texts[field.key]) === null || undefined}
            aria-describedby="planner-{field.key}-hint"
            onfocus={() => (editing = field.key)}
            onblur={() => {
              editing = null;
              texts[field.key] = formatNumber(field.value, 1);
            }}
            oninput={(event) => {
              texts[field.key] = event.currentTarget.value;
              const parsed = parse(texts[field.key]);
              if (parsed !== null) onChange({ [field.key]: parsed });
            }}
            class="{fieldClasses} w-24 flex-none text-right"
          />
        </div>
        <p id="planner-{field.key}-hint" class={hintClasses}>{field.hint}</p>
      </div>
    {/each}

    <div class="space-y-1.5">
      <label for="planner-alpha" class={labelClasses}>α, the false-alarm rate</label>
      <select
        id="planner-alpha"
        disabled={!ready}
        value={String(alpha)}
        onchange={(event) => onChange({ alpha: Number(event.currentTarget.value) })}
        class="{fieldClasses} w-full"
      >
        {#each alphaOptions as option (option)}
          <option value={String(option)}
            >{option} ({formatNumber(100 - option * 100, 0)}% interval)</option
          >
        {/each}
      </select>
    </div>
    <div class="space-y-1.5">
      <label for="planner-power" class={labelClasses}>Power, the chance of seeing a real δ</label>
      <select
        id="planner-power"
        disabled={!ready}
        value={String(power)}
        onchange={(event) => onChange({ power: Number(event.currentTarget.value) })}
        class="{fieldClasses} w-full"
      >
        {#each powerOptions as option (option)}
          <option value={String(option)}>{formatNumber(option * 100, 0)}%</option>
        {/each}
      </select>
    </div>
  </div>

  <p
    class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
    aria-live="polite"
    data-testid="planner-readout"
  >
    {#if result}
      ≈ {formatCount(result.tasks)}
      {paired ? 'tasks, each run both ways' : 'tasks per condition'}
    {:else}
      Set a spread and a difference above zero.
    {/if}
  </p>
  {#if result}
    <p class={hintClasses} data-testid="planner-formula">
      {paired
        ? `(z₁₋α/₂ + z_power)² × σ_d² / δ² = ${formatNumber(result.exact, 2)}, rounded up.`
        : `2 × (z₁₋α/₂ + z_power)² × σ² / δ² = ${formatNumber(result.exact, 2)}, rounded up.`}
    </p>
  {/if}

  <p class={hintClasses}>
    {#if following}
      σ and δ come from your data: its spread and the difference it showed.
    {:else if canFollow}
      <button
        type="button"
        disabled={!ready}
        onclick={onFollow}
        class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer font-semibold underline underline-offset-2 focus-visible:outline-2"
      >
        Use the spread and difference from my data
      </button>
    {:else}
      Your data doesn’t have a comparison of {unit} to take numbers from, so these are yours.
    {/if}
  </p>
</div>
