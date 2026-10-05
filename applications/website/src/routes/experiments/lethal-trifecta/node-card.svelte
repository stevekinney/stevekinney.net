<script lang="ts">
  import type { Edge } from './evaluate';

  type Props = {
    edge: Edge;
    /** The edge is on the highlighted exploit path. */
    onPath: boolean;
    /** The hovered control would remove or narrow this edge. */
    highlighted: boolean;
    ready: boolean;
    onToggle: (on: boolean) => void;
  };

  const { edge, onPath, highlighted, ready, onToggle }: Props = $props();

  const id = $derived(`node-${edge.node.id}`);

  const status = $derived.by(() => {
    switch (edge.state) {
      case 'absent':
        return 'Off';
      case 'cut':
        return `Cut by ${edge.cuts.map((cut) => cut.label).join(' and ')}`;
      case 'gated':
        return `Held only by a prompt: ${edge.cuts.map((cut) => cut.label).join(', ')}`;
      default:
        return onPath ? 'Live, on the highlighted path' : 'Live';
    }
  });

  const border = $derived(
    edge.state === 'absent'
      ? 'border-dotted border-slate-300 text-slate-500 dark:border-slate-600'
      : edge.state === 'cut'
        ? 'border-dashed border-slate-400 dark:border-slate-500'
        : edge.state === 'gated'
          ? 'border-dashed border-amber-500 dark:border-amber-400'
          : onPath
            ? 'border-solid border-red-600 ring-1 ring-red-600 dark:border-red-400 dark:ring-red-400'
            : 'border-solid border-slate-400 dark:border-slate-500',
  );
</script>

<li
  data-node={edge.node.id}
  data-edge={edge.state}
  data-path={onPath ? 'true' : undefined}
  data-highlighted={highlighted ? 'true' : undefined}
  class="group relative rounded-md border-2 bg-white p-2.5 text-sm transition-shadow focus-within:z-30 hover:z-30 motion-reduce:transition-none dark:bg-slate-900 {border} {highlighted
    ? 'shadow-primary-400/70 shadow-[0_0_0_3px]'
    : ''}"
>
  <label for={id} class="flex cursor-pointer items-start gap-2">
    <input
      {id}
      type="checkbox"
      checked={edge.state !== 'absent'}
      disabled={!ready}
      onchange={(event) => onToggle(event.currentTarget.checked)}
      aria-describedby="{id}-status {id}-description"
      class="accent-primary-600 mt-0.5 size-4 flex-none"
    />
    <span class="min-w-0 font-medium [overflow-wrap:anywhere] text-slate-900 dark:text-white"
      >{edge.node.label}</span
    >
  </label>
  <p
    id="{id}-status"
    class="mt-1 pl-6 text-xs [overflow-wrap:anywhere] {edge.state === 'live' && onPath
      ? 'font-semibold text-red-700 dark:text-red-300'
      : edge.state === 'cut'
        ? 'text-slate-500 italic dark:text-slate-400'
        : edge.state === 'gated'
          ? 'text-amber-800 dark:text-amber-200'
          : 'text-slate-600 dark:text-slate-300'}"
  >
    {status}
  </p>
  {#if edge.note && edge.state === 'live'}
    <p class="mt-1 pl-6 text-xs [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
      {edge.note}
    </p>
  {/if}
  <span
    id="{id}-description"
    role="tooltip"
    class="pointer-events-none absolute top-full right-0 left-0 z-20 mt-1 hidden rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-focus-within:block group-hover:block dark:bg-slate-100 dark:text-slate-900"
  >
    {edge.node.description}
  </span>
</li>
