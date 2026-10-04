<script lang="ts">
  import { Maximize, Minus, Plus } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import { categoryColor } from './category-colors';
  import { boundsOf, layoutGraph } from './graph-layout';
  import { mostConnected, neighborsOf } from './graph-metrics';
  import type { PatternGraph } from './graph-metrics';
  import { isPartial } from './explorer-state';

  type Props = {
    graph: PatternGraph;
    /** The ids that match the current filters and search, or `null` when none are active. */
    matching: ReadonlySet<string> | null;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
  };

  const { graph, matching, hrefFor, onOpen }: Props = $props();

  const layoutWidth = 1000;
  const layoutHeight = 700;

  // The layout settles before the first paint, so there's no animation to turn
  // off for people who ask for reduced motion.
  const positions = $derived(
    layoutGraph(
      graph.entries.map((entry) => entry.id),
      graph.edges,
      { width: layoutWidth, height: layoutHeight },
    ),
  );

  let svgElement = $state<SVGSVGElement>();
  let width = $state(0);
  let height = $state(0);
  let view = $state({ x: 0, y: 0, scale: 1 });
  let fitScale = $state(1);
  let hovered = $state<string | null>(null);
  let dragged = false;

  const neighborhood = $derived(
    hovered === null ? null : new Set([hovered, ...neighborsOf(graph, hovered)]),
  );
  const showLabels = $derived(view.scale >= fitScale * 2.4);
  const connected = $derived(mostConnected(graph, 15));

  const categories = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const entry of graph.entries)
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);

    return [...counts].sort(
      (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
    );
  });

  const hasPartial = $derived(graph.entries.some(isPartial));

  const radius = (id: string): number => 4 + Math.sqrt(graph.degree.get(id) ?? 0) * 1.7;

  const fit = (): void => {
    if (width === 0 || height === 0) return;

    const bounds = boundsOf(positions.values(), 36);
    const scale = Math.min(width / bounds.width, height / bounds.height);

    fitScale = scale;
    view = {
      scale,
      x: (width - bounds.width * scale) / 2 - bounds.x * scale,
      y: (height - bounds.height * scale) / 2 - bounds.y * scale,
    };
  };

  const zoomAt = (centerX: number, centerY: number, factor: number): void => {
    const scale = Math.min(fitScale * 10, Math.max(fitScale * 0.6, view.scale * factor));
    const ratio = scale / view.scale;

    view = {
      scale,
      x: centerX - (centerX - view.x) * ratio,
      y: centerY - (centerY - view.y) * ratio,
    };
  };

  // Fit once the graph has a size, and again when the layout changes.
  let fitted = false;
  $effect(() => {
    void positions;
    if (width > 0 && height > 0 && !fitted) {
      fitted = true;
      fit();
    }
  });
  $effect(() => {
    void positions;
    fitted = false;
  });

  onMount(() => {
    const element = svgElement;
    if (!element) return;

    // A wheel handler has to be non-passive to stop the page from scrolling.
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();

      const box = element.getBoundingClientRect();
      zoomAt(event.clientX - box.left, event.clientY - box.top, Math.exp(-event.deltaY * 0.0015));
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => element.removeEventListener('wheel', handleWheel);
  });

  const pointers = new Map<number, { x: number; y: number }>();

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !svgElement) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged = false;

    const handleMove = (move: PointerEvent): void => {
      const previous = pointers.get(move.pointerId);
      if (!previous || !svgElement) return;

      const box = svgElement.getBoundingClientRect();
      const others = [...pointers]
        .filter(([id]) => id !== move.pointerId)
        .map(([, point]) => point);

      if (others.length === 0) {
        const dx = move.clientX - previous.x;
        const dy = move.clientY - previous.y;

        if (dragged || Math.hypot(dx, dy) > 0) {
          dragged =
            dragged || Math.hypot(move.clientX - event.clientX, move.clientY - event.clientY) > 4;
        }
        if (dragged) view = { ...view, x: view.x + dx, y: view.y + dy };
      } else {
        // Two fingers: zoom by how the distance between them changed, and pan with their midpoint.
        const other = others[0] as { x: number; y: number };
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(move.clientX - other.x, move.clientY - other.y);
        const midpointX = (move.clientX + other.x) / 2 - box.left;
        const midpointY = (move.clientY + other.y) / 2 - box.top;
        const previousMidpointX = (previous.x + other.x) / 2 - box.left;
        const previousMidpointY = (previous.y + other.y) / 2 - box.top;

        dragged = true;
        view = {
          ...view,
          x: view.x + midpointX - previousMidpointX,
          y: view.y + midpointY - previousMidpointY,
        };
        if (before > 0) zoomAt(midpointX, midpointY, after / before);
      }

      pointers.set(move.pointerId, { x: move.clientX, y: move.clientY });
    };

    const handleEnd = (end: PointerEvent): void => {
      pointers.delete(end.pointerId);

      if (pointers.size === 0) {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
      }
    };

    // The first pointer down sets up listeners that outlive the svg's own events.
    if (pointers.size === 1) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    }
  };

  const zoomFromCenter = (factor: number): void => zoomAt(width / 2, height / 2, factor);

  const isDimmed = (id: string): boolean => matching !== null && !matching.has(id);

  const nodeOpacity = (id: string): number => {
    if (id === hovered) return 1;

    if (neighborhood !== null && !neighborhood.has(id)) return 0.15;

    return isDimmed(id) ? 0.2 : 1;
  };

  const edgeState = (source: string, target: string): 'active' | 'normal' | 'faint' => {
    if (hovered !== null) return source === hovered || target === hovered ? 'active' : 'faint';

    return isDimmed(source) || isDimmed(target) ? 'faint' : 'normal';
  };

  const buttonClass =
    'focus-visible:outline-primary-600 inline-flex size-9 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
