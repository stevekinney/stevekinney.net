import { clampField, defaultScenario } from './scenario';
import type { NumericField, Scenario } from './scenario';

/** Short keys for the URL's hash, which never reaches a server. */
const keys: Record<NumericField, string> = {
  agents: 'agents',
  prsPerAgent: 'prs',
  linesPerPr: 'lines',
  linesPerSitting: 'sitting',
  minutesPerSitting: 'minutes',
  sittings: 'sittings',
  fatiguedFactor: 'fatigue',
  defectDensity: 'density',
  freshDetection: 'detection',
  followUpShare: 'followup',
  followUpMinutes: 'followupMinutes',
  days: 'days',
};

const fields = Object.keys(keys) as NumericField[];

/** The scenario as `key=value` pairs. It holds the controls and nothing pasted or played. */
export const encodeScenario = (scenario: Scenario): string => {
  const parameters = new URLSearchParams();

  for (const field of fields) parameters.set(keys[field], String(scenario[field]));
  parameters.set('policy', scenario.policy);

  return parameters.toString();
};

/** Reads a shared scenario back, keeping only valid values within their limits. Null when nothing applies. */
export const decodeScenario = (query: string): Partial<Scenario> | null => {
  const parameters = new URLSearchParams(query);
  const scenario: Partial<Scenario> = {};

  for (const field of fields) {
    const text = parameters.get(keys[field]);
    if (text === null || !/^(\d+(\.\d+)?|\.\d+)$/.test(text)) continue;

    const value = Number(text);
    if (Number.isFinite(value)) scenario[field] = clampField(field, value);
  }

  const policy = parameters.get('policy');
  if (policy === 'queue' || policy === 'tired') scenario.policy = policy;

  return Object.keys(scenario).length === 0 ? null : scenario;
};

/** A complete scenario from a shared link, with defaults for whatever it leaves out. */
export const scenarioFromLink = (query: string): Scenario | null => {
  const shared = decodeScenario(query);

  return shared ? { ...defaultScenario, ...shared } : null;
};
