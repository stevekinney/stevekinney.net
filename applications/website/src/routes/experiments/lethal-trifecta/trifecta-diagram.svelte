<script lang="ts">
  import { onMount, tick } from 'svelte';

  import type { Edge, Evaluation } from './evaluate';
  import { exits, privateData, sources } from './model';
  import type { ControlId, NodeId } from './model';
  import NodeCard from './node-card.svelte';

  type Props = {
    evaluation: Evaluation;
    /** Show the exploit path in red. Hidden until the learner has predicted. */
    showPath: boolean;
    hovered: ControlId | null;
    ready: boolean;
    onToggleNode: (id: NodeId, on: boolean) => void;
  };

  const { evaluation, showPath, hovered, ready, onToggleNode }: Props = $props();

  type Line = { id: NodeId; d: string };

  let container: HTMLDivElement | undefined = $state();
  let lines = $state.raw<Line[]>([]);
  let size = $state({ width: 0, height: 0 });

  const onPath = (id: NodeId): boolean =>
    showPath &&
    evaluation.path !== null &&
    [
      evaluation.path.source.node.id,
      evaluation.path.data.node.id,
      evaluation.path.exit.node.id,
    ].includes(id);

  const highlighted = (edge: Edge): boolean =>
    hovered !== null && edge.state !== 'absent' && edge.touchedBy.includes(hovered);

  // The lines are drawn from the cards' measured positions, so they follow the layout.
  const measure = (): void => {
    if (!container) return;

    const box = container.getBoundingClientRect();
    const agent = container.querySelector('[data-agent]')?.getBoundingClientRect();
    if (!agent || box.width === 0) return;

    const left = agent.left - box.left;
    const right = agent.right - box.left;
    const middle = agent.top + agent.height / 2 - box.top;
    const next: Line[] = [];

    for (const card of container.querySelectorAll<HTMLElement>('[data-node]')) {
      const rect = card.getBoundingClientRect();
      const id = card.dataset.node as NodeId;
      const y = rect.top + rect.height / 2 - box.top;
      const isExit = exits.some((exit) => exit.id === id);

      if (isExit) {
        const x = rect.left - box.left;
        const bend = (x - right) / 2;
        next.push({
          id,
          d: `M ${right} ${middle} C ${right + bend} ${middle}, ${x - bend} ${y}, ${x} ${y}`,
        });
      } else {
        const x = rect.right - box.left;
        const bend = (left - x) / 2;
        next.push({
          id,
          d: `M ${x} ${y} C ${x + bend} ${y}, ${left - bend} ${middle}, ${left} ${middle}`,
        });
      }
    }

    size = { width: box.width, height: box.height };
    lines = next;
  };

  onMount(() => {
    if (!container) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(container);

    return () => observer.disconnect();
  });

  // Cards change height when their status text does, so measure after each change.
  $effect(() => {
    void evaluation;
    void showPath;
    tick().then(measure);
  });

  const stroke = (line: Line): { color: string; width: number; dash: string | undefined } => {
    const edge = evaluation.edges[line.id];
    if (hovered !== null && edge.touchedBy.includes(hovered) && edge.state !== 'absent') {
      return {
        color: 'stroke-primary-500 dark:stroke-primary-300',
        width: 4,
        dash: edge.state === 'live' ? undefined : '6 5',
      };
    }

    switch (edge.state) {
      case 'live':
        return onPath(line.id)
          ? { color: 'stroke-red-600 dark:stroke-red-400', width: 3.5, dash: undefined }
          : { color: 'stroke-slate-500 dark:stroke-slate-400', width: 1.5, dash: undefined };
      case 'gated':
        return { color: 'stroke-amber-500 dark:stroke-amber-400', width: 2, dash: '10 5' };
      case 'cut':
        return { color: 'stroke-slate-300 dark:stroke-slate-600', width: 1.5, dash: '5 5' };
      default:
        return { color: 'stroke-transparent', width: 0, dash: undefined };
    }
  };

  const columns = [
    { title: 'Untrusted content', id: 'sources', nodes: sources },
    { title: 'Private data', id: 'data', nodes: privateData },
  ] as const;
