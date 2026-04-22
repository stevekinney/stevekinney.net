import { collectContentRepository } from './content-repository.ts';

const main = async (): Promise<void> => {
  const repository = await collectContentRepository();

  if (repository.validationIssues.length > 0) {
    console.error('Content validation failed:');
    for (const issue of repository.validationIssues) {
      console.error(`- ${issue.file}: ${issue.message}`);
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
