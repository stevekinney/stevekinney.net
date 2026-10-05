<script lang="ts">
  import { tick } from 'svelte';

  import { chipClasses } from './field-styles';
  import { findRung, rungs } from './ladder';
  import type { RungId } from './ladder';
  import {
    concernLabels,
    concernQuestions,
    concerns,
    deciderLabels,
    deciders,
    findMechanism,
    groupByDecider,
    mechanisms,
    mechanismsFor,
  } from './mechanisms';
  import type { Concern, Mechanism, MechanismId } from './mechanisms';
  import { placeTooltip } from './tooltip-position';

  type Props = {
    selectedId: MechanismId | null;
    concern: Concern | null;
    ready: boolean;
    onSelect: (id: MechanismId) => void;
    onConcern: (concern: Concern | null) => void;
  };

  const { selectedId, concern, ready, onSelect, onConcern }: Props = $props();

  const highlighted = $derived(new Set(concern ? mechanismsFor(concern) : []));
  const groups = groupByDecider();

  // The map's rows, strongest rung at the top, then the mechanisms that enforce nothing themselves.
  const rows: { id: RungId | null; label: string; power: string }[] = [
    ...[...rungs].reverse().map((rung) => ({ id: rung.id, label: rung.name, power: rung.power })),
    { id: null, label: 'No rung of its own', power: 'enforces nothing itself' },
  ];

  const cell = (rung: RungId | null, decider: string): Mechanism[] =>
    mechanisms.filter((mechanism) => mechanism.rung === rung && mechanism.decidedBy === decider);

  const enforcementText = (mechanism: Mechanism): string => {
    const rung = findRung(mechanism.rung);

    return rung ? `Rung: ${rung.power}` : `No rung: ${mechanism.enforcement.toLowerCase()}`;
  };

  let container = $state<HTMLDivElement | undefined>();
  let tooltip = $state<HTMLDivElement | undefined>();
  let tip = $state<{ id: MechanismId; left: number; top: number; visible: boolean } | null>(null);

  const showTip = async (id: MechanismId, target: HTMLElement): Promise<void> => {
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const anchor = target.getBoundingClientRect();
    const center = anchor.left + anchor.width / 2 - bounds.left;
    tip = { id, left: 0, top: anchor.bottom - bounds.top + 6, visible: false };

    // Measure the tooltip with its text in place, then hold it inside the map.
    await tick();
    if (!tooltip || tip?.id !== id) return;
    tip = { ...tip, left: placeTooltip(center, tooltip.offsetWidth, bounds.width), visible: true };
  };

  const hideTip = (id: MechanismId): void => {
    if (tip?.id === id) tip = null;
  };

  const tipMechanism = $derived(tip ? findMechanism(tip.id) : null);

  const nodeClasses = (mechanism: Mechanism): string => {
    const dimmed = concern !== null && !highlighted.has(mechanism.id);
    const lit = concern !== null && highlighted.has(mechanism.id);

    return [
      'focus-visible:outline-primary-600 w-full cursor-pointer rounded-md border px-2 py-1.5 text-left text-sm font-semibold [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
      'aria-pressed:border-primary-600 aria-pressed:bg-primary-600 aria-pressed:text-white dark:aria-pressed:border-primary-400 dark:aria-pressed:bg-primary-700',
      lit
        ? 'border-2 border-amber-500 bg-amber-50 text-slate-900 dark:border-amber-400 dark:bg-amber-900/30 dark:text-white'
        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
      dimmed ? 'opacity-50' : '',
    ].join(' ');
  };
</script>

