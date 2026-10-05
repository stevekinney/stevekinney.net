import { describe, expect, it } from 'vitest';

import { evaluate } from './evaluate';
import type { TrifectaState } from './evaluate';
import { controlById, exits } from './model';
import type { ControlId } from './model';
import { ciState, defaultState, findPreset, noControls } from './presets';
import { describeVerdict } from './verdict';

const preset = (id: string): TrifectaState => {
  const found = findPreset(id);
  if (!found) throw new Error(`No preset ${id}`);

  return found.state();
};

const withControls = (state: TrifectaState, ...on: ControlId[]): TrifectaState => ({
  ...state,
  controls: { ...state.controls, ...Object.fromEntries(on.map((id) => [id, true])) },
});

describe('acceptance 1: the default coding agent', () => {
  it('is exploitable, with the path from an issue through env tokens to the network', () => {
    const evaluation = evaluate(defaultState());

    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.path?.source.node.id).toBe('issues');
    expect(evaluation.path?.data.node.id).toBe('environment');
    expect(evaluation.path?.exit.node.id).toBe('shell-network');
    expect(evaluation.path?.sentence).toBe(
      'A stranger’s issue → agent context ← exported tokens in the environment → the shell network.',
    );
    expect(describeVerdict(evaluation)).toMatchObject({
      headline: 'Exploitable',
      detail: 'all three legs are intact.',
    });
  });
});

describe('acceptance 2: the careful team', () => {
  it('is still exploitable, because none of its controls cuts an edge', () => {
    const evaluation = evaluate(preset('careful'));

    expect(evaluation.exploitable).toBe(true);
    for (const edge of Object.values(evaluation.edges)) {
      expect(edge.cuts.map((cut) => cut.control)).not.toContain('claude-md-line');
      expect(edge.cuts.map((cut) => cut.control)).not.toContain('auto-mode');
      expect(edge.cuts.map((cut) => cut.control)).not.toContain('deny-curl');
    }
  });

  it('goes out through another HTTP client, and lists the curl deny as partial', () => {
    const evaluation = evaluate(preset('careful'));

    expect(evaluation.path?.exit.phrase).toBe(
      'the shell network, through any HTTP client but curl',
    );
    expect(evaluation.live.exits.map((edge) => edge.node.id)).toContain('web-fetch');
    expect(evaluation.residualRisks).toContainEqual(
      expect.objectContaining({ kind: 'partial', text: expect.stringContaining('curl only') }),
    );
  });
});

describe('acceptance 3: strict egress', () => {
  it('starts with five exits, and deferred execution off', () => {
    const evaluation = evaluate(defaultState());

    expect(evaluation.live.exits.map((edge) => edge.node.id)).toEqual([
      'shell-network',
      'unsandboxed-shell',
      'web-fetch',
      'git-push',
      'public-comment',
    ]);
    expect(evaluation.edges['deferred-execution'].state).toBe('absent');
  });

  const strict = (): TrifectaState =>
    withControls(
      defaultState(),
      'default-deny-egress',
      'no-unsandboxed-retry',
      'deny-web-fetch',
      'publish-gate',
    );

  it('is not exploitable, with the way out cut and push and comments as residual risks', () => {
    const evaluation = evaluate(strict());

    expect(evaluation.exploitable).toBe(false);
    expect(evaluation.legs.exit).toBe('cut');
    expect(describeVerdict(evaluation)).toMatchObject({
      headline: 'Leg cut',
      detail: 'no path from untrusted content to an exit carries private data.',
      legLine: 'Leg cut: a way out.',
    });

    const gated = evaluation.residualRisks.filter((risk) => risk.kind === 'human-gate');
    expect(gated).toHaveLength(2);
    expect(gated[0].text).toContain('→ a git push, held only by the prompt');
    expect(gated[1].text).toContain('→ a public comment, held only by the prompt');
    expect(evaluation.edges['git-push'].state).toBe('gated');
    expect(evaluation.edges['public-comment'].state).toBe('gated');
  });

  it('is exploitable again through the allowlist once gist.github.com is on it', () => {
    const evaluation = evaluate({ ...strict(), allowlist: ['gist.github.com'] });

    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.path?.exit.node.id).toBe('shell-network');
    expect(evaluation.path?.exit.phrase).toBe('the shell network to allowlisted gist.github.com');
    expect(evaluation.path?.exit.note).toContain('the allowlist admits gist.github.com');
  });

  it('reopens through a wildcard that covers a known domain, but not through an unrelated one', () => {
    expect(evaluate({ ...strict(), allowlist: ['*.github.com'] }).exploitable).toBe(true);
    expect(evaluate({ ...strict(), allowlist: ['registry.npmjs.org'] }).exploitable).toBe(false);
  });
});

