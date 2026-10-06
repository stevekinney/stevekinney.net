export const meta = {
  name: 'review-changed-files',
  description:
    'Review each changed file for correctness bugs, try to disprove every finding, and write one ranked summary',
  whenToUse: 'Before opening a pull request that touches more than a handful of files',
  phases: [
    { title: 'Collect', detail: 'Find the files that changed' },
    { title: 'Review', detail: 'One reviewer per file, then a skeptic per finding' },
    { title: 'Summarize', detail: 'Rank and merge what survived' },
  ],
};

const FILES = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    base: { type: 'string' },
  },
  required: ['files'],
};

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          summary: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['line', 'severity', 'summary'],
      },
    },
  },
  required: ['findings'],
};

const VERDICT = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['real', 'reason'],
};

phase('Collect');
const changed = await agent(
  `List the files changed on this branch compared with ${args?.base ?? 'main'}. Skip lockfiles and generated files.`,
  { label: 'List changed files', schema: FILES, model: 'haiku' },
);

if (!changed || changed.files.length === 0) {
  log('No changed files to review.');
  return { reviewed: 0, failed: 0, findings: [] };
}

phase('Review');
const reviews = await pipeline(
  changed.files,
  (file) =>
    agent(`Review ${file} for correctness bugs. Report each with its line and a one-sentence summary.`, {
      label: `Review ${file}`,
      schema: FINDINGS,
      effort: 'high',
    }),
  (review, file) =>
    parallel(
      (review?.findings ?? []).map(
        (finding) => () =>
          agent(`Try to disprove this finding in ${file}, line ${finding.line}: ${finding.summary}`, {
            label: `Verify ${file}:${finding.line}`,
            schema: VERDICT,
            model: 'sonnet',
          }).then((verdict) => ({ file, ...finding, verdict })),
      ),
    ),
);

const failed = reviews.filter((review) => review === null).length;
const confirmed = reviews.flat().filter((finding) => finding?.verdict?.real);
log(`${confirmed.length} confirmed findings in ${changed.files.length} files (${failed} reviews failed)`);

phase('Summarize');
const summary = await agent(
  `Rank these findings by severity and merge duplicates into one summary for a pull request description:\n${JSON.stringify(confirmed, null, 2)}`,
  { label: 'Write the summary', model: 'opus' },
);

return { reviewed: changed.files.length, failed, findings: confirmed, summary };
