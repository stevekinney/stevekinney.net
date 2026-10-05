import { describe, expect, it } from 'vitest';

import { defaultSettingsPrecedence } from '$lib/experiments/settings-scope';

import { applySettings } from './apply-settings';
import { evaluate } from './evaluate';
import { defaultState } from './presets';
import { analyzeSettings } from './settings-import';

const report = (settings: object) =>
  analyzeSettings(
    [{ id: 'a', path: 'settings.json', scope: 'user', text: JSON.stringify(settings) }],
    defaultSettingsPrecedence,
  );

describe('applying uploaded settings', () => {
  it('fills in what the files settle and leaves the rest alone', () => {
    const state = defaultState();
    state.controls['reader-doer'] = true;

    const next = applySettings(
      state,
      report({
        permissions: { deny: ['WebFetch'] },
        sandbox: {
          enabled: true,
          allowUnsandboxedCommands: false,
          network: { strictAllowlist: true, allowedDomains: ['gist.github.com'] },
        },
      }),
    );

    expect(next.controls['deny-web-fetch']).toBe(true);
    expect(next.controls['default-deny-egress']).toBe(true);
    expect(next.controls['no-unsandboxed-retry']).toBe(true);
    expect(next.controls['reader-doer']).toBe(true);
    expect(next.allowlist).toEqual(['gist.github.com']);
  });

  it('turns a control off when a file says so explicitly', () => {
    const state = defaultState();
    state.controls['no-unsandboxed-retry'] = true;

    const next = applySettings(state, report({ sandbox: { allowUnsandboxedCommands: true } }));
    expect(next.controls['no-unsandboxed-retry']).toBe(false);
  });

  it('turns MCP results on for a configured server and marks excluded network tools', () => {
    const next = applySettings(
      { ...defaultState(), nodes: { ...defaultState().nodes, 'mcp-results': false } },
      report({ mcpServers: { tracker: {} }, sandbox: { excludedCommands: ['curl *'] } }),
    );

    expect(next.nodes['mcp-results']).toBe(true);
    expect(next.excludedNetworkCommand).toBe(true);
  });

  it('changes nothing for an empty upload', () => {
    const state = defaultState();
    const empty = analyzeSettings(
      [{ id: 'a', path: 'settings.json', scope: 'user', text: '' }],
      defaultSettingsPrecedence,
    );

    expect(applySettings(state, empty)).toEqual(state);
    expect(evaluate(applySettings(state, empty)).exploitable).toBe(true);
  });
});
