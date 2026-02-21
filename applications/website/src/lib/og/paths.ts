export const normalizeOpenGraphPath = (pathname: string): string => {
  if (!pathname) return '/';

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
};
