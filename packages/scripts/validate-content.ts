#!/usr/bin/env bun
import { collectContentRepository } from './content-repository.ts';

const main = async (): Promise<void> => {
  const repository = await collectContentRepository();

  const errors = repository.validationIssues.filter((i) => i.severity !== 'warning');
  const warnings = repository.validationIssues.filter((i) => i.severity === 'warning');

  if (warnings.length > 0) {
    console.warn('Content validation warnings:');
    for (const issue of warnings) {
      console.warn(
        `- ${issue.file}${issue.line != null ? `:${issue.line}` : ''}: ${issue.message}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('Content validation failed:');
    for (const issue of errors) {
      console.error(
        `- ${issue.file}${issue.line != null ? `:${issue.line}` : ''}: ${issue.message}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `Content validation passed: ${repository.meta.routeCount} routes across ${repository.meta.sourceFileCount} source files.`,
  );
  // Bun can keep these CLI tasks alive after the work is done, so exit explicitly.
  process.exit(0);
};

await main();
