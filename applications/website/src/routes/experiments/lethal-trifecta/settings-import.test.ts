import { describe, expect, it } from 'vitest';

import { defaultSettingsPrecedence } from '$lib/experiments/settings-scope';
import type { SettingsScope } from '$lib/experiments/settings-scope';

import {
  analyzeSettings,
  bashCommand,
  findLine,
  parseSettingsFile,
  readRuleCovers,
  reachesNetwork,
} from './settings-import';
import type { SettingsFile } from './settings-import';

const file = (
  contents: object | string,
  scope: SettingsScope = 'project',
  id = scope,
): SettingsFile => ({
  id,
  path: `${id}/settings.json`,
  scope,
  text: typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2),
});

const analyze = (...files: SettingsFile[]) => analyzeSettings(files, defaultSettingsPrecedence);

describe('acceptance 5: an .env deny that misses .env.local', () => {
  it('warns that Read(.env) does not cover .env.local', () => {
    const report = analyze(file({ permissions: { deny: ['Read(.env)'] } }));

    const warning = report.warnings.find((candidate) => candidate.id === 'env-pattern');
    expect(warning?.message).toBe(
      'Read(.env) doesn’t cover .env.local. Read(.env) doesn’t match it, and Read(**/.env*) does.',
    );
    expect(warning?.evidence[0]).toMatchObject({ line: 4, lineText: '"Read(.env)"' });
    expect(report.prefill['deny-read-env'].status).toBe('off');
  });

  it('accepts Read(**/.env*) without a warning', () => {
    const report = analyze(file({ permissions: { deny: ['Read(**/.env*)'] } }));

    expect(report.warnings.filter((candidate) => candidate.id === 'env-pattern')).toEqual([]);
    expect(report.prefill['deny-read-env'].status).toBe('on');
  });

  it('counts separate rules for .env and .env.local together', () => {
    const report = analyze(
      file({
        permissions: { deny: ['Read(.env)', 'Read(.env.local)'] },
        sandbox: { filesystem: { denyRead: ['.env', '.env.local'] } },
      }),
    );

    expect(report.warnings.filter((candidate) => candidate.id === 'env-pattern')).toEqual([]);
    expect(report.prefill['deny-read-env'].status).toBe('on');
    expect(report.prefill['deny-read-env'].evidence).toHaveLength(2);
    expect(report.prefill['sandbox-deny-read-env'].status).toBe('on');
  });
});

describe('acceptance 6: a broad allow without allowUnsandboxedCommands: false', () => {
  it('warns that Bash(curl *) also approves the unsandboxed retry', () => {
    const report = analyze(file({ permissions: { allow: ['Bash(curl *)'] } }));

    const warning = report.warnings.find((candidate) => candidate.id === 'unsandboxed-retry');
    expect(warning?.message).toContain('Bash(curl *) also approves an unsandboxed retry');
    expect(warning?.evidence[0].lineText).toBe('"Bash(curl *)"');
  });

  it('stays quiet once allowUnsandboxedCommands is false', () => {
    const report = analyze(
      file({
        permissions: { allow: ['Bash(curl *)'] },
        sandbox: { enabled: true, allowUnsandboxedCommands: false },
      }),
    );

    expect(report.warnings.filter((candidate) => candidate.id === 'unsandboxed-retry')).toEqual([]);
    expect(report.prefill['no-unsandboxed-retry']).toMatchObject({ status: 'on' });
  });

  it('ignores allow rules for commands that do not reach the network', () => {
    const report = analyze(file({ permissions: { allow: ['Bash(ls *)', 'Read'] } }));

    expect(report.warnings).toEqual([]);
  });
});

describe('the other warnings', () => {
  it('flags known exfiltration domains, including through a wildcard and a WebFetch rule', () => {
    const report = analyze(
      file({
        permissions: { allow: ['WebFetch(domain:huggingface.co)'] },
        sandbox: { network: { allowedDomains: ['*.github.com', 'registry.npmjs.org'] } },
      }),
    );

    const messages = report.warnings
      .filter((candidate) => candidate.id === 'allowlist')
      .map((candidate) => candidate.message);
    // `*.github.com` covers gist and api, but not the apex github.com.
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain('admits gist.github.com through *.github.com');
    expect(messages.at(-1)).toContain('admits huggingface.co');
    expect(report.allowlist).toEqual(['*.github.com', 'registry.npmjs.org', 'huggingface.co']);
  });

  it('flags excluded commands that reach the network', () => {
    const report = analyze(file({ sandbox: { excludedCommands: ['docker compose *', 'make'] } }));

    expect(report.warnings.map((candidate) => candidate.id)).toEqual(['excluded-network']);
    expect(report.excludedNetworkCommand).toBe(true);
  });

  it('flags a strictAllowlist in a repository file, which Claude Code ignores', () => {
    const report = analyze(
      file({ sandbox: { enabled: true, network: { strictAllowlist: true } } }, 'project'),
    );

    expect(report.warnings.map((candidate) => candidate.id)).toEqual(['strict-ignored']);
    expect(report.prefill['default-deny-egress'].status).toBe('off');
  });
});

