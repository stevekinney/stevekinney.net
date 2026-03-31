import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const courseDirectory = new URL('.', import.meta.url).pathname;
const markdownFiles = readdirSync(courseDirectory).filter((name) => name.endsWith('.md'));
const markdownFileSet = new Set(markdownFiles);

const failures = [];

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
}

if (failures.length > 0) {
  console.error('AWS frontend course validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${markdownFiles.length} Markdown files in aws-frontend.`);
