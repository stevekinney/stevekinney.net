import type { CiScenario } from './ci-scenarios';
import { exfiltrationDomains, normalizeDomain } from './domains';
import type { TrifectaState } from './evaluate';
import { controls, nodes } from './model';
import type { ControlId, NodeId } from './model';
import { noControls } from './presets';

const nodeIds = new Set<string>(nodes.map(({ id }) => id));
const controlIds = new Set<string>(controls.map(({ id }) => id));
const shareableDomains = new Set(exfiltrationDomains.map(({ host }) => host));

const list = (value: string | null): string[] =>
  value === null || value === '' ? [] : value.split(',').map((item) => item.trim());

/**
 * The toggles as `key=value` pairs for the address's hash, which never reaches
 * a server. Only the known exfiltration domains travel. A domain from an
 * uploaded file, and the file itself, never do.
 */
export const encodeState = (state: TrifectaState): string => {
  const parameters = new URLSearchParams();

  parameters.set(
    'nodes',
    nodes
      .filter(({ id }) => state.nodes[id])
      .map(({ id }) => id)
      .join(','),
  );
  parameters.set(
    'controls',
    controls
      .filter(({ id }) => state.controls[id])
      .map(({ id }) => id)
      .join(','),
  );

  const domains = state.allowlist
    .map(normalizeDomain)
    .filter((domain) => shareableDomains.has(domain));
  if (domains.length > 0) parameters.set('allow', domains.join(','));
  if (state.excludedNetworkCommand) parameters.set('excluded', '1');

  if (state.ci) {
    parameters.set(
      'ci',
      [
        state.ci.trigger === 'pull_request' ? 'pr' : 'target',
        state.ci.botSuffixAuthorization ? 'bot' : 'named',
        state.ci.credential,
        state.ci.defaultTokenCommits ? 'default-token' : 'checks',
      ].join(','),
    );
  }

  return parameters.toString();
};

const decodeCi = (value: string | null): CiScenario | null => {
  const [trigger, bot, credential, commits] = list(value);
  if (!trigger || !bot || !credential || !commits) return null;
  if (!['pr', 'target'].includes(trigger) || !['bot', 'named'].includes(bot)) return null;
  if (!['static', 'oidc'].includes(credential) || !['default-token', 'checks'].includes(commits)) {
    return null;
  }

  return {
    trigger: trigger === 'pr' ? 'pull_request' : 'pull_request_target',
    botSuffixAuthorization: bot === 'bot',
    credential: credential as CiScenario['credential'],
    defaultTokenCommits: commits === 'default-token',
  };
};

/** Reads a shared link back, keeping only what it recognizes. `null` means it held nothing to restore. */
export const decodeState = (query: string): TrifectaState | null => {
  const parameters = new URLSearchParams(query);
  if (!parameters.has('nodes') && !parameters.has('controls')) return null;

  const onNodes = new Set(list(parameters.get('nodes')).filter((id) => nodeIds.has(id)));
  const onControls = list(parameters.get('controls')).filter((id) => controlIds.has(id));

  return {
    nodes: Object.fromEntries(nodes.map(({ id }) => [id, onNodes.has(id)])) as Record<
      NodeId,
      boolean
    >,
    controls: {
      ...noControls,
      ...Object.fromEntries(onControls.map((id) => [id as ControlId, true])),
    },
    allowlist: [
      ...new Set(
        list(parameters.get('allow'))
          .map(normalizeDomain)
          .filter((domain) => shareableDomains.has(domain)),
      ),
    ],
    excludedNetworkCommand: parameters.get('excluded') === '1',
    ci: decodeCi(parameters.get('ci')),
  };
};
