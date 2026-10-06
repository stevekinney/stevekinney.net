<script lang="ts">
  import { costAtContext } from './calculate';
  import type { ChangeEvaluation } from './calculate';
  import {
    breakEvenPoint,
    buildLayout,
    clampContext,
    contextAtX,
    costLinePoints,
    cursorStep,
    describeCursor,
    placeHereLabel,
    toPath,
    xOf,
    xTicks,
    yOf,
    yTicks,
  } from './chart-geometry';
  import { formatDollars, formatTokens } from './display';
  import { headingClasses, panelClasses } from './field-styles';
  import { placeTooltip } from './tooltip-position';

  type Props = {
    evaluation: ChangeEvaluation;
    onSelectContext: (contextTokens: number) => void;
  };

  const { evaluation, onSelectContext }: Props = $props();

  // The chart is drawn at the width it's shown at, so its text stays the same size on a phone.
  let width = $state(640);
  const height = $derived(width < 480 ? 300 : 340);

  let hovered = $state<number | null>(null);
  let focused = $state(false);
  let keyboardCursor = $state<number | null>(null);

  const layout = $derived(buildLayout(evaluation, width, height));
  const costPath = $derived(toPath(costLinePoints(evaluation, layout)));
  const breakEven = $derived(breakEvenPoint(evaluation, layout));
  const valueY = $derived(yOf(layout, evaluation.value));
  const hereX = $derived(xOf(layout, evaluation.contextTokens));
  const hereY = $derived(yOf(layout, evaluation.cost));
  const ahead = $derived(evaluation.net >= -1e-9);
  const valueLabel = $derived(
    `Value ${formatDollars(Math.abs(evaluation.value))}${evaluation.value < 0 ? ' below zero' : ''}`,
  );
  const hereLabel = $derived(placeHereLabel(layout, hereX, hereY, valueY, valueLabel));

  const cursor = $derived(
    hovered ?? (focused ? clampContext(layout, keyboardCursor ?? evaluation.contextTokens) : null),
  );
  const cursorX = $derived(cursor === null ? 0 : xOf(layout, cursor));
  const cursorY = $derived(cursor === null ? 0 : yOf(layout, costAtContext(evaluation, cursor)));
  const cursorText = $derived(describeCursor(evaluation, cursor ?? evaluation.contextTokens));
  let tooltipWidth = $state(0);
  // Held inside the plot so the tooltip can neither widen the page nor cover the axis labels.
  const tooltipLeft = $derived(
    placeTooltip(cursorX, tooltipWidth, width, 12, {
      left: layout.margins.left,
      right: layout.margins.right,
    }),
  );

  const description = $derived.by(() => {
    const parts = [
      `The cost to make the change rises from $0.00 with no context to ${formatDollars(
        costAtContext(evaluation, layout.domainMax),
      )} at ${formatTokens(layout.domainMax)} tokens of context.`,
      `The value of your remaining work is ${formatDollars(Math.abs(evaluation.value))}${
        evaluation.value < 0 ? ' less than nothing' : ''
      }, whatever your context.`,
    ];

    if (breakEven) {
      parts.push(`The lines cross at ${formatTokens(breakEven.context)} tokens of context.`);
    } else if (evaluation.verdict === 'never') {
      parts.push('The change never pays for itself, so the lines never cross.');
    }

    parts.push(
      `You are at ${formatTokens(evaluation.contextTokens)} tokens, where the cost is ${formatDollars(
        evaluation.cost,
      )}, so you are ${ahead ? 'ahead' : 'behind'}.`,
    );

    return parts.join(' ');
  });

  const positionOf = (event: { clientX: number }, element: HTMLElement): number =>
    contextAtX(layout, event.clientX - element.getBoundingClientRect().left);

  const handleKeydown = (event: KeyboardEvent): void => {
    const step = cursorStep(layout) * (event.shiftKey ? 5 : 1);
    const current = clampContext(layout, keyboardCursor ?? evaluation.contextTokens);

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      keyboardCursor = clampContext(layout, current + step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      keyboardCursor = clampContext(layout, current - step);
    } else if (event.key === 'Home') {
      keyboardCursor = 0;
    } else if (event.key === 'End') {
      keyboardCursor = layout.domainMax;
    } else if (event.key === 'Enter') {
      onSelectContext(current);
    } else {
      return;
    }

    event.preventDefault();
  };