describe('prefilling controls', () => {
  it('turns on default-deny egress only with the sandbox and a strict allowlist', () => {
    const report = analyze(
      file({ sandbox: { enabled: true, network: { strictAllowlist: true } } }, 'user'),
    );

    expect(report.prefill['default-deny-egress'].status).toBe('on');
    expect(report.prefill['default-deny-egress'].evidence.map((entry) => entry.lineText)).toEqual([
      '"enabled": true,',
      '"strictAllowlist": true',
    ]);
  });

  it('never infers safe: anything not in the files stays not determinable', () => {
    const report = analyze(file({}));

    for (const prefill of Object.values(report.prefill)) {
      expect(prefill.status).toBe('unknown');
    }
    expect(report.prefill.container.reason).toBe('Not determinable from settings.');
  });

  it('reads the rest of the keys', () => {
    const report = analyze(
      file({
        permissions: {
          deny: ['WebFetch', 'Bash(curl:*)'],
          ask: ['Bash(git push:*)'],
          defaultMode: 'auto',
        },
        sandbox: { filesystem: { denyRead: ['~/**/.env*'] } },
        env: { CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1', GITHUB_TOKEN: 'synthetic-value' },
        mcpServers: { tracker: {} },
      }),
    );

    expect(report.prefill['deny-web-fetch'].status).toBe('on');
    expect(report.prefill['deny-curl'].status).toBe('on');
    expect(report.prefill['publish-gate'].status).toBe('on');
    expect(report.prefill['auto-mode'].status).toBe('on');
    expect(report.prefill['sandbox-deny-read-env'].status).toBe('on');
    expect(report.prefill['environment-scrub'].status).toBe('on');
    expect(report.hasMcpServers).toBe(true);
    expect(report.parsed[0].unknownKeys).toEqual(['env.GITHUB_TOKEN']);
    expect(JSON.stringify(report.parsed[0].unknownKeys)).not.toContain('synthetic-value');
  });
});

describe('parsing defensively', () => {
  it('accepts comments and trailing commas, and says so', () => {
    const parsed = parseSettingsFile(file('{\n  // mine\n  "sandbox": { "enabled": true, },\n}'));

    expect(parsed.status).toBe('read');
    expect(parsed.lenient).toBe(true);
    expect(parsed.values.sandboxEnabled[0]).toMatchObject({ value: true, line: 3 });
  });

  it('reports an empty file, a non-JSON file, and a top level that is not an object', () => {
    expect(parseSettingsFile(file('  \n')).status).toBe('empty');
    expect(parseSettingsFile(file('nope')).status).toBe('invalid');
    expect(parseSettingsFile(file('[1, 2]')).status).toBe('not-an-object');
  });

  it('lists unknown keys and ignores them', () => {
    const parsed = parseSettingsFile(
      file({
        model: 'opus',
        permissions: { additionalDirectories: [] },
        sandbox: { network: { x: 1 } },
      }),
    );

    expect(parsed.unknownKeys).toEqual([
      'model',
      'permissions.additionalDirectories',
      'sandbox.network.x',
    ]);
  });
});

describe('conflicts across scopes', () => {
  const files = [
    file({ sandbox: { allowUnsandboxedCommands: false } }, 'user'),
    file({ sandbox: { allowUnsandboxedCommands: true } }, 'project-local'),
  ];

  it('lets the higher scope win and reports the conflict', () => {
    const report = analyze(...files);

    expect(report.prefill['no-unsandboxed-retry'].status).toBe('off');
    expect(report.merged.conflicts).toHaveLength(1);
    expect(report.merged.conflicts[0]).toMatchObject({
      key: 'sandbox.allowUnsandboxedCommands',
      winner: { value: 'true', file: { scope: 'project-local' } },
    });
  });

  it('follows an edited precedence', () => {
    const report = analyzeSettings(files, ['managed', 'user', 'project-local', 'project']);

    expect(report.prefill['no-unsandboxed-retry'].status).toBe('on');
  });

  it('merges lists instead of overriding them', () => {
    const report = analyze(
      file({ permissions: { deny: ['WebFetch'] } }, 'user'),
      file({ permissions: { deny: ['Bash(curl *)'] } }, 'project'),
    );

    expect(report.merged.deny.map((rule) => rule.value)).toEqual(['Bash(curl *)', 'WebFetch']);
  });
});

describe('rule helpers', () => {
  it('reads the command from Bash rules', () => {
    expect(bashCommand('Bash(curl *)')).toBe('curl');
    expect(bashCommand('Bash(git push:*)')).toBe('git push');
    expect(bashCommand('Bash')).toBe('');
    expect(bashCommand('Bash(*)')).toBe('');
    expect(bashCommand('Read(.env)')).toBeNull();
  });

  it('knows which commands reach the network', () => {
    expect(reachesNetwork('curl')).toBe(true);
    expect(reachesNetwork('docker compose *')).toBe(true);
    expect(reachesNetwork('')).toBe(true);
    expect(reachesNetwork('ls')).toBe(false);
  });

  it('matches Read patterns against file names', () => {
    expect(readRuleCovers('Read(.env)', '.env')).toBe(true);
    expect(readRuleCovers('Read(.env)', '.env.local')).toBe(false);
    expect(readRuleCovers('Read(**/.env*)', '.env.local')).toBe(true);
    expect(readRuleCovers('Read(./.env.*)', '.env.local')).toBe(true);
    expect(readRuleCovers('Read', '.env.local')).toBe(true);
    expect(readRuleCovers('Edit(.env)', '.env')).toBe(false);
  });

  it('finds the line under the right parent key', () => {
    const text = '{\n  "a": { "enabled": false },\n  "sandbox": {\n    "enabled": true\n  }\n}';

    expect(findLine(text, ['"sandbox"', '"enabled"'])).toEqual({
      line: 4,
      text: '"enabled": true',
    });
  });
});
