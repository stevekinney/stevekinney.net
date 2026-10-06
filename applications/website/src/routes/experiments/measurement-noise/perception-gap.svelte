<script lang="ts">
  import { untrack } from 'svelte';

  import { scale } from './chart-scale';
  import { formatNumber } from './display';
  import { bodyClasses, fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { MAX_FELT } from './share-link';

  type Props = {
    /** Your data's speedup of B over A, in percent, with its interval; null without a time comparison. */
    measured: { percent: number; lower: number; upper: number } | null;
    felt: number | null;
    ready: boolean;
    onFelt: (felt: number | null) => void;
  };

  const { measured, felt, ready, onFelt }: Props = $props();

  const LIMIT = 30;
  const HEIGHT = 190;
  const METR_Y = 62;
  const YOURS_Y = 146;
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  const width = $derived(Math.max(260, measuredWidth || UNMEASURED_WIDTH));
  const margin = 26;
  const x = $derived(scale(-LIMIT, LIMIT, margin, width - margin));
  const clamp = (value: number): number => Math.max(-LIMIT, Math.min(LIMIT, value));

  /** From METR's July 2025 study. Positive is faster with AI. */
  const metr = [
    { id: 'forecast', value: 24, label: 'Forecast +24%', above: true },
    { id: 'measured', value: -19, label: 'Measured −19%', above: true },
    { id: 'after', value: 20, label: 'Felt after +20%', above: false },
  ];

  const signed = (value: number): string => `${value > 0 ? '+' : ''}${formatNumber(value, 1)}%`;

  const anchor = (value: number): 'start' | 'middle' | 'end' =>
    x(clamp(value)) < margin + 44
      ? 'start'
      : x(clamp(value)) > width - margin - 44
        ? 'end'
        : 'middle';

  let text = $state(untrack(() => (felt === null ? '' : String(felt))));
  let editing = $state(false);

  $effect(() => {
    const next = felt === null ? '' : String(felt);
    untrack(() => {
      if (!editing) text = next;
    });
  });

  const parse = (value: string): number | null | undefined => {
    const trimmed = value.trim().replace(/%$/, '').replace(/^\+/, '').replace(/^−/, '-');
    if (trimmed === '') return null;
    const number = Number(trimmed);

    return Number.isFinite(number) && Math.abs(number) <= MAX_FELT ? number : undefined;
  };

  const invalid = $derived(parse(text) === undefined);
</script>

<div class="space-y-4">
  <p class="max-w-3xl {bodyClasses}">
    In <a
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
      href="https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/"
      >METR’s randomized trial</a
    >, published in July 2025, 16 experienced open-source maintainers worked 246 real issues. Before
    starting, they forecast that AI tools would speed them up by 24%. Measured, they took 19%
    longer. Afterward, they still estimated they’d been 20% faster.
  </p>
  <p class="max-w-3xl {bodyClasses}">
    METR has since <a
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
      href="https://metr.org/blog/2026-02-24-uplift-update/"
      >revised its numbers and changed its study design</a
    > (February 2026): developers had started refusing to work without AI, which skewed who and what got
    measured, and METR now calls its newer data only very weak evidence either way. So don’t read this
    as “AI makes you slower.” The lesson that survives is narrower: the perception error kept its sign
    even after the work was done.
  </p>

  <div bind:clientWidth={measuredWidth} data-testid="perception-chart">
    <svg
      {width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      aria-hidden="true"
      class="block max-w-full"
    >
      {#each [-30, -20, -10, 0, 10, 20, 30] as tick (tick)}
        <line
          x1={x(tick)}
          x2={x(tick)}
          y1={20}
          y2={HEIGHT - 20}
          stroke-width={tick === 0 ? 2 : 1}
          stroke-dasharray={tick === 0 ? '3 3' : undefined}
          class={tick === 0
            ? 'stroke-slate-500 dark:stroke-slate-400'
            : 'stroke-slate-200 dark:stroke-slate-700'}
        />
        <text
          x={x(tick)}
          y={HEIGHT - 4}
          text-anchor="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {tick > 0 ? `+${tick}` : tick === 0 ? '0' : `−${-tick}`}%
        </text>
      {/each}
      <text x={margin} y={12} class="fill-slate-600 text-[11px] dark:fill-slate-300">← slower</text>
      <text
        x={width - margin}
        y={12}
        text-anchor="end"
        class="fill-slate-600 text-[11px] dark:fill-slate-300">faster →</text
      >

      <line
        x1={margin}
        x2={width - margin}
        y1={METR_Y}
        y2={METR_Y}
        class="stroke-slate-300 dark:stroke-slate-600"
      />
      {#each metr as marker (marker.id)}
        {#if marker.id === 'measured'}
          <circle
            cx={x(marker.value)}
            cy={METR_Y}
            r="7"
            class="fill-rose-600 stroke-white dark:fill-rose-400 dark:stroke-slate-900"
            stroke-width="2"
          />
        {:else}
          <rect
            x={x(marker.value) - 6}
            y={METR_Y - 6}
            width="12"
            height="12"
            transform="rotate(45 {x(marker.value)} {METR_Y})"
            class="fill-white stroke-slate-700 dark:fill-slate-900 dark:stroke-slate-200"
            stroke-width="2"
          />
        {/if}
        <text
          x={x(marker.value)}
          y={marker.above ? METR_Y - 14 : METR_Y + 22}
          text-anchor={anchor(marker.value)}
          class="fill-slate-800 text-[11px] font-semibold dark:fill-slate-100"
        >
          {marker.label}
        </text>
      {/each}
      <text x={margin} y={METR_Y + 40} class="fill-slate-500 text-[10px] dark:fill-slate-400"
        >METR, 2025</text
      >

      <line
        x1={margin}
        x2={width - margin}
        y1={YOURS_Y}
        y2={YOURS_Y}
        class="stroke-slate-300 dark:stroke-slate-600"
      />
      <text x={margin} y={YOURS_Y - 26} class="fill-slate-500 text-[10px] dark:fill-slate-400"
        >Yours</text
      >
      {#if measured}
        <line
          x1={x(clamp(measured.lower))}
          x2={x(clamp(measured.upper))}
          y1={YOURS_Y}
          y2={YOURS_Y}
          stroke-width="6"
          stroke-linecap="round"
          class="stroke-primary-300 dark:stroke-primary-700"
        />
        <circle
          cx={x(clamp(measured.percent))}
          cy={YOURS_Y}
          r="7"
          class="fill-primary-600 dark:fill-primary-400 stroke-white dark:stroke-slate-900"
          stroke-width="2"
        />
        <text
          x={x(clamp(measured.percent))}
          y={YOURS_Y + 22}
          text-anchor={anchor(measured.percent)}
          class="fill-slate-800 text-[11px] font-semibold dark:fill-slate-100"
        >
          Measured {signed(measured.percent)}{Math.abs(measured.percent) > LIMIT
            ? ' (off the scale)'
            : ''}
        </text>
      {/if}
      {#if felt !== null}
        <rect
          x={x(clamp(felt)) - 6}
          y={YOURS_Y - 6}
          width="12"
          height="12"
          transform="rotate(45 {x(clamp(felt))} {YOURS_Y})"
          class="fill-white stroke-slate-700 dark:fill-slate-900 dark:stroke-slate-200"
          stroke-width="2"
        />
        <text
          x={x(clamp(felt))}
          y={YOURS_Y - 12}
          text-anchor={anchor(felt)}
          class="fill-slate-800 text-[11px] font-semibold dark:fill-slate-100"
        >
          Felt {signed(felt)}{Math.abs(felt) > LIMIT ? ' (off the scale)' : ''}
        </text>
      {/if}
    </svg>
  </div>

  <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200" data-testid="perception-list">
    <li>METR forecast before the work: +24% (faster).</li>
    <li>METR measured: −19% (19% longer per issue).</li>
    <li>METR participants’ estimate afterward: +20% (faster).</li>
    <li>
      Your data:
      {#if measured}
        {signed(measured.percent)}, with a 95% interval of {signed(measured.lower)} to {signed(
          measured.upper,
        )}
        (B’s speed against A’s mean time).
      {:else}
        no time comparison yet.
      {/if}
    </li>
    <li>What you felt: {felt === null ? 'not entered yet.' : `${signed(felt)}.`}</li>
  </ul>

  <div class="max-w-sm space-y-1.5">
    <label for="felt-speedup" class={labelClasses}>How much faster did B feel? (%)</label>
    <input
      id="felt-speedup"
      type="text"
      inputmode="decimal"
      disabled={!ready}
      value={text}
      placeholder="such as 25, or −10 if it felt slower"
      aria-invalid={invalid || undefined}
      aria-describedby="felt-speedup-hint"
      onfocus={() => (editing = true)}
      onblur={() => (editing = false)}
      oninput={(event) => {
        text = event.currentTarget.value;
        const parsed = parse(text);
        if (parsed !== undefined) onFelt(parsed);
      }}
      class="{fieldClasses} w-full"
    />
    <p id="felt-speedup-hint" class={hintClasses}>
      Write it down before you look at your measured number, then compare them.
    </p>
  </div>
</div>
