<script lang="ts">
  import { categoryColor } from './category-colors';
  import { radialLayout } from './graph-layout';
  import { isMutual, neighborsOf } from './graph-metrics';
  import type { PatternGraph } from './graph-metrics';
  import type { PatternEntry } from './pattern-types';

  type Props = {
    entry: PatternEntry;
    graph: PatternGraph;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
  };

  const { entry, graph, hrefFor, onOpen }: Props = $props();

  const width = 560;
  const height = 340;

  const neighborIds = $derived(neighborsOf(graph, entry.id));
  const positions = $derived(radialLayout(entry.id, neighborIds, { width, height }));
  const showAllLabels = $derived(neighborIds.length <= 14);

  let hovered = $state<string | null>(null);
  let region: HTMLDivElement | undefined = $state();

  // On a narrow screen the graph is wider than its region and would open
  // scrolled to its left edge, cutting off the entry at its center.
  $effect(() => {
    void entry.id;
    if (region) region.scrollLeft = (region.scrollWidth - region.clientWidth) / 2;
  });

  const shorten = (name: string): string => (name.length > 24 ? `${name.slice(0, 23)}…` : name);

  const labelAnchor = (x: number): 'start' | 'middle' | 'end' =>
    x < width / 2 - 40 ? 'end' : x > width / 2 + 40 ? 'start' : 'middle';
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={region}
  class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
  tabindex="0"
  role="region"
  aria-label="Neighborhood graph of {entry.name}"
>
  <svg
    viewBox="0 0 {width} {height}"
    class="mx-auto block h-auto w-full min-w-[34rem]"
    role="group"
    aria-label="{entry.name} and the {neighborIds.length} entries linked to or from it"
  >
    {#each neighborIds as id (id)}
      {@const from = positions.get(entry.id)}
      {@const to = positions.get(id)}
      {#if from && to}
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          class="stroke-slate-400 dark:stroke-slate-500"
          stroke-width={isMutual(graph, entry.id, id) ? 2 : 1}
          stroke-dasharray={isMutual(graph, entry.id, id) ? undefined : '4 3'}
          opacity={hovered === null || hovered === id ? 0.9 : 0.25}
        />
      {/if}
    {/each}

    {#each neighborIds as id (id)}
      {@const neighbor = graph.byId.get(id)}
      {@const point = positions.get(id)}
      {#if neighbor && point}
        <a
          href={hrefFor(id)}
          onclick={(event) => onOpen(id, event)}
          onpointerenter={() => (hovered = id)}
          onpointerleave={() => (hovered = null)}
          onfocus={() => (hovered = id)}
          onblur={() => (hovered = null)}
          class="focus-visible:outline-primary-600 outline-offset-2 focus-visible:outline-2"
          aria-label="{neighbor.name}, {neighbor.category}"
        >
          <circle
            cx={point.x}
            cy={point.y}
            r="7"
            fill={categoryColor(neighbor.category)}
            class="stroke-white dark:stroke-slate-900"
            stroke-width="1.5"
          />
          {#if showAllLabels || hovered === id}
            <text
              x={point.x +
                (labelAnchor(point.x) === 'end' ? -11 : labelAnchor(point.x) === 'start' ? 11 : 0)}
              y={point.y +
                (labelAnchor(point.x) === 'middle' ? (point.y < height / 2 ? -12 : 20) : 4)}
              text-anchor={labelAnchor(point.x)}
              class="fill-slate-800 text-[13px] dark:fill-slate-100"
              paint-order="stroke"
              stroke-width="3"
              stroke-linejoin="round"
            >
              {shorten(neighbor.name)}
            </text>
          {/if}
        </a>
      {/if}
    {/each}

    <circle
      cx={width / 2}
      cy={height / 2}
      r="11"
      fill={categoryColor(entry.category)}
      class="stroke-slate-900 dark:stroke-white"
      stroke-width="2.5"
    />
    <text
      x={width / 2}
      y={height / 2 + 30}
      text-anchor="middle"
      class="fill-slate-900 text-sm font-semibold dark:fill-white"
    >
      {shorten(entry.name)}
    </text>
  </svg>
</div>