</script>

<div bind:this={container} class="relative" data-testid="diagram">
  <svg
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 hidden lg:block"
    width={size.width}
    height={size.height}
    viewBox="0 0 {size.width} {size.height}"
  >
    {#each lines as line (line.id)}
      {@const style = stroke(line)}
      <path
        d={line.d}
        fill="none"
        class="{style.color} transition-[stroke] motion-reduce:transition-none"
        stroke-width={style.width}
        stroke-dasharray={style.dash}
        data-line={line.id}
        data-line-state={evaluation.edges[line.id].state}
      />
    {/each}
  </svg>

  <div class="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] lg:gap-16">
    <div class="space-y-6">
      {#each columns as column (column.id)}
        <section aria-labelledby="column-{column.id}" class="space-y-2">
          <h3
            id="column-{column.id}"
            class="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200"
          >
            {column.title}
            <span class="font-normal normal-case">
              ({evaluation.legs[column.id === 'sources' ? 'untrusted' : 'private'] === 'intact'
                ? 'leg intact'
                : evaluation.legs[column.id === 'sources' ? 'untrusted' : 'private'] === 'cut'
                  ? 'leg cut'
                  : 'nothing on'})
            </span>
          </h3>
          <ul class="space-y-2">
            {#each column.nodes as node (node.id)}
              <NodeCard
                edge={evaluation.edges[node.id]}
                onPath={onPath(node.id)}
                highlighted={highlighted(evaluation.edges[node.id])}
                {ready}
                onToggle={(on) => onToggleNode(node.id, on)}
              />
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    <div class="flex items-center justify-center">
      <div
        data-agent
        class="w-full rounded-lg border-2 border-slate-800 bg-slate-800 px-3 py-4 text-center text-white lg:sticky lg:top-1/2 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
      >
        <p class="font-bold">Agent context</p>
        <p class="mt-1 text-xs opacity-80">
          Untrusted content and private data meet here, and actions leave.
        </p>
      </div>
    </div>

    <section aria-labelledby="column-exits" class="space-y-2 lg:self-center">
      <h3
        id="column-exits"
        class="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200"
      >
        Ways out
        <span class="font-normal normal-case">
          ({evaluation.legs.exit === 'intact'
            ? 'leg intact'
            : evaluation.legs.exit === 'cut'
              ? 'leg cut'
              : 'nothing on'})
        </span>
      </h3>
      <ul class="space-y-2">
        {#each exits as node (node.id)}
          <NodeCard
            edge={evaluation.edges[node.id]}
            onPath={onPath(node.id)}
            highlighted={highlighted(evaluation.edges[node.id])}
            {ready}
            onToggle={(on) => onToggleNode(node.id, on)}
          />
        {/each}
      </ul>
    </section>
  </div>
</div>

<div class="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-200" data-testid="live-paths">
  <h3 class="font-semibold text-slate-900 dark:text-white">Every live path, in words</h3>
  {#if !showPath}
    <p>Make your prediction above to see the live paths.</p>
  {:else if evaluation.exploitable}
    <p>
      Each of these {evaluation.live.sources.length}
      {evaluation.live.sources.length === 1 ? 'source' : 'sources'}, combined with each of these
      {evaluation.live.data.length} kinds of private data and each of these
      {evaluation.live.exits.length}
      {evaluation.live.exits.length === 1 ? 'exit' : 'exits'}, is a live path:
      {evaluation.live.sources.length * evaluation.live.data.length * evaluation.live.exits.length} in
      all.
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Untrusted content:</strong>
        {evaluation.live.sources.map((edge) => edge.node.label).join('; ')}
      </li>
      <li>
        <strong>Private data:</strong>
        {evaluation.live.data.map((edge) => edge.node.label).join('; ')}
      </li>
      <li>
        <strong>Ways out:</strong>
        {evaluation.live.exits.map((edge) => edge.phrase).join('; ')}
      </li>
    </ul>
  {:else}
    <p>No live path. Untrusted content, private data, and a way out never meet in one agent.</p>
  {/if}
</div>
