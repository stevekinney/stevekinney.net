export const normalizeRoutePath = (value: string): string => {
  if (!value) return '/';
  const normalized = value === '/' ? value : value.replace(/\/+$/, '');
  return normalized || '/';
};
