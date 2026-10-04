import { tierOfModel } from './models';
import type { ModelValue } from './models';
import { resolve } from './resolve';
import type { ResolverConfiguration } from './resolve';
import { boundaryAt } from './version-boundaries';
import { compareVersions, versionsIn } from './versions';
import type { Version, VersionRange } from './versions';

/** A run of contiguous versions that resolve to the same model. */
export type Segment = {
  model: ModelValue;
  first: Version;
  last: Version;
  /** How many versions the run covers. */
  length: number;
  /** The run's share of the whole range, from 0 to 1. */
  share: number;
};

/** `unknown` means one side has no tier, so there's no cheaper or pricier. */
export type FlipDirection = 'more-expensive' | 'cheaper' | 'unknown';

/** A release where the same configuration starts resolving to a different model. */
export type Flip = {
  version: Version;
  from: ModelValue;
  to: ModelValue;
  direction: FlipDirection;
  /** A few words on why, from the version boundary at this release. */
  note: string;
};

export const flipDirection = (from: ModelValue, to: ModelValue): FlipDirection => {
  const before = tierOfModel(from);
  const after = tierOfModel(to);

  if (before === null || after === null) return 'unknown';

  return after > before ? 'more-expensive' : 'cheaper';
};

export type AcrossVersions = {
  resolutions: { version: Version; model: ModelValue }[];
  segments: Segment[];
  flips: Flip[];
};

/** Resolves one configuration at every version in the range. */
export const resolveAcrossVersions = (
  configuration: ResolverConfiguration,
  range: VersionRange,
): AcrossVersions => {
  const resolutions = versionsIn(range).map((version) => ({
    version,
    model: resolve({ ...configuration, version }).model,
  }));

  const segments: Segment[] = [];
  const flips: Flip[] = [];

  for (const { version, model } of resolutions) {
    const current = segments.at(-1);

    if (current && current.model === model) {
      current.last = version;
      current.length += 1;
    } else {
      if (current) {
        flips.push({
          version,
          from: current.model,
          to: model,
          direction: flipDirection(current.model, model),
          note: boundaryAt(version)?.shortNote ?? '',
        });
      }
      segments.push({ model, first: version, last: version, length: 1, share: 0 });
    }
  }

  for (const segment of segments) segment.share = segment.length / resolutions.length;

  return { resolutions, segments, flips };
};

/** The two models around one release, to check whether it moves this configuration. */
export const flipAt = (
  configuration: ResolverConfiguration,
  boundary: Version,
  previous: Version,
): Flip | null => {
  if (compareVersions(previous, boundary) >= 0) return null;

  const before = resolve({ ...configuration, version: previous }).model;
  const after = resolve({ ...configuration, version: boundary }).model;

  return before === after
    ? null
    : {
        version: boundary,
        from: before,
        to: after,
        direction: flipDirection(before, after),
        note: boundaryAt(boundary)?.shortNote ?? '',
      };
};
