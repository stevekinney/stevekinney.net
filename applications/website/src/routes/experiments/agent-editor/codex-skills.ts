import { isPlainObject } from './document';

/**
 * Codex's `[skills]` table in an agent file. Codex 0.160 keeps only its
 * restrictive entries from an agent file: `[[skills.config]]` rules with
 * `enabled = false`, `bundled.enabled = false`, and
 * `include_instructions = false`. Everything else round-trips unchanged.
 */
export type SkillsTable = Record<string, unknown>;

/** One `[[skills.config]]` entry, which names a skill by `name` or by `path`. */
export type SkillRule = Record<string, unknown>;

export type RuleMatch = 'name' | 'path';

export const asSkillsTable = (value: unknown): SkillsTable => (isPlainObject(value) ? value : {});

/** The `[[skills.config]]` entries, each as read. */
export const skillRules = (skills: SkillsTable): SkillRule[] => {
  const config = skills['config'];

  return Array.isArray(config) ? config.map((rule) => (isPlainObject(rule) ? rule : {})) : [];
};

/** Which key a rule matches by. A rule with `path` and no `name` matches by path. */
export const ruleMatch = (rule: SkillRule): RuleMatch =>
  typeof rule['path'] === 'string' && typeof rule['name'] !== 'string' ? 'path' : 'name';

export const ruleTarget = (rule: SkillRule): string => {
  const value = rule[ruleMatch(rule)];
  return typeof value === 'string' ? value : '';
};

/** A table left with no keys is written as nothing. */
const tidy = (skills: SkillsTable): SkillsTable | undefined =>
  Object.keys(skills).length > 0 ? skills : undefined;

const withoutKey = (record: Record<string, unknown>, key: string): Record<string, unknown> => {
  const next = { ...record };
  delete next[key];
  return next;
};

/** Replaces the rules. No rules removes `config`. */
export const withRules = (skills: SkillsTable, rules: SkillRule[]): SkillsTable | undefined =>
  tidy(rules.length > 0 ? { ...skills, config: rules } : withoutKey(skills, 'config'));

/** A new rule that turns a skill off, the only kind that applies in an agent file. */
export const disableRule = (match: RuleMatch, target = ''): SkillRule => ({
  [match]: target,
  enabled: false,
});

/** Changes the skill a rule names, in place, keeping its other keys. */
export const setRuleTarget = (rule: SkillRule, target: string): SkillRule => ({
  ...rule,
  [ruleMatch(rule)]: target,
});

/** Switches a rule between matching by `name` and by `path`, carrying its value across. */
export const setRuleMatch = (rule: SkillRule, match: RuleMatch): SkillRule => {
  if (match === ruleMatch(rule)) return rule;

  return { [match]: ruleTarget(rule), ...withoutKey(withoutKey(rule, 'name'), 'path') };
};

/** Whether `bundled.enabled = false` is set. */
export const bundledOff = (skills: SkillsTable): boolean =>
  isPlainObject(skills['bundled']) && skills['bundled']['enabled'] === false;

/** Sets or clears `bundled.enabled = false`, keeping any other `bundled` keys. */
export const setBundledOff = (skills: SkillsTable, off: boolean): SkillsTable | undefined => {
  const bundled = isPlainObject(skills['bundled']) ? skills['bundled'] : {};
  const next = off ? { ...bundled, enabled: false } : withoutKey(bundled, 'enabled');

  return tidy(
    Object.keys(next).length > 0 ? { ...skills, bundled: next } : withoutKey(skills, 'bundled'),
  );
};

export const instructionsOff = (skills: SkillsTable): boolean =>
  skills['include_instructions'] === false;

/** Sets or clears `include_instructions = false`. */
export const setInstructionsOff = (skills: SkillsTable, off: boolean): SkillsTable | undefined =>
  tidy(
    off ? { ...skills, include_instructions: false } : withoutKey(skills, 'include_instructions'),
  );

/** The keys this page has no control for, kept as they were read. */
export const otherSkillKeys = (skills: SkillsTable): string[] =>
  Object.keys(skills).filter(
    (key) =>
      !['config', 'bundled', 'include_instructions'].includes(key) && skills[key] !== undefined,
  );

/**
 * Entries Codex reads and then ignores in an agent file, because they grant
 * rather than restrict, such as `bundled.enabled = true`.
 */
export const permissiveSettings = (skills: SkillsTable): string[] => {
  const found: string[] = [];
  if (isPlainObject(skills['bundled']) && skills['bundled']['enabled'] === true) {
    found.push('`bundled.enabled = true`');
  }
  if (skills['include_instructions'] === true) found.push('`include_instructions = true`');

  return found;
};
