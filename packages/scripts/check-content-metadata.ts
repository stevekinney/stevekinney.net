#!/usr/bin/env bun
import { auditContentMetadata, reportMetadataIssues } from './content-metadata.ts';

const argumentsList = process.argv.slice(2).filter((argument) => argument !== '--');
const fix = argumentsList[0] === '--fix';
try {
  const result = await auditContentMetadata({
    fix,
    paths: fix ? argumentsList.slice(1) : argumentsList,
  });
  reportMetadataIssues(result.issues);
  const errors = result.issues.filter((issue) => issue.severity !== 'warning');
  console.log(
    `Content metadata: ${result.documents.size} documents, ${result.changedFiles.length} repaired, ${errors.length} errors.`,
  );
  process.exit(errors.length ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
