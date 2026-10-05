import { slugify } from './pricing';
import type { ModelPrice, PricingTable } from './pricing';

/** A model's family and version, such as `{ family: 'opus', version: '5-5' }`. */
export type ModelIdentity = { family: string; version: string };

const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'] as const;

/** A trailing `-0` is the same version: `opus-5-0` is `opus-5`. */
const normalizeVersion = (version: string): string => version.replace(/(?:-0)+$/, '');

/**
 * Reads the family and full version out of a model ID as Claude Code records
 * it. Lowercases, drops a trailing `[1m]` context marker and a `-YYYYMMDD`
 * date, and accepts both `claude-opus-5-5` and the older
 * `claude-3-5-sonnet-20241022` ordering. Returns `null` for anything else.
 */
export const parseModelId = (modelId: string): ModelIdentity | null => {
  const normalized = modelId
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]*\]$/, '')
    .replace(/-\d{8}$/, '');

  const family = FAMILIES.find((candidate) => normalized.includes(candidate));
  if (!family) return null;

  const current = new RegExp(`(?:^|-)${family}-(\\d+(?:-\\d+)*)$`).exec(normalized);
  if (current) return { family, version: normalizeVersion(current[1]) };

  const legacy = new RegExp(`^claude-(\\d+(?:-\\d+)*)-${family}$`).exec(normalized);
  if (legacy) return { family, version: normalizeVersion(legacy[1]) };

  return null;
};

const identitiesOf = (model: ModelPrice): ModelIdentity[] =>
  [model.id, slugify(model.name)].flatMap((text) => {
    const identity = parseModelId(text);

    return identity ? [identity] : [];
  });

/**
 * Finds the model in the table that an imported ID names. The family and the
 * whole version have to agree: a substring test for `opus-5` would also match
 * `claude-opus-5-5` and price Opus 5.5 at Opus 5's rates. Returns `null` when
 * nothing matches, which is the common case for models the table doesn't list.
 */
export const matchModel = (modelId: string, table: PricingTable): ModelPrice | null => {
  const wanted = parseModelId(modelId);
  if (!wanted) return null;

  return (
    table.models.find((model) =>
      identitiesOf(model).some(
        (identity) => identity.family === wanted.family && identity.version === wanted.version,
      ),
    ) ?? null
  );
};
