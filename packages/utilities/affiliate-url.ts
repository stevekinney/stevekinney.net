const AFFILIATE_ORIGINS = new Set(['https://frontendmasters.com', 'https://master.dev']);

const AFFILIATE_PARAMETERS = {
  utm_source: 'kinney',
  utm_medium: 'social',
  code: 'kinney',
} as const;

export const addAffiliateParameters = (value: string): string => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!AFFILIATE_ORIGINS.has(url.origin)) return value;

  for (const [name, parameterValue] of Object.entries(AFFILIATE_PARAMETERS)) {
    if (!url.searchParams.has(name)) url.searchParams.set(name, parameterValue);
  }

  return url.toString();
};