</script>

<section aria-labelledby="graph-heading" class="space-y-4">
  <p class="max-w-prose text-sm text-slate-600 dark:text-slate-300">
    Each dot is an entry, joined to the entries its Related Patterns list. Bigger dots have more
    links. Hover or focus a dot to see its name and neighbors, and choose it to open the entry. Drag
    to pan and scroll or pinch to zoom. Filters and search dim what doesn't match.
  </p>

  <ul
    class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200"
    aria-label="Category colors"
  >
    {#each categories as [category, count] (category)}
      <li class="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" viewBox="0 0 12 12" class="size-3">
          <circle cx="6" cy="6" r="5" fill={categoryColor(category)} />
        </svg>
        {category}
        <span class="text-slate-500 tabular-nums dark:text-slate-400">{count}</span>
      </li>
    {/each}
    {#if hasPartial}
      <li class="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" viewBox="0 0 12 12" class="size-3">
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        partial entry
      </li>
    {/if}
  </ul>

  <div
    class="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
  >
    <svg
      bind:this={svgElement}
      bind:clientWidth={width}
      bind:clientHeight={height}
      onpointerdown={handlePointerDown}
      role="group"
      aria-label="Relationship graph of {graph.entries
        .length} entries. The most connected entries are listed below as text."
      class="block h-[28rem] w-full cursor-grab touch-none select-none sm:h-[36rem]"
    >
      <g transform="translate({view.x} {view.y}) scale({view.scale})">
        {#each graph.edges as edge (edge.source + '>' + edge.target)}
          {@const from = positions.get(edge.source)}
          {@const to = positions.get(edge.target)}
          {@const state = edgeState(edge.source, edge.target)}
          {#if from && to}
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              class={state === 'active'
                ? 'stroke-slate-900 dark:stroke-white'
                : 'stroke-slate-400 dark:stroke-slate-500'}
              stroke-width={state === 'active' ? 2 : 1}
              vector-effect="non-scaling-stroke"
              opacity={state === 'active' ? 0.9 : state === 'faint' ? 0.06 : 0.28}
            />
          {/if}
        {/each}

        {#each graph.entries as entry (entry.id)}
          {@const point = positions.get(entry.id)}
          {@const size = radius(entry.id)}
          {#if point}
            <a
              href={hrefFor(entry.id)}
              onclick={(event) => {
                if (dragged) {
                  event.preventDefault();

                  return;
                }
                onOpen(entry.id, event);
              }}
              onpointerenter={() => (hovered = entry.id)}
              onpointerleave={() => (hovered = null)}
              onfocus={() => (hovered = entry.id)}
              onblur={() => (hovered = null)}
              aria-label="{entry.name}, {entry.category}, {graph.degree.get(entry.id) ??
                0} links{isPartial(entry) ? ', partial entry' : ''}"
              class="cursor-pointer transition-opacity outline-none motion-reduce:transition-none [&:focus-visible>circle]:stroke-slate-900 [&:focus-visible>circle]:stroke-[3] dark:[&:focus-visible>circle]:stroke-white"
              style:opacity={nodeOpacity(entry.id)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={size}
                fill={isPartial(entry) ? 'none' : categoryColor(entry.category)}
                stroke={isPartial(entry) ? categoryColor(entry.category) : undefined}
                stroke-width={isPartial(entry) ? 2.5 : 1}
                class={isPartial(entry) ? '' : 'stroke-white dark:stroke-slate-900'}
              />
              {#if hovered === entry.id || showLabels}
                <text
                  x={point.x}
                  y={point.y - size - 4}
                  text-anchor="middle"
                  paint-order="stroke"
                  stroke-width="3"
                  stroke-linejoin="round"
                  class="pointer-events-none fill-slate-900 stroke-slate-50 text-[12px] font-medium dark:fill-white dark:stroke-slate-950"
                >
                  {entry.name}
                </text>
              {/if}
            </a>
          {/if}
        {/each}
      </g>
    </svg>

    <div class="absolute top-3 right-3 flex flex-col gap-1.5">
      <button
        type="button"
        class={buttonClass}
        onclick={() => zoomFromCenter(1.4)}
        aria-label="Zoom in"
      >
        <Plus aria-hidden="true" class="size-4" />
      </button>
      <button
        type="button"
        class={buttonClass}
        onclick={() => zoomFromCenter(1 / 1.4)}
        aria-label="Zoom out"
      >
        <Minus aria-hidden="true" class="size-4" />
      </button>
      <button type="button" class={buttonClass} onclick={fit} aria-label="Fit to screen">
        <Maximize aria-hidden="true" class="size-4" />
      </button>
    </div>
  </div>

  <section aria-labelledby="most-connected-heading" class="space-y-2">
    <h3 id="most-connected-heading" class="font-bold text-slate-900 dark:text-white">
      Most connected
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      The 15 entries with the most links, counting links in and out. This is the graph as a list.
    </p>
    <ol class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {#each connected as { entry, degree, incoming, outgoing }, index (entry.id)}
        <li
          class="flex items-baseline justify-between gap-3 border-b border-slate-200 py-1 dark:border-slate-800"
        >
          <span class="min-w-0">
            <span class="text-slate-500 tabular-nums dark:text-slate-400">{index + 1}.</span>
            <a
              href={hrefFor(entry.id)}
              onclick={(event) => onOpen(entry.id, event)}
              class="text-primary-700 dark:text-primary-300 rounded font-medium break-words underline underline-offset-2"
            >
              {entry.name}
            </a>
          </span>
          <span class="shrink-0 text-slate-600 tabular-nums dark:text-slate-300">
            {degree}
            <span class="sr-only">links, {incoming} in and {outgoing} out</span>
            <span aria-hidden="true" class="text-xs text-slate-500 dark:text-slate-400">
              ({incoming} in, {outgoing} out)
            </span>
          </span>
        </li>
      {/each}
    </ol>
  </section>
</section>
