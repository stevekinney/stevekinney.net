// get-pr-comments.ts
//
// Usage:
//   export GITHUB_TOKEN="ghp_..."
//   bun run scripts/get-pr-comments.ts
//
// What it does:
//   - Figures out the GitHub repo for the current directory by reading `git remote get-url origin`
//   - Gets the current branch name
//   - Finds an open PR whose head matches that branch (if any)
//   - Fetches *unresolved* review threads via GraphQL, then returns the review comments inside them

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remove } from 'unist-util-remove';
import type { Root } from 'mdast';

type RepoRef = { owner: string; repo: string };

/**
 * Strips HTML nodes from markdown content while preserving the markdown formatting.
 */
function stripHtmlFromMarkdown(markdown: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(() => (tree: Root) => {
      remove(tree, (node) => node.type === 'html');
    })
    .use(remarkStringify);

  return processor.processSync(markdown).toString().trim();
}

type UnresolvedReviewComment = {
  prNumber: number;
  threadId: string;
  commentId: string;
  author: string | null;
  body: string;
  path: string | null;
  line: number | null;
  url: string | null;
  createdAt: string;
  diffHunk: string | null;
  isOutdated: boolean;
  hasSuggestion: boolean;
};

type PullRequestInfo = {
  number: number;
  title: string;
  body: string | null;
  url: string;
  checksStatus: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN';
  checksDetails: Array<{ name: string; status: string; conclusion: string | null }>;
};

