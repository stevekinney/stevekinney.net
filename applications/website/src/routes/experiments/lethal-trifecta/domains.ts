/** A domain that's convenient to allow and just as convenient for carrying data out. */
export type ExfiltrationDomain = { host: string; reason: string };

export const exfiltrationDomains: ExfiltrationDomain[] = [
  {
    host: 'gist.github.com',
    reason:
      'Anyone with a GitHub token can create a gist, and a secret gist is still readable by link.',
  },
  {
    host: 'api.github.com',
    reason: 'The API creates gists, issues, and comments with whatever token is in reach.',
  },
  {
    host: 'github.com',
    reason: 'A push over HTTPS to any repository the token can write to.',
  },
  {
    host: 'camo.githubusercontent.com',
    reason: 'GitHub’s image proxy fetches any URL it’s given, so data rides out in the URL.',
  },
  {
    host: 'huggingface.co',
    reason: 'Anyone can upload a dataset or a model, and both hold arbitrary files.',
  },
];

/** Lowercases a domain entry and drops a scheme, a path, and a port, so `https://Gist.GitHub.com/x` reads as `gist.github.com`. */
export const normalizeDomain = (entry: string): string =>
  entry
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');

/**
 * Whether an allowlist entry admits a host. An entry matches its own host, a
 * leading `*.` matches any subdomain, and a bare `*` matches everything.
 */
export const domainMatches = (entry: string, host: string): boolean => {
  const pattern = normalizeDomain(entry);
  const target = normalizeDomain(host);

  if (pattern === '*') return true;
  if (pattern.startsWith('*.')) return target.endsWith(pattern.slice(1));

  return pattern === target;
};

/** The known exfiltration domains an allowlist admits, each with the entry that admits it. */
export const exfiltrationMatches = (
  allowlist: readonly string[],
): { domain: ExfiltrationDomain; entry: string }[] =>
  exfiltrationDomains.flatMap((domain) => {
    const entry = allowlist.find((candidate) => domainMatches(candidate, domain.host));

    return entry === undefined ? [] : [{ domain, entry }];
  });
