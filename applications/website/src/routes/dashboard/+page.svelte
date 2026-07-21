<script lang="ts">
  import { onMount } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import formatDate from '$lib/format-date';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema, buildPersonSchema } from '$lib/structured-data';
  import type { DashboardData } from '$lib/dashboard-types';

  import DashboardCoursesSection from './dashboard-courses-section.svelte';
  import { isDashboardData } from './dashboard-data-schema';
  import DashboardGithubSection from './dashboard-github-section.svelte';
  import DashboardNpmSection from './dashboard-npm-section.svelte';
  import type { DashboardPageState } from './dashboard-section-state';
  import { toSectionState } from './dashboard-section-state';

  const { data } = $props();

  let pageState = $state<DashboardPageState>('loading');
  let retrying = $state(false);
  let dashboardData = $state.raw<DashboardData | null>(null);

  const githubSection = $derived(toSectionState(pageState, dashboardData?.github));
  const npmSection = $derived(toSectionState(pageState, dashboardData?.npm));
  const coursesSection = $derived(toSectionState(pageState, dashboardData?.courses));

  const jsonLd = [
    buildBreadcrumbSchema([{ name: 'Dashboard', url: `${url}/dashboard` }]),
    buildPersonSchema(),
  ];

  /** Fetches `/api/dashboard`. Parses defensively — a network or parse failure just fails the page. */
  async function loadDashboardData(): Promise<void> {
    try {
      const response = await fetch('/api/dashboard');
      const payload: unknown = await response.json();

      if (!isDashboardData(payload)) throw new Error('Unexpected dashboard response shape');

      dashboardData = payload;
      pageState = 'loaded';
    } catch {
      dashboardData = null;
      pageState = 'failed';
    }
  }

  /**
   * Retries without leaving the 'failed' state, so the alert (and the focused
   * button inside it) stays mounted for the whole attempt — unmounting it
   * mid-click would strand keyboard focus at the top of the document.
   */
  async function retryDashboardData(): Promise<void> {
    retrying = true;

    await loadDashboardData();

    retrying = false;
  }

  onMount(() => {
    loadDashboardData();
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd}>
  <link
    rel="alternate"
    type="application/atom+xml"
    title="Dashboard updates"
    href="/dashboard/rss"
  />
</SEO>

<div class="space-y-10">
  <div class="prose dark:prose-invert max-w-none">
    <p>
      This page pulls back the curtain on what I've actually been building: a live snapshot of my
      GitHub activity, npm downloads, and course updates from the past year, recomputed at most once
      a day so it stays fresh without hammering anyone's rate limits.
    </p>
  </div>

  {#if pageState === 'failed'}
    <div
      class="rounded-md border border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
      role="alert"
    >
      <p>I couldn't load the live dashboard data just now.</p>
      <button
        type="button"
        onclick={retryDashboardData}
        disabled={retrying}
        class="decoration-primary-700 mt-2 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  {/if}

  <DashboardGithubSection section={githubSection} />

  <DashboardNpmSection section={npmSection} />

  <DashboardCoursesSection initialCourses={data.courses} section={coursesSection} />

  <footer
    class="space-y-2 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
  >
    <p>Recomputed at most once every 24 hours.</p>
    {#if dashboardData}
      <p>Last computed {formatDate(dashboardData.generatedAt)}.</p>
    {/if}
    <p>
      Machine-readable versions: <a href="/api/dashboard" class="underline-offset-2 hover:underline"
        >JSON</a
      >, <a href="/dashboard/rss" class="underline-offset-2 hover:underline">Atom</a>, and
      <a href="/dashboard/llms.txt" class="underline-offset-2 hover:underline">plain text</a>.
    </p>
    <noscript>
      <p>
        View the raw data at <a href="/api/dashboard">/api/dashboard</a>, subscribe via
        <a href="/dashboard/rss">/dashboard/rss</a>, or read the plain-text summary at
        <a href="/dashboard/llms.txt">/dashboard/llms.txt</a>.
      </p>
    </noscript>
  </footer>
</div>
