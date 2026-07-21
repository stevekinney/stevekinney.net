<script lang="ts">
  import type { NpmStats } from '$lib/dashboard-types';

  import DashboardSkeleton from './dashboard-skeleton.svelte';
  import DashboardStatTile from './dashboard-stat-tile.svelte';
  import type { SectionState } from './dashboard-section-state';
  import { formatMetric } from './format-metric';

  const TOP_PACKAGE_COUNT = 10;

  type Props = {
    section: SectionState<NpmStats>;
  };

  const { section }: Props = $props();

  const topPackages = $derived(
    section.kind === 'ok' ? section.data.topPackages.slice(0, TOP_PACKAGE_COUNT) : [],
  );
</script>

<section aria-labelledby="dashboard-npm-heading" class="space-y-4">
  <h2 id="dashboard-npm-heading" class="prose dark:prose-invert text-2xl font-bold">npm</h2>

  {#if section.kind === 'loading'}
    <DashboardSkeleton shape="tiles" label="npm stats" count={2} />
    <DashboardSkeleton shape="rows" label="top npm packages" />
  {:else if section.kind === 'error'}
    <p class="text-sm text-slate-500 dark:text-slate-400">npm stats are temporarily unavailable.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      <DashboardStatTile
        label="Downloads (Last Year)"
        value={formatMetric(section.data.totalDownloadsLastYear)}
      />
      <DashboardStatTile label="Packages" value={formatMetric(section.data.packageCount)} />
    </div>
    <ol class="space-y-3">
      {#each topPackages as pkg (pkg.name)}
        <li>
          <div class="flex items-baseline justify-between gap-4">
            <a
              href={pkg.url}
              class="decoration-primary-700 font-semibold underline-offset-2 hover:underline"
            >
              {pkg.name}
            </a>
            <span class="text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
              {formatMetric(pkg.downloadsLastYear)} downloads
            </span>
          </div>
          {#if pkg.description}
            <p class="truncate text-sm text-slate-600 dark:text-slate-300">{pkg.description}</p>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</section>
