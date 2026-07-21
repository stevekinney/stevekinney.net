<script lang="ts">
  import type { GithubStats } from '$lib/dashboard-types';

  import DashboardSkeleton from './dashboard-skeleton.svelte';
  import DashboardStatTile from './dashboard-stat-tile.svelte';
  import type { SectionState } from './dashboard-section-state';
  import { formatMetric } from './format-metric';

  type Props = {
    section: SectionState<GithubStats>;
  };

  const { section }: Props = $props();

  const maxRepositoryCommits = $derived(
    section.kind === 'ok'
      ? Math.max(1, ...section.data.commits.byRepository.map((repository) => repository.commits))
      : 1,
  );
</script>

<section aria-labelledby="dashboard-github-heading" class="space-y-4">
  <h2 id="dashboard-github-heading" class="prose dark:prose-invert text-2xl font-bold">
    GitHub — The Last Year
  </h2>

  {#if section.kind === 'loading'}
    <DashboardSkeleton shape="tiles" label="GitHub stats" />
  {:else if section.kind === 'error'}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      GitHub stats are temporarily unavailable.
    </p>
  {:else}
    {@const stats = section.data}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStatTile label="Commits" value={formatMetric(stats.commits.totalLastYear)} />
      <DashboardStatTile
        label="Merged Pull Requests"
        value={formatMetric(stats.pullRequests.mergedLastYear)}
      />
      <DashboardStatTile
        label="Open Pull Requests"
        value={formatMetric(stats.pullRequests.openNow)}
      />
      <DashboardStatTile
        label="Own Issues Closed"
        value={formatMetric(stats.issues.closedLastYear)}
        context="Issues I opened that are now closed"
      />
      <DashboardStatTile
        label="Pull Requests Reviewed"
        value={formatMetric(stats.reviews.totalLastYear)}
      />
      <DashboardStatTile label="Followers" value={formatMetric(stats.followers)} />
      <DashboardStatTile label="Total Stars" value={formatMetric(stats.totalStars)} />
      <DashboardStatTile
        label="Public Repositories"
        value={formatMetric(stats.publicRepositories)}
      />
    </div>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Plus {formatMetric(stats.issues.openedLastYear)} issues opened and {formatMetric(
        stats.commits.privateContributionsLastYear,
      )} private contributions.
    </p>
  {/if}
</section>

<section aria-labelledby="dashboard-commits-heading" class="space-y-4">
  <h2 id="dashboard-commits-heading" class="prose dark:prose-invert text-2xl font-bold">
    Commits by Repository
  </h2>

  {#if section.kind === 'loading'}
    <DashboardSkeleton shape="bars" label="commits by repository" />
  {:else if section.kind === 'error'}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Commit activity is temporarily unavailable.
    </p>
  {:else}
    <ul class="space-y-3">
      {#each section.data.commits.byRepository as repository (repository.nameWithOwner)}
        <li>
          <div class="flex items-baseline justify-between gap-4">
            <a
              href={repository.url}
              class="decoration-primary-700 font-semibold underline-offset-2 hover:underline"
            >
              {repository.nameWithOwner}
            </a>
            <span class="text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
              {formatMetric(repository.commits)}
              {repository.commits === 1 ? 'commit' : 'commits'} &middot; {formatMetric(
                repository.stargazerCount,
              )}
              {repository.stargazerCount === 1 ? 'star' : 'stars'}
            </span>
          </div>
          <div class="mt-1 h-2 rounded bg-slate-200 dark:bg-slate-700" aria-hidden="true">
            <div
              class="bg-primary-600 dark:bg-primary-400 h-2 rounded"
              style:width={`${(repository.commits / maxRepositoryCommits) * 100}%`}
            ></div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
