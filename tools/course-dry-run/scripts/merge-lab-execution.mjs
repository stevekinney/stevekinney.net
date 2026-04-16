#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function printUsage() {
  console.log(`Usage: node tools/course-dry-run/scripts/merge-lab-execution.mjs [options]

Options:
  --results <path>   validation-results.json to update
  --updates <path>   JSON object keyed by lab href with labExecution payloads
  --help             Show this help message
`);
}

function parseArguments(argv) {
  const argumentsMap = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      argumentsMap.help = true;
      continue;
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    argumentsMap[key] = value;
    index += 1;
  }

  return argumentsMap;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));

  if (argumentsMap.help) {
    printUsage();
    return;
  }

  if (!argumentsMap.results || !argumentsMap.updates) {
    throw new Error('Both --results and --updates are required.');
  }

  const resultsPath = path.resolve(argumentsMap.results);
  const updatesPath = path.resolve(argumentsMap.updates);
  const validationResults = await readJson(resultsPath);
  const updates = await readJson(updatesPath);

  if (!updates || Array.isArray(updates) || typeof updates !== 'object') {
    throw new Error('Updates file must be a JSON object keyed by lab href.');
  }

  const knownLabHrefs = new Set(
    validationResults.results
      .filter((result) => result.kind === 'lab')
      .map((result) => result.href),
  );

  for (const href of Object.keys(updates)) {
    if (!knownLabHrefs.has(href)) {
      throw new Error(`Unknown lab href in updates file: ${href}`);
    }

    const update = updates[href];
    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      throw new Error(`Lab execution for ${href} must be a JSON object.`);
    }

    if (typeof update.status !== 'string' || update.status.length === 0) {
      throw new Error(`Lab execution for ${href} must include a non-empty status.`);
    }
  }

  validationResults.results = validationResults.results.map((result) => {
    if (result.kind !== 'lab') {
      return result;
    }

    const update = updates[result.href];
    if (!update) {
      return result;
    }

    return {
      ...result,
      labExecution: update,
    };
  });

  await writeFile(resultsPath, `${JSON.stringify(validationResults, null, 2)}\n`, 'utf8');
  console.error(`Updated lab execution in ${resultsPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
