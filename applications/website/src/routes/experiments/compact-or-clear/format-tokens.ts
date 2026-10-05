/**
 * Token counts to three significant digits: `400K`, `313K`, `1.25M`. The
 * shared compact formatter stops at one decimal, which turns 1.25M into 1.3M.
 */
export const formatTokens = (count: number): string => {
  if (count < 1_000) return String(Math.round(count));

  const inMillions = count >= 1_000_000;
  const rounded = Number((count / (inMillions ? 1_000_000 : 1_000)).toPrecision(3));

  // 999,600 rounds to 1000K, which reads better as 1M.
  if (!inMillions && rounded >= 1_000) return '1M';

  return `${rounded}${inMillions ? 'M' : 'K'}`;
};
