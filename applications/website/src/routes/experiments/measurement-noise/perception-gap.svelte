<script lang="ts">
  import { scale } from './chart-scale';

  const LIMIT = 30;
  const HEIGHT = 110;
  const METR_Y = 62;
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  const width = $derived(Math.max(260, measuredWidth || UNMEASURED_WIDTH));
  const margin = 26;
  const x = $derived(scale(-LIMIT, LIMIT, margin, width - margin));

  /** From METR's July 2025 study. Positive is faster with AI. */
  const metr = [
    { id: 'forecast', value: 24, label: 'Forecast +24%', above: true },
    { id: 'measured', value: -19, label: 'Measured −19%', above: true },
    { id: 'after', value: 20, label: 'Felt after +20%', above: false },
  ];

  const anchor = (value: number): 'start' | 'middle' | 'end' =>
    x(value) < margin + 44 ? 'start' : x(value) > width - margin - 44 ? 'end' : 'middle';
</script>

<div class="space-y-4">
  <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
    In <a
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
      href="https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/"
      >METR’s randomized trial</a
    >, published in July 2025, 16 experienced open-source maintainers worked 246 real issues. Before
    starting, they forecast that AI tools would speed them up by 24%. Measured, they took 19%
    longer. Afterward, they still estimated they’d been 20% faster.
  </p>
  <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
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
    </svg>
  </div>

  <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200" data-testid="perception-list">
    <li>METR forecast before the work: +24% (faster).</li>
    <li>METR measured: −19% (19% longer per issue).</li>
    <li>METR participants’ estimate afterward: +20% (faster).</li>
  </ul>
</div>
