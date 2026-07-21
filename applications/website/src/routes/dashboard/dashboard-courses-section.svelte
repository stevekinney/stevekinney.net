<script lang="ts">
  import formatDate from '$lib/format-date';
  import type { CourseUpdate } from '$lib/dashboard-types';

  import type { DashboardCourseSummary } from './dashboard-page-types';
  import type { SectionState } from './dashboard-section-state';

  type DisplayCourse = DashboardCourseSummary & {
    lastUpdatedAt: string | null;
    lastCommit: CourseUpdate['lastCommit'];
  };

  type Props = {
    /** The build-time course list from `load()`, in its original order. */
    initialCourses: DashboardCourseSummary[];
    section: SectionState<CourseUpdate[]>;
  };

  const { initialCourses, section }: Props = $props();

  /** Places courses without a known update time last, without disturbing the rest of the order. */
  const byMostRecentlyUpdated = (a: DisplayCourse, b: DisplayCourse): number => {
    if (a.lastUpdatedAt === null && b.lastUpdatedAt === null) return 0;
    if (a.lastUpdatedAt === null) return 1;
    if (b.lastUpdatedAt === null) return -1;

    return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
  };

  const courses = $derived.by((): DisplayCourse[] => {
    if (section.kind !== 'ok') {
      return initialCourses.map((course) => ({
        ...course,
        lastUpdatedAt: null,
        lastCommit: null,
      }));
    }

    const updatesBySlug = new Map(section.data.map((update) => [update.slug, update]));

    return initialCourses
      .map((course) => {
        const update = updatesBySlug.get(course.slug);

        return {
          ...course,
          lastUpdatedAt: update?.lastUpdatedAt ?? null,
          lastCommit: update?.lastCommit ?? null,
        };
      })
      .sort(byMostRecentlyUpdated);
  });
</script>

<section aria-labelledby="dashboard-courses-heading" class="space-y-4">
  <h2 id="dashboard-courses-heading" class="prose dark:prose-invert text-2xl font-bold">
    Recently Updated Courses
  </h2>

  {#if section.kind === 'error'}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Live update info is temporarily unavailable — showing what's on the site.
    </p>
  {/if}

  <ul class="space-y-4">
    {#each courses as course (course.slug)}
      <li>
        <a
          href={course.path}
          class="decoration-primary-700 font-semibold underline-offset-2 hover:underline"
        >
          {course.title}
        </a>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{course.description}</p>
        {#if course.lessonCount > 0}
          <p class="text-sm text-slate-500 dark:text-slate-400">{course.lessonCount} lessons</p>
        {/if}
        {#if course.lastUpdatedAt}
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Updated {formatDate(course.lastUpdatedAt)}
          </p>
        {/if}
        {#if course.lastCommit}
          <p class="text-sm text-slate-500 italic dark:text-slate-400">
            <a href={course.lastCommit.url} class="hover:underline">{course.lastCommit.message}</a>
          </p>
        {/if}
      </li>
    {/each}
  </ul>
</section>