</script>

<section aria-labelledby="chart-heading" class={panelClasses}>
  <div class="space-y-1">
    <h2 id="chart-heading" class={headingClasses}>Where you stand</h2>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Click the chart, or focus it and press the arrow keys and Enter, to try a different amount of
      context.
    </p>
  </div>

  <div
    role="slider"
    tabindex="0"
    aria-label="Cost to change by tokens in context. Use the arrow keys to move the cursor and Enter to set your context."
    aria-describedby="chart-description"
    aria-valuemin={0}
    aria-valuemax={Math.round(layout.domainMax)}
    aria-valuenow={Math.round(cursor ?? evaluation.contextTokens)}
    aria-valuetext={cursorText}
    data-plot-left={layout.margins.left}
    data-plot-width={layout.plotWidth}
    data-domain-max={layout.domainMax}
    bind:clientWidth={width}
    onpointermove={(event) => (hovered = positionOf(event, event.currentTarget))}
    onpointerleave={() => (hovered = null)}
    onclick={(event) => {
      const context = positionOf(event, event.currentTarget);

      keyboardCursor = context;
      onSelectContext(context);
    }}
    onkeydown={handleKeydown}
    onfocus={() => (focused = true)}
    onblur={() => {
      focused = false;
      keyboardCursor = null;
    }}
    class="focus-visible:outline-primary-600 relative cursor-crosshair overflow-x-clip rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
  >
    <svg
      viewBox="0 0 {width} {height}"
      class="block h-auto w-full text-slate-600 dark:text-slate-300"
      aria-hidden="true"
    >
      {#each yTicks(layout) as tick (tick.value)}
        <line
          x1={layout.margins.left}
          x2={layout.margins.left + layout.plotWidth}
          y1={tick.y}
          y2={tick.y}
          class="stroke-slate-200 dark:stroke-slate-700"
        />
        <text
          x={layout.margins.left - 8}
          y={tick.y}
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {tick.label}
        </text>
      {/each}
      {#each xTicks(layout) as tick (tick.value)}
        <text
          x={tick.x}
          y={layout.margins.top + layout.plotHeight + 18}
          text-anchor={tick.value === 0 ? 'start' : tick.x > layout.width - 30 ? 'end' : 'middle'}
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {tick.label}
        </text>
      {/each}
      <text
        x={layout.margins.left + layout.plotWidth / 2}
        y={layout.height - 8}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-semibold dark:fill-slate-200"
      >
        Tokens already in context
      </text>
      {#if width >= 480}
        <text
          transform="translate(14 {layout.margins.top + layout.plotHeight / 2}) rotate(-90)"
          text-anchor="middle"
          class="fill-slate-700 text-xs font-semibold dark:fill-slate-200"
        >
          Dollars
        </text>
      {/if}
      <line
        x1={layout.margins.left}
        x2={layout.margins.left}
        y1={layout.margins.top}
        y2={layout.margins.top + layout.plotHeight}
        class="stroke-slate-400 dark:stroke-slate-500"
      />

      <!-- value of remaining work -->
      <line
        x1={layout.margins.left}
        x2={layout.margins.left + layout.plotWidth}
        y1={valueY}
        y2={valueY}
        stroke-width="2"
        stroke-dasharray="7 5"
        class="stroke-amber-600 dark:stroke-amber-400"
      />
      <text
        x={layout.margins.left + layout.plotWidth - 4}
        y={valueY - 6}
        text-anchor="end"
        class="fill-amber-800 text-[11px] font-semibold tabular-nums dark:fill-amber-300"
      >
        {valueLabel}
      </text>

      <!-- cost to change -->
      <path
        d={costPath}
        fill="none"
        stroke-width="2.5"
        stroke-linejoin="round"
        class="stroke-primary-600 dark:stroke-primary-400"
      />

      <!-- break-even -->
      {#if breakEven}
        <line
          x1={breakEven.x}
          x2={breakEven.x}
          y1={breakEven.y}
          y2={layout.margins.top + layout.plotHeight}
          stroke-width="1.5"
          stroke-dasharray="2 3"
          class="stroke-slate-600 dark:stroke-slate-300"
        />
        <circle
          data-chart-mark="break-even"
          cx={breakEven.x}
          cy={breakEven.y}
          r="5"
          stroke-width="2"
          class="fill-white stroke-slate-700 dark:fill-slate-900 dark:stroke-slate-200"
        />
      {/if}

      <!-- you are here -->
      <line
        x1={hereX}
        x2={hereX}
        y1={layout.margins.top}
        y2={layout.margins.top + layout.plotHeight}
        class="stroke-slate-400/50 dark:stroke-slate-500/60"
      />
      <circle
        data-chart-mark="you-are-here"
        cx={hereX}
        cy={hereY}
        r="8"
        stroke-width="3"
        class="stroke-white dark:stroke-slate-900 {ahead
          ? 'fill-emerald-600 dark:fill-emerald-400'
          : 'fill-rose-600 dark:fill-rose-400'}"
      />
      <text
        x={hereX}
        y={hereLabel.y}
        text-anchor={hereLabel.anchor}
        class="fill-slate-900 text-xs font-semibold dark:fill-white"
      >
        you are here
      </text>

      <!-- hover and keyboard cursor -->
      {#if cursor !== null}
        <line
          x1={cursorX}
          x2={cursorX}
          y1={layout.margins.top}
          y2={layout.margins.top + layout.plotHeight}
          class="stroke-slate-500 dark:stroke-slate-400"
          stroke-dasharray="3 3"
        />
        <circle
          cx={cursorX}
          cy={cursorY}
          r="5"
          class="fill-primary-600 dark:fill-primary-400 stroke-white dark:stroke-slate-900"
          stroke-width="2"
        />
      {/if}
    </svg>

    {#if cursor !== null}
      <div
        role="tooltip"
        data-chart-tooltip
        bind:clientWidth={tooltipWidth}
        class="pointer-events-none absolute z-10 w-max rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        style="left: {tooltipLeft}px; top: {Math.max(
          4,
          cursorY - 52,
        )}px; max-width: min(15rem, {layout.plotWidth}px);"
      >
        {cursorText}
      </div>
    {/if}
  </div>

  <p id="chart-description" class="sr-only">{description}</p>

  <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-200">
    <li class="flex items-center gap-2">
      <svg width="28" height="10" aria-hidden="true">
        <line
          x1="0"
          x2="28"
          y1="5"
          y2="5"
          stroke-width="2.5"
          class="stroke-primary-600 dark:stroke-primary-400"
        />
      </svg>
      Cost to make the change
    </li>
    <li class="flex items-center gap-2">
      <svg width="28" height="10" aria-hidden="true">
        <line
          x1="0"
          x2="28"
          y1="5"
          y2="5"
          stroke-width="2"
          stroke-dasharray="7 5"
          class="stroke-amber-600 dark:stroke-amber-400"
        />
      </svg>
      Value of remaining work
    </li>
    <li class="flex items-center gap-2">
      <svg width="14" height="14" aria-hidden="true">
        <circle
          cx="7"
          cy="7"
          r="5"
          stroke-width="2"
          class="fill-white stroke-slate-700 dark:fill-slate-900 dark:stroke-slate-200"
        />
      </svg>
      Break-even point
    </li>
    <li class="flex items-center gap-2">
      <svg width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" class="fill-emerald-600 dark:fill-emerald-400" />
      </svg>
      You are here, ahead
    </li>
    <li class="flex items-center gap-2">
      <svg width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" class="fill-rose-600 dark:fill-rose-400" />
      </svg>
      You are here, behind
    </li>
  </ul>
</section>
