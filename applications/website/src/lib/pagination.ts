export const POSTS_PER_PAGE = 15;

export type PaginatedResult<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
};

export function paginate<T>(items: T[], page: number): PaginatedResult<T> {
  const totalPages = Math.ceil(items.length / POSTS_PER_PAGE);
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  const start = (clampedPage - 1) * POSTS_PER_PAGE;

  return {
    items: items.slice(start, start + POSTS_PER_PAGE),
    currentPage: clampedPage,
    totalPages,
  };
}

export function buildWritingPageHref(page: number): string {
  if (page <= 1) return '/writing';
  return `/writing/page/${page}`;
}