describe('acceptance 4: the reader/doer split', () => {
  it('cuts the untrusted-content leg with every other default in place', () => {
    const evaluation = evaluate(withControls(defaultState(), 'reader-doer'));

    expect(evaluation.exploitable).toBe(false);
    expect(evaluation.legs).toEqual({ untrusted: 'cut', private: 'intact', exit: 'intact' });
    expect(describeVerdict(evaluation).legLine).toBe(
      'Leg cut: untrusted content reaching the acting agent.',
    );
  });

  it('keeps untrusted content live when the plan is fixed first, since it still supplies arguments', () => {
    const evaluation = evaluate(withControls(defaultState(), 'plan-first'));

    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.legs.untrusted).toBe('intact');
    expect(evaluation.path?.source.state).toBe('live');
    expect(evaluation.path?.source.cuts).toEqual([]);
    expect(evaluation.path?.source.note).toMatch(
      /^Partial: fixes the actions, not their arguments\./,
    );
    expect(evaluation.residualRisks).toContainEqual(
      expect.objectContaining({ kind: 'partial', text: expect.stringContaining('arguments') }),
    );
    expect(controlById['plan-first']).toMatchObject({ kind: 'architectural', partial: true });
  });

  it('still cuts the leg with the reader/doer split beside planning first', () => {
    const evaluation = evaluate(withControls(defaultState(), 'plan-first', 'reader-doer'));

    expect(evaluation.legs.untrusted).toBe('cut');
    expect(describeVerdict(evaluation).legLine).toBe(
      'Leg cut: untrusted content reaching the acting agent.',
    );
  });
});

describe('the other presets', () => {
  it('finds the sandboxed preset exploitable only through the allowlist', () => {
    const evaluation = evaluate(preset('allowlist'));

    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.live.exits.map((edge) => edge.node.id)).toEqual(['shell-network']);
  });

  it('cuts the way out in a container and narrows private data to the source', () => {
    const evaluation = evaluate(preset('container'));

    expect(evaluation.exploitable).toBe(false);
    expect(evaluation.legs).toEqual({ untrusted: 'intact', private: 'intact', exit: 'cut' });
    expect(evaluation.live.data.map((edge) => edge.node.id)).toEqual(['source']);
    expect(describeVerdict(evaluation).legLine).toBe('Leg cut: a way out.');
  });
});

describe('which edges a control touches', () => {
  const touched = (state: TrifectaState, id: ControlId): string[] =>
    Object.values(evaluate(state).edges)
      .filter((edge) => edge.state !== 'absent' && edge.touchedBy.includes(id))
      .map((edge) => edge.node.id);

  it('has default-deny egress touch only the shell network without a container', () => {
    expect(touched(defaultState(), 'default-deny-egress')).toEqual(['shell-network']);
  });

  it('has the container touch only private data while egress is open', () => {
    expect(touched(defaultState(), 'container')).toEqual([
      'environment',
      'env-files',
      'transcripts',
    ]);
  });

  it('has both touch every network exit together', () => {
    const state = preset('container');

    expect(touched(state, 'default-deny-egress')).toEqual([
      'shell-network',
      'unsandboxed-shell',
      'web-fetch',
      'git-push',
      'public-comment',
    ]);
    expect(touched(state, 'container')).toContain('web-fetch');
  });
});

