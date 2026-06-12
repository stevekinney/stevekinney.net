import type { CourseContentsData } from '@stevekinney/utilities/content-types';

/** A single navigable lesson, identified by its slug and display title. */
export type LessonNavigationItem = {
  title: string;
  slug: string;
};

/** The lessons immediately before and after the current one, if any. */
export type LessonNavigation = {
  previous: LessonNavigationItem | null;
  next: LessonNavigationItem | null;
};

/**
 * Flattens a course's sections into an ordered list of internal lessons,
 * dropping items without an `href` and items that point at external URLs or
 * non-markdown targets. `href` is typed as a string in the content model, but
 * the underlying TOML is untyped, so guard defensively to match the validation
 * pipeline.
 */
export const collectLessonItems = (
  contents: CourseContentsData | undefined,
): LessonNavigationItem[] =>
  (contents?.section ?? [])
    .flatMap((section) => section.item ?? [])
    .filter(
      (item): item is typeof item & { href: string } =>
        typeof item.href === 'string' && !item.href.startsWith('http') && /\.md$/i.test(item.href),
    )
    .map((item) => ({ title: item.title, slug: item.href.replace(/\.md$/i, '') }));

/**
 * Resolves the previous and next lessons relative to `currentSlug` within a
 * course. Returns `null` for either direction when the current lesson is at an
 * edge, is not found in the list, the list is empty, or the slug is undefined.
 */
export const getLessonNavigation = (
  contents: CourseContentsData | undefined,
  currentSlug: string | undefined,
): LessonNavigation => {
  const lessons = collectLessonItems(contents);
  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);

  if (currentIndex === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: currentIndex > 0 ? lessons[currentIndex - 1] : null,
    next: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null,
  };
};
