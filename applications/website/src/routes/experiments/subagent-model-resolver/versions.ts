/** A Claude Code version, such as 2.1.278. */
export type Version = { major: number; minor: number; patch: number };

export type VersionRange = { first: Version; last: Version };

const versionPattern = /^v?(\d+)\.(\d+)\.(\d+)$/;

export const parseVersion = (text: string): Version | null => {
  const match = versionPattern.exec(text.trim());

  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
};

/** Finds the first `x.y.z` in a line, such as the output of `claude --version`. */
export const findVersion = (text: string): Version | null => {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(text);

  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
};

export const formatVersion = ({ major, minor, patch }: Version): string =>
  `${major}.${minor}.${patch}`;

export const compareVersions = (first: Version, second: Version): number =>
  first.major - second.major || first.minor - second.minor || first.patch - second.patch;

export const isAtLeast = (version: Version, minimum: Version): boolean =>
  compareVersions(version, minimum) >= 0;

export const isBefore = (version: Version, limit: Version): boolean =>
  compareVersions(version, limit) < 0;

/** Shorthand for the 2.1 line this tool covers: `v(257)` is 2.1.257. */
export const v = (patch: number): Version => ({ major: 2, minor: 1, patch });

export const defaultRange: VersionRange = { first: v(190), last: v(289) };

/** The version the presets start on, and the one a new visitor sees. */
export const defaultVersion: Version = v(278);

/** The range's width in versions, counting both ends. */
export const rangeLength = (range: VersionRange): number =>
  range.last.patch - range.first.patch + 1;

/** The most versions a range may span. Each one is resolved and drawn, so a link can't ask for billions. */
export const MAXIMUM_RANGE_LENGTH = 500;

/**
 * A range has to stay inside one minor line, so each patch number is one
 * version, it needs at least two versions to compare, and it can't span more
 * than `MAXIMUM_RANGE_LENGTH`.
 */
export const isValidRange = ({ first, last }: VersionRange): boolean =>
  first.major === last.major &&
  first.minor === last.minor &&
  last.patch > first.patch &&
  rangeLength({ first, last }) <= MAXIMUM_RANGE_LENGTH;

export const clampVersion = (version: Version, range: VersionRange): Version => {
  if (compareVersions(version, range.first) < 0) return range.first;
  if (compareVersions(version, range.last) > 0) return range.last;

  return version;
};

export const isInRange = (version: Version, range: VersionRange): boolean =>
  compareVersions(version, clampVersion(version, range)) === 0;

/** Every version in the range, oldest first. */
export const versionsIn = (range: VersionRange): Version[] =>
  Array.from({ length: rangeLength(range) }, (_, index) => ({
    major: range.first.major,
    minor: range.first.minor,
    patch: range.first.patch + index,
  }));
