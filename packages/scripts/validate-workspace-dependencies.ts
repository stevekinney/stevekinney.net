/**
 * Validates that every course workspace package is listed as a dependency
 * in the website's package.json. Without this, Turbo won't build the course
 * manifest and the course pages will 404 in production.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WEBSITE_PACKAGE_PATH = path.resolve(REPO_ROOT, 'applications/website/package.json');

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T;

const coursePackageFiles = await fg('courses/*/package.json', {
  cwd: REPO_ROOT,
  absolute: true,
});

const websitePackage = await readJson<PackageJson>(WEBSITE_PACKAGE_PATH);
const websiteDependencies = new Set(Object.keys(websitePackage.dependencies ?? {}));

const missing: string[] = [];

for (const file of coursePackageFiles) {
  const coursePackage = await readJson<PackageJson>(file);
  const name = coursePackage.name;
  if (!name) {
    const relative = path.relative(REPO_ROOT, file);
    console.error(`${relative}: missing "name" field`);
    process.exit(1);
  }
  if (!websiteDependencies.has(name)) {
    missing.push(name);
  }
}

if (missing.length > 0) {
  console.error('Course workspace dependencies missing from applications/website/package.json:');
  for (const name of missing) {
    console.error(`  - "${name}": "workspace:*"`);
  }
  console.error(
    '\nAdd the above to applications/website/package.json "dependencies" and run bun install.',
  );
  process.exit(1);
}

console.log(`All ${coursePackageFiles.length} course workspaces are wired into the website.`);
