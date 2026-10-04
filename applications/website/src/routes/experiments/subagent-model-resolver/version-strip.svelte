<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';

  import type { AcrossVersions } from './across-versions';
  import { modelLabel } from './models';
  import ModelSwatch from './model-swatch.svelte';
  import { swatchClasses, legend } from './tier-style';
  import { compareVersions, formatVersion } from './versions';
  import type { Version, VersionRange } from './versions';

  type Props = {
    across: AcrossVersions;
    range: VersionRange;
    /** The version the resolver is showing now. */
    current: Version;
    ready: boolean;
    onSelectVersion: (version: Version) => void;
  };

  const { across, range, current, ready, onSelectVersion }: Props = $props();

  let hovered = $state<number | null>(null);

  const total = $derived(across.resolutions.length);
  const currentPosition = $derived(((current.patch - range.first.patch + 0.5) / total) * 100);
  const single = $derived(across.segments.length === 1 ? across.segments[0] : null);

  const spanText = (first: Version, last: Version, length: number): string =>
    first.patch === last.patch
      ? formatVersion(first)
      : `${formatVersion(first)} to ${formatVersion(last)}, ${length} versions`;

  const directionText = {
    'more-expensive': 'more expensive',
    cheaper: 'cheaper',
    unknown: 'tier unknown',
  } as const;
</script>

<div class="space-y-4">
  <div class="space-y-1">
    <div
      class="relative flex h-12 w-full gap-px overflow-hidden rounded-lg"
      role="group"
      aria-label="Which model this configuration resolves to, version by version"
    >
      {#each across.segments as segment, index (segment.first.patch)}
        {@const contains =
          compareVersions(current, segment.first) >= 0 &&
          compareVersions(current, segment.last) <= 0}
        <button
          type="button"
          disabled={!ready}
          data-segment={segment.model}
          aria-label="{modelLabel(segment.model)}, {spanText(
            segment.first,
            segment.last,
            segment.length,
          )}. Show this version in the resolver."
          aria-current={contains ? 'true' : undefined}
          title="{modelLabel(segment.model)}, {spanText(
            segment.first,
            segment.last,
            segment.length,
          )}"
          onclick={() => onSelectVersion(segment.first)}
          onpointerenter={() => (hovered = index)}
          onpointerleave={() => (hovered = null)}
          onfocus={() => (hovered = index)}
          onblur={() => (hovered = null)}
          style:flex-grow={segment.length}
          style:flex-basis="0"
          class="focus-visible:outline-primary-600 min-w-px cursor-pointer overflow-hidden px-1 text-center text-xs font-semibold whitespace-nowrap focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-not-allowed {swatchClasses(
            segment.model,
          )}"
        >
          {#if segment.share > 0.09}{modelLabel(segment.model)}{/if}
        </button>
      {/each}
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 w-0.5 bg-white mix-blend-difference"
        style:left="{currentPosition}%"
      ></span>
    </div>

    <div
      aria-hidden="true"
      class="flex justify-between font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400"
    >
      <span>{formatVersion(range.first)}</span>
      <span>{formatVersion(range.last)}</span>
    </div>
    <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="off">
      {#if hovered !== null}
        {@const segment = across.segments[hovered]}
        {modelLabel(segment.model)}, {spanText(segment.first, segment.last, segment.length)}
      {:else}
        Select a segment or a flip to move the version control there.
      {/if}
    </p>
  </div>

  {#if across.flips.length === 0}
    <p
      data-testid="no-flips"
      class="rounded-lg border border-slate-200 px-4 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200"
    >
      No change across this range—this configuration resolves to
      <ModelSwatch model={single?.model ?? 'unrecognized'} /> on every version.
    </p>
  {:else}
    <div>
      <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Where the answer flips
      </h3>
      <ul data-testid="flips" class="space-y-2">
        {#each across.flips as flip (flip.version.patch)}
          <li>
            <button
              type="button"
              disabled={!ready}
              data-flip={flip.version.patch}
              onclick={() => onSelectVersion(flip.version)}
              class="focus-visible:outline-primary-600 flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-4 py-2.5 text-left hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:border-slate-500"
            >
              <span class="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                {formatVersion(flip.version)}
              </span>
              <span class="inline-flex items-center gap-2 text-slate-900 dark:text-white">
                <ModelSwatch model={flip.from} />
                <ArrowRight aria-label="becomes" class="size-4" />
                <ModelSwatch model={flip.to} />
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold {flip.direction ===
                'more-expensive'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                  : flip.direction === 'cheaper'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                    : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}"
              >
                {directionText[flip.direction]}
              </span>
              <span class="text-sm text-slate-600 dark:text-slate-300">{flip.note}</span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <ul
    aria-label="Tier legend"
    class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300"
  >
    {#each legend as entry (entry.model)}
      <li class="inline-flex items-center gap-2">
        <ModelSwatch model={entry.model} showName={false} />
        <span
          ><span class="font-mono font-semibold">{modelLabel(entry.model)}</span>: {entry.tier}</span
        >
      </li>
    {/each}
  </ul>
</div>
