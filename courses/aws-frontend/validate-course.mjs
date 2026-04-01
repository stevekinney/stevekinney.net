import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const courseDirectory = fileURLToPath(new URL('.', import.meta.url));
const markdownFiles = readdirSync(courseDirectory).filter((name) => name.endsWith('.md'));
const markdownFileSet = new Set(markdownFiles);
const lessonMarkdownFiles = markdownFiles.filter((name) => name !== 'README.md');

const indexPath = path.join(courseDirectory, 'index.toml');
const indexContent = readFileSync(indexPath, 'utf8');
const indexMarkdownTargets = [...indexContent.matchAll(/href\s*=\s*"([^"]+\.md)"/g)].map((match) =>
  path.basename(match[1]),
);
const duplicateIndexTargets = indexMarkdownTargets.filter(
  (target, index) => indexMarkdownTargets.indexOf(target) !== index,
);

const failures = [];

for (const duplicateIndexTarget of new Set(duplicateIndexTargets)) {
  failures.push(`index.toml: duplicate lesson entry for ${duplicateIndexTarget}`);
}

for (const indexMarkdownTarget of indexMarkdownTargets) {
  if (!markdownFileSet.has(indexMarkdownTarget)) {
    failures.push(`index.toml: references missing lesson ${indexMarkdownTarget}`);
  }
}

for (const lessonMarkdownFile of lessonMarkdownFiles) {
  if (!indexMarkdownTargets.includes(lessonMarkdownFile)) {
    failures.push(`index.toml: missing lesson entry for ${lessonMarkdownFile}`);
  }
}

for (const markdownFile of markdownFiles) {
  const filePath = path.join(courseDirectory, markdownFile);
  const content = readFileSync(filePath, 'utf8');

  if (content.includes('<!-- VERIFY:')) {
    failures.push(`${markdownFile}: contains unresolved VERIFY comments`);
  }

  for (const match of content.matchAll(/\]\(([^)#]+\.md)\)/g)) {
    const target = path.basename(match[1]);
    if (!markdownFileSet.has(target)) {
      failures.push(`${markdownFile}: broken local lesson link to ${match[1]}`);
    }
  }

  for (const match of content.matchAll(/\bModules?\s+\d+(?:\s*(?:-|–|through)\s*\d+)?\b/g)) {
    failures.push(`${markdownFile}: contains raw course-order reference "${match[0]}"`);
  }
}

if (failures.length > 0) {
  console.error('AWS frontend course validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${markdownFiles.length} Markdown files in aws-frontend.`);
