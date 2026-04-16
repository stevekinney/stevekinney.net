#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const defaultCourseRoot = path.resolve(repositoryRoot, 'courses/self-testing-ai-agents');

function printUsage() {
  console.log(`Usage: node tools/course-dry-run/scripts/build-course-manifest.mjs [options]

Options:
  --course-root <path>  Course directory that contains index.toml
  --out <path>          Write JSON to this file instead of stdout
  --help                Show this help message
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

function readProperty(blockBody, propertyName) {
  const propertyPattern = new RegExp(`^${propertyName}\\s*=\\s*"([^"]+)"$`, 'm');
  return blockBody.match(propertyPattern)?.[1] ?? null;
}

function deriveKind(href) {
  if (href.startsWith('lab-')) {
    return 'lab';
  }

  if (href.endsWith('-solution.md')) {
    return 'solution';
  }

  return 'lesson';
}

function extractCodeBlocks(markdownSource) {
  const lines = markdownSource.split('\n');
  const codeBlocks = [];
  let currentHeading = null;
  let activeBlock = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!activeBlock && /^#{1,6}\s+/.test(line)) {
      currentHeading = line.replace(/^#{1,6}\s+/, '').trim();
    }

    if (!activeBlock) {
      const openingFence = line.match(/^```([^\s`]*)/);

      if (openingFence) {
        activeBlock = {
          language: openingFence[1] || '',
          lineStart: index + 2,
          heading: currentHeading,
          contentLines: [],
        };
      }

      continue;
    }

    if (/^```$/.test(line)) {
      codeBlocks.push({
        index: codeBlocks.length + 1,
        language: activeBlock.language || '(none)',
        lineStart: activeBlock.lineStart,
        lineEnd: index,
        heading: activeBlock.heading,
        content: activeBlock.contentLines.join('\n').replace(/\n$/, ''),
      });
      activeBlock = null;
      continue;
    }

    activeBlock.contentLines.push(line);
  }

  if (activeBlock) {
    codeBlocks.push({
      index: codeBlocks.length + 1,
      language: activeBlock.language || '(none)',
      lineStart: activeBlock.lineStart,
      lineEnd: lines.length,
      heading: activeBlock.heading,
      content: activeBlock.contentLines.join('\n').replace(/\n$/, ''),
    });
  }

  return codeBlocks;
}

function parseIndexToml(indexSource) {
  const blocks = indexSource
    .split(/(?=^\[\[[^\]]+\]\]\s*$)/m)
    .map((block) => block.trim())
    .filter(Boolean);

  const entries = [];
  const groups = new Map();
  let currentSection = null;
  let currentGroupId = null;

  for (const block of blocks) {
    const [headerLine, ...bodyLines] = block.split('\n');
    const header = headerLine.trim().slice(2, -2);
    const body = bodyLines.join('\n');

    if (header === 'section') {
      currentSection = readProperty(body, 'title');
      continue;
    }

    if (header !== 'section.item' && header !== 'section.item.related') {
      continue;
    }

    const href = readProperty(body, 'href');
    const title = readProperty(body, 'title');

    if (!href || !title || !currentSection) {
      throw new Error(`Malformed index.toml block: ${headerLine}`);
    }

    if (header === 'section.item') {
      currentGroupId = entries.length + 1;
    }

    if (!currentGroupId) {
      throw new Error(`Found related item before a primary item: ${title}`);
    }

    const entry = {
      index: entries.length + 1,
      title,
      href,
      kind: deriveKind(href),
      section: currentSection,
      groupId: currentGroupId,
      related: [],
    };

    entries.push(entry);

    if (!groups.has(currentGroupId)) {
      groups.set(currentGroupId, []);
    }

    groups.get(currentGroupId).push(entry);
  }

  for (const entry of entries) {
    const group = groups.get(entry.groupId) ?? [];
    entry.related = group
      .filter((candidate) => candidate.href !== entry.href)
      .map((candidate) => ({
        href: candidate.href,
        title: candidate.title,
        kind: candidate.kind,
      }));
  }

  return entries;
}

async function buildManifest(courseRoot) {
  const indexPath = path.join(courseRoot, 'index.toml');
  const indexSource = await readFile(indexPath, 'utf8');
  const entries = parseIndexToml(indexSource);
  const counts = {
    lesson: 0,
    lab: 0,
    solution: 0,
  };

  for (const entry of entries) {
    const sourcePath = path.join(courseRoot, entry.href);
    const markdownSource = await readFile(sourcePath, 'utf8');
    entry.sourcePath = sourcePath;
    entry.codeBlocks = extractCodeBlocks(markdownSource);
    counts[entry.kind] += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    courseRoot,
    indexPath,
    counts: {
      ...counts,
      total: entries.length,
    },
    entries,
  };
}

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));

  if (argumentsMap.help) {
    printUsage();
    return;
  }

  const courseRoot = path.resolve(argumentsMap['course-root'] ?? defaultCourseRoot);
  const manifest = await buildManifest(courseRoot);
  const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

  if (argumentsMap.out) {
    const outputPath = path.resolve(argumentsMap.out);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serializedManifest, 'utf8');
    console.error(`Wrote manifest to ${outputPath}`);
    return;
  }

  process.stdout.write(serializedManifest);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
