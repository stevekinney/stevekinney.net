export const meta = {
  name: 'triage-issues',
  description: 'Sort new issues into bugs and requests, then draft a reply for the bugs',
  phases: [
    { title: 'Gather', detail: 'Read the open and stale issues' },
    { title: 'Triage', detail: 'Classify each issue, one at a time' },
    { title: 'Reply' },
  ],
};

const ISSUE_LIST = {
  type: 'object',
  properties: { issues: { type: 'array', items: { type: 'string' } } },
  required: ['issues'],
};

async function classify(issue) {
  const verdict = await agent(`Is ${issue} a bug or a feature request?`, {
    label: `Classify ${issue}`,
    model: 'haiku',
    schema: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['bug', 'request'] } },
      required: ['kind'],
    },
  });
  return verdict?.kind ?? 'unknown';
}

phase('Gather');
const [open, stale] = await parallel([
  () => agent('List the open issues filed this week.', { label: 'List open issues', schema: ISSUE_LIST }),
  () => agent('List the issues with no reply in a month.', { label: 'List stale issues', schema: ISSUE_LIST }),
]);

phase('Triage');
const bugs = [];
for (const issue of open?.issues ?? []) {
  if ((await classify(issue)) === 'bug') {
    bugs.push(issue);
  } else {
    log(`Skipping ${issue}: not a bug`);
  }
}
const staleKind = await classify(stale?.issues?.[0] ?? 'none');

phase('Reply');
if (bugs.length > 0) {
  await workflow('draft-replies', { issues: bugs });
} else {
  await agent('Write a short note saying no new bugs came in this week.', {
    label: 'Write the all-clear',
    agentType: 'docs-writer',
    isolation: 'worktree',
    effort: 'low',
  });
}

return { bugs: bugs.length, staleKind };
