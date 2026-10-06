import type { ExitId, Leg, NodeId, PrivateId } from './model';

/** An agent running in GitHub Actions, described by the four choices that move its legs. */
export type CiScenario = {
  trigger: 'pull_request' | 'pull_request_target';
  /** The workflow trusts an actor because its name ends in `[bot]`. */
  botSuffixAuthorization: boolean;
  credential: 'static' | 'oidc';
  /** The agent commits with the default `GITHUB_TOKEN`. */
  defaultTokenCommits: boolean;
};

export const defaultCiScenario: CiScenario = {
  trigger: 'pull_request_target',
  botSuffixAuthorization: false,
  credential: 'static',
  defaultTokenCommits: false,
};

/** What a choice does to the legs. `adds` and `cuts` name legs; `narrows` means smaller but not cut. */
export type CiEffect = {
  id: string;
  title: string;
  effect: 'adds' | 'cuts' | 'narrows' | 'none';
  legs: Leg[];
  explanation: string;
};

/**
 * The edges GitHub itself removes. On `pull_request` from a fork, GitHub
 * withholds secrets and makes `GITHUB_TOKEN` read-only.
 */
export const ciCuts = (scenario: CiScenario | null): Partial<Record<PrivateId | ExitId, string>> =>
  scenario?.trigger === 'pull_request'
    ? {
        environment: 'pull_request from a fork: GitHub withholds your secrets',
        'git-push': 'pull_request from a fork: GITHUB_TOKEN is read-only',
        'public-comment': 'pull_request from a fork: GITHUB_TOKEN is read-only',
      }
    : {};

export const describeCiScenario = (scenario: CiScenario): CiEffect[] => [
  scenario.trigger === 'pull_request'
    ? {
        id: 'trigger',
        title: 'pull_request',
        effect: 'cuts',
        legs: ['private', 'exit'],
        explanation:
          'On a pull request from a fork, GitHub withholds your secrets and makes GITHUB_TOKEN read-only. The tokens and the push and comment exits go. The repository source and the network stay.',
      }
    : {
        id: 'trigger',
        title: 'pull_request_target',
        effect: 'adds',
        legs: ['untrusted', 'private', 'exit'],
        explanation:
          'It runs with your secrets and a write token against code you didn’t write. The agent doesn’t have to run the attacker’s code. Reading it is enough.',
      },
  scenario.botSuffixAuthorization
    ? {
        id: 'bot',
        title: 'Authorization from a [bot] suffix',
        effect: 'adds',
        legs: ['untrusted'],
        explanation:
          'Trusting an actor because its name ends in [bot] is a string check. Any trigger payload that passes it reaches the agent as if it came from you.',
      }
    : {
        id: 'bot',
        title: 'Authorization from a real allowlist',
        effect: 'none',
        legs: [],
        explanation:
          'Only the people you named can start the job. Their payloads can still quote untrusted text.',
      },
  scenario.credential === 'static'
    ? {
        id: 'credential',
        title: 'A static token',
        effect: 'adds',
        legs: ['private'],
        explanation:
          'A long-lived secret in a process anyone can prompt-inject leaks a piece at a time, and it stays useful after the job ends.',
      }
    : {
        id: 'credential',
        title: 'OIDC federation',
        effect: 'narrows',
        legs: ['private'],
        explanation:
          'The job’s token expires with the job. It’s still readable while the job runs, so the private-data leg narrows rather than goes.',
      },
  scenario.defaultTokenCommits
    ? {
        id: 'commits',
        title: 'Commits made with the default GITHUB_TOKEN',
        effect: 'none',
        legs: [],
        explanation:
          'They don’t trigger CI, so “the checks passed” can mean no checks ran. It adds no leg, but it removes a check you thought you had. Require named checks.',
      }
    : {
        id: 'commits',
        title: 'Commits that trigger CI',
        effect: 'none',
        legs: [],
        explanation: 'Your required checks run on what the agent pushes.',
      },
];

/** Which nodes a CI agent has, for the choices that decide them. */
export const ciNodes = (scenario: CiScenario): Partial<Record<NodeId, boolean>> => ({
  issues: true,
  'web-pages': false,
  dependencies: true,
  'mcp-results': false,
  'ci-payloads': scenario.botSuffixAuthorization || scenario.trigger === 'pull_request_target',
  'cloned-repositories': true,
  environment: true,
  'env-files': false,
  source: true,
  'customer-data': false,
  transcripts: false,
  'shell-network': true,
  'unsandboxed-shell': false,
  'web-fetch': true,
  'git-push': true,
  'public-comment': true,
  'mcp-write': false,
  'deferred-execution': false,
});