describe('edge cases', () => {
  it('says no sources is unusual', () => {
    const state = defaultState();
    for (const id of [
      'issues',
      'web-pages',
      'dependencies',
      'mcp-results',
      'ci-payloads',
      'cloned-repositories',
    ] as const) {
      state.nodes[id] = false;
    }

    const evaluation = evaluate(state);
    expect(evaluation.exploitable).toBe(false);
    expect(evaluation.noSources).toBe(true);
    expect(describeVerdict(evaluation).detail).toContain(
      'unusual for a coding agent—are you sure?',
    );
  });

  it('handles every control on', () => {
    const state = defaultState();
    state.controls = Object.fromEntries(Object.keys(noControls).map((id) => [id, true])) as Record<
      ControlId,
      boolean
    >;
    for (const { id } of exits) state.nodes[id] = true;

    const evaluation = evaluate(state);
    expect(evaluation.exploitable).toBe(false);
    // core.fsmonitor false leaves Git hooks and build scripts, so deferred execution stays a way out.
    expect(evaluation.cutLegNames).toEqual(['untrusted content reaching the acting agent']);
    expect(evaluation.live.exits.map((edge) => edge.node.id)).toEqual(['deferred-execution']);
    expect(evaluation.live.data.map((edge) => edge.node.id)).toEqual(['source']);
  });

  it('keeps an excluded network command open when retries are off', () => {
    const state = withControls(defaultState(), 'no-unsandboxed-retry');
    expect(evaluate(state).edges['unsandboxed-shell'].state).toBe('cut');

    state.excludedNetworkCommand = true;
    expect(evaluate(state).edges['unsandboxed-shell'].state).toBe('live');
  });

  it('needs both .env controls to cut .env files', () => {
    const readOnly = evaluate(withControls(defaultState(), 'deny-read-env'));
    expect(readOnly.edges['env-files'].state).toBe('live');
    expect(readOnly.edges['env-files'].note).toContain('cat .env');

    const both = evaluate(withControls(defaultState(), 'deny-read-env', 'sandbox-deny-read-env'));
    expect(both.edges['env-files'].state).toBe('cut');
  });

  it('keeps deferred execution live with core.fsmonitor false, which is only one vector', () => {
    const state = withControls(defaultState(), 'fsmonitor-off');
    state.nodes['deferred-execution'] = true;

    const evaluation = evaluate(state);
    const edge = evaluation.edges['deferred-execution'];
    expect(edge.state).toBe('live');
    expect(edge.cuts).toEqual([]);
    expect(edge.note).toMatch(/^Partial: core\.fsmonitor only\./);
    expect(edge.touchedBy).toContain('fsmonitor-off');
    expect(controlById['fsmonitor-off'].kind).toBe('partial');
    expect(evaluation.residualRisks).toContainEqual(
      expect.objectContaining({ kind: 'partial', text: expect.stringContaining('Git hooks') }),
    );
  });

  it('finds a path through deferred execution when it is the only exit, even with fsmonitor off', () => {
    const state = withControls(defaultState(), 'fsmonitor-off');
    for (const { id } of exits) state.nodes[id] = id === 'deferred-execution';

    const evaluation = evaluate(state);
    expect(evaluation.legs.exit).toBe('intact');
    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.path?.exit.node.id).toBe('deferred-execution');
  });
});

describe('CI scenarios', () => {
  it('pull_request_target keeps all three legs', () => {
    expect(evaluate(ciState()).exploitable).toBe(true);
  });

  it('pull_request from a fork removes the secrets and the write token, but not the network', () => {
    const evaluation = evaluate(
      ciState({
        trigger: 'pull_request',
        botSuffixAuthorization: false,
        credential: 'static',
        defaultTokenCommits: false,
      }),
    );

    expect(evaluation.edges.environment.state).toBe('cut');
    expect(evaluation.edges['git-push'].state).toBe('cut');
    expect(evaluation.edges['public-comment'].state).toBe('cut');
    expect(evaluation.exploitable).toBe(true);
    expect(evaluation.path?.data.node.id).toBe('source');
  });
});