function sh(cmd: string, args: string[]): string {
  const result = Bun.spawnSync([cmd, ...args], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${result.stderr.toString()}`);
  }
  return result.stdout.toString().trim();
}

function getCurrentBranch(): string {
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD') {
    throw new Error('Could not determine current branch (detached HEAD?).');
  }
  return branch;
}

function getOriginRemoteUrl(): string {
  const url = sh('git', ['remote', 'get-url', 'origin']);
  if (!url) throw new Error("No git remote named 'origin' found.");
  return url;
}

function parseGitHubRepo(remoteUrl: string): RepoRef {
  // Supports:
  // - git@github.com:OWNER/REPO.git
  // - https://github.com/OWNER/REPO.git
  // - https://github.com/OWNER/REPO
  // - ssh://git@github.com/OWNER/REPO.git
  const cleaned = remoteUrl.replace(/\.git$/, '');

  // git@github.com:OWNER/REPO
  let m = cleaned.match(/^git@github\.com:([^/]+)\/(.+)$/);
  if (m) return { owner: m[1], repo: m[2] };

  // ssh://git@github.com/OWNER/REPO
  m = cleaned.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/);
  if (m) return { owner: m[1], repo: m[2] };

  // https://github.com/OWNER/REPO
  m = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/(.+)$/);
  if (m) return { owner: m[1], repo: m[2] };

  throw new Error(`Remote URL does not look like a GitHub URL I can parse: ${remoteUrl}`);
}

async function githubRest<T>(
  token: string,
  endpoint: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`https://api.github.com${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'get-pr-comments-script',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${text}`);
  }

  return response.json();
}

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'get-pr-comments-script',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}\n${text}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`);
  }

  return json.data as T;
}

type PullRequest = {
  number: number;
  updated_at: string;
};

async function findOpenPrNumberForBranch(
  token: string,
  repo: RepoRef,
  branch: string,
): Promise<number | null> {
  const head = `${repo.owner}:${branch}`;

  const prs = await githubRest<PullRequest[]>(token, `/repos/${repo.owner}/${repo.repo}/pulls`, {
    state: 'open',
    head,
    per_page: 100,
  });

  if (prs.length === 0) return null;

  prs.sort((a, b) => {
    const ad = a.updated_at ? Date.parse(a.updated_at) : 0;
    const bd = b.updated_at ? Date.parse(b.updated_at) : 0;
    return bd - ad;
  });

  return prs[0]!.number;
}

const PR_INFO_QUERY = `
  query PullRequestInfo(
    $owner: String!
    $repo: String!
    $number: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        title
        body
        url
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
                contexts(first: 50) {
                  nodes {
                    ... on CheckRun {
                      name
                      status
                      conclusion
                    }
                    ... on StatusContext {
                      context
                      state
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const REVIEW_THREADS_QUERY = `
  query UnresolvedReviewThreads(
    $owner: String!
    $repo: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            isOutdated
            comments(first: 100) {
              nodes {
                id
                body
                path
                line
                url
                createdAt
                diffHunk
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
`;

type PRInfoResponse = {
  repository: {
    pullRequest: {
      title: string;
      body: string | null;
      url: string;
      commits: {
        nodes: Array<{
          commit: {
            statusCheckRollup: {
              state: string;
              contexts: {
                nodes: Array<
                  | { name: string; status: string; conclusion: string | null }
                  | { context: string; state: string }
                >;
              };
            } | null;
          };
        }>;
      };
    } | null;
  } | null;
};

type ReviewThreadsResponse = {
  repository: {
    pullRequest: {
      reviewThreads: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Array<{
          id: string;
          isResolved: boolean;
          isOutdated: boolean;
          comments: {
            nodes: Array<{
              id: string;
              body: string;
              path: string | null;
              line: number | null;
              url: string | null;
              createdAt: string;
              diffHunk: string | null;
              author: { login: string } | null;
            }>;
          };
        }>;
      };
    } | null;
  } | null;
};

function hasSuggestionBlock(body: string): boolean {
  return /```suggestion\b/i.test(body);
}

async function fetchPullRequestInfo(
  token: string,
  repo: RepoRef,
  prNumber: number,
): Promise<PullRequestInfo> {
  const resp = await githubGraphQL<PRInfoResponse>(token, PR_INFO_QUERY, {
    owner: repo.owner,
    repo: repo.repo,
    number: prNumber,
  });

  const pr = resp.repository?.pullRequest;
  if (!pr) {
    throw new Error(`PR #${prNumber} not found`);
  }

  const rollup = pr.commits.nodes[0]?.commit.statusCheckRollup;
  let checksStatus: PullRequestInfo['checksStatus'] = 'UNKNOWN';
  const checksDetails: PullRequestInfo['checksDetails'] = [];

  if (rollup) {
    checksStatus =
      rollup.state === 'SUCCESS'
        ? 'SUCCESS'
        : rollup.state === 'FAILURE' || rollup.state === 'ERROR'
          ? 'FAILURE'
          : rollup.state === 'PENDING'
            ? 'PENDING'
            : 'UNKNOWN';

    for (const ctx of rollup.contexts.nodes) {
      if ('name' in ctx) {
        checksDetails.push({ name: ctx.name, status: ctx.status, conclusion: ctx.conclusion });
      } else if ('context' in ctx) {
        checksDetails.push({ name: ctx.context, status: ctx.state, conclusion: null });
      }
    }
  }

  return {
    number: prNumber,
    title: pr.title,
    body: pr.body,
    url: pr.url,
    checksStatus,
    checksDetails,
  };
}

async function fetchUnresolvedReviewComments(
  token: string,
  repo: RepoRef,
  prNumber: number,
): Promise<UnresolvedReviewComment[]> {
  const results: UnresolvedReviewComment[] = [];
  let after: string | null = null;

  while (true) {
    const resp: ReviewThreadsResponse = await githubGraphQL<ReviewThreadsResponse>(
      token,
      REVIEW_THREADS_QUERY,
      {
        owner: repo.owner,
        repo: repo.repo,
        number: prNumber,
        after,
      },
    );

    const threads = resp.repository?.pullRequest?.reviewThreads.nodes ?? [];
    for (const t of threads) {
      if (t.isResolved) continue;

      for (const c of t.comments.nodes) {
        results.push({
          prNumber,
          threadId: t.id,
          commentId: c.id,
          author: c.author?.login ?? null,
          body: c.body,
          path: c.path,
          line: c.line,
          url: c.url,
          createdAt: c.createdAt,
          diffHunk: c.diffHunk,
          isOutdated: t.isOutdated,
          hasSuggestion: hasSuggestionBlock(c.body),
        });
      }
    }

    const pageInfo: { hasNextPage: boolean; endCursor: string | null } | undefined =
      resp.repository?.pullRequest?.reviewThreads.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    after = pageInfo.endCursor ?? null;
    if (!after) break;
  }

  return results;
}

function formatChecksStatus(prInfo: PullRequestInfo): string {
  const statusEmoji: Record<PullRequestInfo['checksStatus'], string> = {
    SUCCESS: '✓',
    FAILURE: '✗',
    PENDING: '○',
    UNKNOWN: '?',
  };

  const emoji = statusEmoji[prInfo.checksStatus];
  let result = `CI Status: ${emoji} ${prInfo.checksStatus}`;

  if (prInfo.checksStatus === 'FAILURE') {
    const failed = prInfo.checksDetails.filter(
      (c) =>
        c.conclusion === 'FAILURE' ||
        c.conclusion === 'failure' ||
        c.conclusion === 'CANCELLED' ||
        c.conclusion === 'TIMED_OUT',
    );
    if (failed.length > 0) {
      result += '\n\n⚠️  CI IS FAILING - THIS MUST BE FIXED BEFORE ADDRESSING REVIEW COMMENTS ⚠️\n';
      result += '\nFailed checks:\n';
      for (const check of failed) {
        result += `  • ${check.name}: ${check.conclusion ?? 'FAILED'}\n`;
      }
      result += '\nRun the failing checks locally to diagnose and fix the issues.';
      result += '\nCommon commands: `bun run check`, `bun test`, `bun run build`';
    }
  } else if (prInfo.checksStatus === 'PENDING') {
    result += ' (checks still running)';
  }

  return result;
}

async function main() {
  const token = Bun.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      'Missing GITHUB_TOKEN. Export it (or use a fine-grained token with repo read access).',
    );
  }

  const origin = getOriginRemoteUrl();
  const repository = parseGitHubRepo(origin);
  const branch = getCurrentBranch();
  const prNumber = await findOpenPrNumberForBranch(token, repository, branch);

  if (!prNumber) {
    console.log(
      `There is no open pull request found for branch '${branch}' of ${repository.owner}/${repository.repo}.`,
      'Run `git push` to push your branch and create a pull request.',
    );
    return process.exit(0);
  }

  const [prInfo, unresolved] = await Promise.all([
    fetchPullRequestInfo(token, repository, prNumber),
    fetchUnresolvedReviewComments(token, repository, prNumber),
  ]);

  // PR header
  console.log(`# PR #${prNumber}: ${prInfo.title}`);
  console.log(`Branch: ${branch} | ${repository.owner}/${repository.repo}`);
  console.log(`URL: ${prInfo.url}`);
  console.log(formatChecksStatus(prInfo));

  if (prInfo.body) {
    console.log('\n## Description\n');
    console.log(stripHtmlFromMarkdown(prInfo.body));
  }

  // Review comments
  if (!unresolved.length) {
    console.log('\n---\nNo unresolved review comments. Great job!');
    return process.exit(0);
  }

  console.log(
    `\n---\n## Unresolved Review Comments (${unresolved.length})\n`,
    'You must address each comment and then resolve its thread.\n',
  );

  for (const comment of unresolved) {
    console.log('---\n');

    // Status badges
    const badges: string[] = [];
    if (comment.isOutdated) badges.push('[OUTDATED]');
    if (comment.hasSuggestion) badges.push('[HAS SUGGESTION]');
    const badgeStr = badges.length ? badges.join(' ') + ' ' : '';

    console.log(`${badgeStr}Thread ID: ${comment.threadId}`);
    console.log(`Author: ${comment.author ?? 'unknown'} | ${comment.createdAt}`);

    if (comment.path) {
      const lineInfo = comment.line !== null ? `:${comment.line}` : '';
      console.log(`File: ${comment.path}${lineInfo}`);
    }

    if (comment.url) {
      console.log(`URL: ${comment.url}`);
    }

    // Show diff context if available
    if (comment.diffHunk) {
      console.log('\nDiff context:');
      console.log('```diff');
      console.log(comment.diffHunk);
      console.log('```');
    }

    console.log('\nComment:');
    console.log(stripHtmlFromMarkdown(comment.body));
    console.log('');
  }
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