{#snippet node(mechanism: Mechanism, detail: boolean)}
  <button
    type="button"
    data-mechanism={mechanism.id}
    data-highlighted={highlighted.has(mechanism.id)}
    disabled={!ready}
    aria-pressed={selectedId === mechanism.id}
    aria-describedby={tip?.id === mechanism.id ? 'map-tooltip' : undefined}
    class={nodeClasses(mechanism)}
    onclick={() => onSelect(mechanism.id)}
    onpointerenter={(event) => showTip(mechanism.id, event.currentTarget)}
    onpointerleave={() => hideTip(mechanism.id)}
    onfocus={(event) => showTip(mechanism.id, event.currentTarget)}
    onblur={() => hideTip(mechanism.id)}
    onkeydown={(event) => {
      if (event.key === 'Escape') tip = null;
    }}
  >
    {mechanism.name}
    {#if highlighted.has(mechanism.id)}<span class="sr-only">
        (serves {concern ? concernLabels[concern] : ''})</span
      >{/if}
    {#if detail}
      <span class="block text-xs font-normal opacity-80">{enforcementText(mechanism)}</span>
    {/if}
  </button>
{/snippet}

<div class="space-y-4">
  <div class="space-y-2">
    <div role="group" aria-label="Filter by concern" class="flex flex-wrap gap-2">
      {#each concerns as entry (entry)}
        <button
          type="button"
          disabled={!ready}
          aria-pressed={concern === entry}
          class={chipClasses}
          onclick={() => onConcern(concern === entry ? null : entry)}
        >
          {concernLabels[entry]}
        </button>
      {/each}
    </div>
    <p
      class="text-sm text-slate-600 dark:text-slate-300"
      aria-live="polite"
      data-testid="concern-note"
    >
      {#if concern}
        <strong>{concernLabels[concern]}</strong>: {concernQuestions[concern]} Highlighted:
        {mechanismsFor(concern)
          .map((id) => findMechanism(id).name)
          .join(', ')}.
      {:else}
        The outline’s operating model has five concerns. Pick one to highlight the mechanisms that
        serve it.
      {/if}
    </p>
  </div>

  <div bind:this={container} class="relative">
    <div class="relative hidden overflow-x-auto md:block">
      <table class="w-full table-fixed border-separate border-spacing-1 text-sm">
        <caption class="sr-only">
          Mechanisms by who decides they run, across, and how strongly they enforce, from the top
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="w-36 text-left text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Enforcement ↓ · Decided by →
            </th>
            {#each deciders as decider (decider)}
              <th
                scope="col"
                class="text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {deciderLabels[decider]}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.label)}
            <tr data-row={row.id ?? 'none'}>
              <th
                scope="row"
                class="rounded-md bg-slate-50 px-2 py-1 text-left align-top text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
              >
                {row.label}
                <span class="block font-normal text-slate-500 dark:text-slate-400">{row.power}</span
                >
              </th>
              {#each deciders as decider (decider)}
                <td class="align-top">
                  <div class="space-y-1">
                    {#each cell(row.id, decider) as mechanism (mechanism.id)}
                      {@render node(mechanism, false)}
                    {/each}
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="space-y-4 md:hidden" data-testid="map-list">
      {#each groups as group (group.decider)}
        <section aria-labelledby="map-group-{group.decider}" class="space-y-2">
          <h3
            id="map-group-{group.decider}"
            class="text-sm font-bold text-slate-900 dark:text-white"
          >
            Decided by {deciderLabels[group.decider].toLowerCase()}
          </h3>
          <ul class="space-y-1.5">
            {#each group.mechanisms as mechanism (mechanism.id)}
              <li>{@render node(mechanism, true)}</li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    {#if tip && tipMechanism}
      <div
        bind:this={tooltip}
        id="map-tooltip"
        role="tooltip"
        data-testid="map-tooltip"
        style:left="{tip.left}px"
        style:top="{tip.top}px"
        style:visibility={tip.visible ? 'visible' : 'hidden'}
        class="pointer-events-none absolute z-20 w-max max-w-[min(18rem,100%)] rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
      >
        <span class="block font-semibold">{tipMechanism.name}</span>
        {tipMechanism.definition}
      </div>
    {/if}
  </div>
</div>
