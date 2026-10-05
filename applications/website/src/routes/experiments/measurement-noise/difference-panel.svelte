<script lang="ts">
  import type { Analysis } from './analysis';
  import { niceDomain, scale, ticks } from './chart-scale';
  import { formatNumber, formatP, formatPercent, intervalDecimals } from './display';
  import ExplainTip from './explain-tip.svelte';
  import { bodyClasses } from './field-styles';
  import { endpointScale, endpointUnit } from './verdict';

  type Props = { analysis: Analysis };

  const { analysis }: Props = $props();

  const HEIGHT = 96;
  const AXIS = 52;
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  const width = $derived(Math.max(260, measuredWidth || UNMEASURED_WIDTH));
  const margin = 20;

  const labelA = $derived(analysis.labels[0] ?? 'A');
  const labelB = $derived(analysis.labels[1] ?? 'B');
  const unit = $derived(endpointUnit(analysis.endpoint));
  const factor = $derived(endpointScale(analysis.endpoint));

  /** The interval in display units, or null when there isn't one to draw. */
  const figures = $derived.by(() => {
    const { comparison } = analysis;
    if (!comparison) return null;

    if (comparison.kind === 'rate') {
      return {
        difference: comparison.difference * factor,
        lower: comparison.lower * factor,
        upper: comparison.upper * factor,
      };
    }

    return {
      difference: comparison.test.difference,
      lower: comparison.test.lower,
      upper: comparison.test.upper,
    };
  });

  const decimals = $derived(figures ? intervalDecimals(figures.lower, figures.upper) : 1);
  const show = (value: number): string => formatNumber(value, decimals);

  const domain = $derived(
    niceDomain(figures ? [figures.lower, figures.upper, figures.difference] : [0], {
      includeZero: true,
    }),
  );
  const x = $derived(scale(domain.min, domain.max, margin, width - margin));

  const kind = $derived(analysis.verdict?.kind ?? 'not-measured');
  const tone = $derived(
    kind === 'distinguishable'
      ? {
          bar: 'stroke-emerald-600 dark:stroke-emerald-400',
          dot: 'fill-emerald-600 dark:fill-emerald-400',
          words: 'Distinguishable: the interval leaves out zero.',
        }
      : {
          bar: 'stroke-amber-500 dark:stroke-amber-400',
          dot: 'fill-amber-500 dark:fill-amber-400',
          words: 'Can’t tell: the interval includes zero.',
        },
  );

  const better = $derived(
    analysis.endpoint === 'time'
      ? 'faster'
      : analysis.endpoint === 'review'
        ? 'less review'
        : 'less rework',
  );
  const worse = $derived(
    analysis.endpoint === 'time'
      ? 'slower'
      : analysis.endpoint === 'review'
        ? 'more review'
        : 'more rework',
  );

  /** Says which way a value points, in words. */
  const direction = (value: number): string =>
    value > 0
      ? `${labelB} ${show(value)} ${unit} ${better}${analysis.endpoint === 'rework' ? '' : ' per task'}`
      : value < 0
        ? `${labelB} ${show(-value)} ${unit} ${worse}${analysis.endpoint === 'rework' ? '' : ' per task'}`
        : 'no difference at all';

  type Chip = { label: string; value: string; text: string; id: string };

  const chips = $derived.by<Chip[]>(() => {
    const { comparison } = analysis;
    if (!comparison || !figures) return [];

    const ends: Chip[] = [
      {
        id: 'difference',
        label: `Difference (${labelA} − ${labelB})`,
        value: show(figures.difference),
        text:
          comparison.kind === 'mean'
            ? `In this sample, ${labelA} averaged ${formatNumber(comparison.test.meanA, 1)} and ${labelB} ${formatNumber(comparison.test.meanB, 1)}: a gap of ${show(figures.difference)} ${unit}, ${formatPercent(comparison.percent)} of ${labelA}’s mean. Positive means ${labelB} came out ahead in this sample. The interval says how much to trust that.`
            : `${labelA}’s rework rate minus ${labelB}’s: ${show(figures.difference)} percentage points. Positive means ${labelB} needed rework less often in this sample.`,
      },
      {
        id: 'lower',
        label: '95% low end',
        value: show(figures.lower),
        text: `The low end of the 95% interval: ${direction(figures.lower)}. The interval holds every true difference this data can’t rule out.`,
      },
      {
        id: 'upper',
        label: '95% high end',
        value: show(figures.upper),
        text: `The high end of the 95% interval: ${direction(figures.upper)}. If the interval runs across zero, “no difference” is still on the table.`,
      },
    ];

    if (comparison.kind === 'rate') {
      return [
        ...ends,
        {
          id: 'rates',
          label: 'Rates',
          value: `${formatPercent(comparison.a.rate * 100)} vs ${formatPercent(comparison.b.rate * 100)}`,
          text: `${labelA} needed rework on ${comparison.a.successes} of ${comparison.a.total} tasks and ${labelB} on ${comparison.b.successes} of ${comparison.b.total}. Rates from small counts swing a lot; that’s why the interval is wide.`,
        },
      ];
    }

    const { test, design } = comparison;
    if (test.degenerate) return ends;

    return [
      ...ends,
      {
        id: 'se',
        label: 'Standard error',
        value: formatNumber(test.standardError, 2),
        text: `How far the difference would typically wobble if you ran a fresh batch of tasks: about ${formatNumber(test.standardError, 2)} ${unit}. The interval is the difference plus or minus ${formatNumber(test.critical ?? 0, 3)} of these.`,
      },
      {
        id: 'df',
        label: 'Degrees of freedom',
        value: formatNumber(test.degreesOfFreedom ?? 0, 2),
        text:
          design === 'paired'
            ? `${comparison.valuesA.length} tasks minus one: ${formatNumber(test.degreesOfFreedom ?? 0, 0)}. Fewer degrees of freedom stretch the interval, because a few tasks say little about how much they vary.`
            : `From the Welch–Satterthwaite formula, which allows each condition its own spread: ${formatNumber(test.degreesOfFreedom ?? 0, 2)}. Fewer degrees of freedom stretch the interval, because a few tasks say little about how much they vary.`,
      },
      {
        id: 'critical',
        label: 't critical value',
        value: formatNumber(test.critical ?? 0, 3),
        text: `The multiplier for a 95% interval at ${formatNumber(test.degreesOfFreedom ?? 0, 2)} degrees of freedom: ${formatNumber(test.critical ?? 0, 3)}. With hundreds of tasks it falls toward 1.960.`,
      },
      {
        id: 'p',
        label: 'p-value',
        value: formatP(test.p),
        text: `If the two workflows made no difference at all, a gap at least this big would turn up about ${test.p !== null && test.p >= 0.001 ? formatPercent(test.p * 100, 1) : 'less than 0.1%'} of the time by chance. It doesn’t say how big or how important the difference is.`,
      },
    ];
  });
</script>

<div class="space-y-4" data-tip-bounds>
  {#if figures && analysis.verdict && analysis.verdict.kind !== 'not-measured'}
    <p class="font-semibold text-slate-900 dark:text-white" data-testid="difference-verdict">
      <span aria-hidden="true">{kind === 'distinguishable' ? '≠' : '?'}</span>
      {tone.words}
    </p>

    <div bind:clientWidth={measuredWidth} data-testid="number-line">
      <svg
        {width}
        height={HEIGHT}
        viewBox="0 0 {width} {HEIGHT}"
        role="img"
        aria-label="95% interval from {show(figures.lower)} to {show(
          figures.upper,
        )} {unit}, with the difference at {show(figures.difference)}. Zero is {kind ===
        'distinguishable'
          ? 'outside'
          : 'inside'} it."
        class="block max-w-full"
      >
        <line
          x1={margin}
          x2={width - margin}
          y1={AXIS}
          y2={AXIS}
          class="stroke-slate-400 dark:stroke-slate-500"
          stroke-width="1"
        />
        {#each ticks(domain.min, domain.max, domain.step) as tick (tick)}
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1={AXIS}
            y2={AXIS + 5}
            class="stroke-slate-400 dark:stroke-slate-500"
            stroke-width="1"
          />
          <text
            x={x(tick)}
            y={AXIS + 18}
            text-anchor="middle"
            class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
          >
            {formatNumber(tick, domain.step < 1 ? 1 : 0)}
          </text>
        {/each}

        <line
          x1={x(0)}
          x2={x(0)}
          y1={8}
          y2={AXIS + 5}
          stroke-width="2"
          stroke-dasharray="3 3"
          class="stroke-slate-900 dark:stroke-white"
        />
        <text
          x={x(0)}
          y={6}
          text-anchor={x(0) < margin + 40 ? 'start' : x(0) > width - margin - 40 ? 'end' : 'middle'}
          dominant-baseline="hanging"
          class="fill-slate-900 text-[11px] font-semibold dark:fill-white"
        >
          0
        </text>

        <line
          x1={x(figures.lower)}
          x2={x(figures.upper)}
          y1={AXIS - 14}
          y2={AXIS - 14}
          stroke-width="8"
          stroke-linecap="round"
          class={tone.bar}
          data-testid="interval-bar"
        />
        <circle
          cx={x(figures.difference)}
          cy={AXIS - 14}
          r="7"
          stroke-width="2"
          class="{tone.dot} stroke-white dark:stroke-slate-900"
        />

        <text x={margin} y={HEIGHT - 4} class="fill-slate-600 text-[11px] dark:fill-slate-300"
          >← {labelB.length > 12 ? 'B' : labelB} {worse}</text
        >
        <text
          x={width - margin}
          y={HEIGHT - 4}
          text-anchor="end"
          class="fill-slate-600 text-[11px] dark:fill-slate-300"
        >
          {labelB.length > 12 ? 'B' : labelB}
          {better} →
        </text>
      </svg>
    </div>
  {:else}
    <p class={bodyClasses} data-testid="no-interval">
      There’s no interval to draw. {analysis.verdict?.kind === 'not-measured'
        ? analysis.verdict.reason
        : 'The data has no outcome to compare.'}
    </p>
  {/if}

  {#if chips.length > 0}
    <p class={bodyClasses}>Hover over or focus each number to read what it means.</p>
    <dl class="flex flex-wrap gap-x-6 gap-y-3">
      {#each chips as chip (chip.id)}
        <div class="min-w-0">
          <dt class="text-xs text-slate-600 dark:text-slate-300">{chip.label}</dt>
          <dd class="font-semibold text-slate-900 tabular-nums dark:text-white">
            <ExplainTip text={chip.text} testId="explain-{chip.id}">{chip.value}</ExplainTip>
          </dd>
        </div>
      {/each}
    </dl>
  {/if}
</div>
