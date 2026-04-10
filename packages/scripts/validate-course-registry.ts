/**
 * Validates that every `courses/<slug>/` directory is fully registered with
 * the website. The course-registration chain has three links — README with
 * valid frontmatter, a `package.json` workspace declaration, and a matching
 * dependency entry in `applications/website/package.json` — and any missing
 * link causes the course to silently disappear from the site without the
 * build failing. This validator inverts the existing checks: instead of
 * "if a course file is staged, validate it," it asks "for every course
 * directory on disk, is the entire chain intact?"
 *
 * Run by `bun content:validate` (chained from packages/scripts/package.json)
 * and unconditionally by `.husky/pre-commit`.
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import { parseFrontmatter, toDate } from '@stevekinney/utilities/frontmatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COURSES_ROOT = path.resolve(REPO_ROOT, 'courses');
const WEBSITE_PACKAGE_PATH = path.resolve(REPO_ROOT, 'applications/website/package.json');

const REQUIRED_FRONTMATTER = ['title', 'description', 'date', 'modified'] as const;

type PackageJson = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

type CourseIssue = {
  slug: string;
  message: string;
  remediation: string;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const validateReadme = async (
  slug: string,
  courseDir: string,
  issues: CourseIssue[],
): Promise<void> => {
  const readmePath = path.join(courseDir, 'README.md');
  if (!(await fileExists(readmePath))) {
    issues.push({
      slug,
      message: `Missing courses/${slug}/README.md`,
      remediation: `Create courses/${slug}/README.md with title, description, date, and modified frontmatter (see courses/aws/README.md for the canonical shape).`,
    });
    return;
  }

  const contents = await readFile(readmePath, 'utf8');
  const { data } = parseFrontmatter(contents);

  for (const key of REQUIRED_FRONTMATTER) {
    const value = data[key];
    if (key === 'date' || key === 'modified') {
      if (toDate(value) === null) {
        issues.push({
          slug,
          message: `courses/${slug}/README.md has missing or invalid '${key}' frontmatter`,
          remediation: `Add a YYYY-MM-DD '${key}' value to courses/${slug}/README.md frontmatter.`,
        });
      }
      continue;
    }
    if (!isNonEmptyString(value)) {
      issues.push({
        slug,
        message: `courses/${slug}/README.md is missing required '${key}' frontmatter`,
        remediation: `Add a non-empty '${key}' value to courses/${slug}/README.md frontmatter.`,
      });
    }
  }
};

const validatePackageJson = async (
  slug: string,
  courseDir: string,
  websiteDeps: Set<string>,
  issues: CourseIssue[],
): Promise<void> => {
  const packagePath = path.join(courseDir, 'package.json');
  if (!(await fileExists(packagePath))) {
    issues.push({
      slug,
      message: `Missing courses/${slug}/package.json`,
      remediation: `Create courses/${slug}/package.json with "name": "@stevekinney/${slug}" and a "manifest" script. See courses/testing/package.json for the minimal shape.`,
    });
    return;
  }

  const pkg = await readJson<PackageJson>(packagePath);
  const expectedName = `@stevekinney/${slug}`;
  if (pkg.name !== expectedName) {
    issues.push({
      slug,
      message: `courses/${slug}/package.json has name "${pkg.name ?? ''}" — expected "${expectedName}"`,
      remediation: `Set "name": "${expectedName}" in courses/${slug}/package.json.`,
    });
  }

  if (!pkg.scripts?.manifest) {
    issues.push({
      slug,
      message: `courses/${slug}/package.json is missing a "manifest" script`,
      remediation: `Add "manifest": "bun run ../../packages/scripts/generate-course-manifest.ts" to courses/${slug}/package.json scripts.`,
    });
  }

  if (pkg.name && !websiteDeps.has(pkg.name)) {
    issues.push({
      slug,
      message: `${pkg.name} is not listed in applications/website/package.json dependencies`,
      remediation: `Add "${pkg.name}": "workspace:*" to applications/website/package.json dependencies and run bun install.`,
    });
  }
};

/**
 * Validate every course directory under `courses/`. Returns a list of issues
 * (empty when the registry is healthy). Exposed for unit tests; the CLI
 * wrapper at the bottom of the file calls this with the real REPO_ROOT.
 *
 * Scope: this validator enforces the *registration chain* — README,
 * package.json, and website workspace dependency. It deliberately does **not**
 * require lesson files or `index.toml`, because a course can legitimately
 * ship as an empty placeholder (e.g. `web-security`) and still be registered
 * correctly. The bug class we're preventing is "course directory exists but
 * is invisible to the site," not "course is empty."
 */
export const validateCourseRegistry = async (options: {
  coursesRoot: string;
  websitePackagePath: string;
}): Promise<CourseIssue[]> => {
  const issues: CourseIssue[] = [];

  const courseDirs = await fg('*', {
    cwd: options.coursesRoot,
    onlyDirectories: true,
    absolute: true,
  });

  if (courseDirs.length === 0) {
    return issues;
  }

  if (!(await fileExists(options.websitePackagePath))) {
    issues.push({
      slug: '<website>',
      message: `Missing ${path.relative(options.coursesRoot, options.websitePackagePath)}`,
      remediation: `The website package.json is required to verify workspace dependency wiring.`,
    });
    return issues;
  }

  const websitePackage = await readJson<PackageJson>(options.websitePackagePath);
  const websiteDeps = new Set(Object.keys(websitePackage.dependencies ?? {}));

  for (const courseDir of courseDirs.sort()) {
    const slug = path.basename(courseDir);
    await validateReadme(slug, courseDir, issues);
    await validatePackageJson(slug, courseDir, websiteDeps, issues);
  }

  return issues;
};

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const issues = await validateCourseRegistry({
    coursesRoot: COURSES_ROOT,
    websitePackagePath: WEBSITE_PACKAGE_PATH,
  });

  if (issues.length > 0) {
    console.error('Course registry validation failed:\n');
    const grouped = new Map<string, CourseIssue[]>();
    for (const issue of issues) {
      const list = grouped.get(issue.slug) ?? [];
      list.push(issue);
      grouped.set(issue.slug, list);
    }
    for (const [slug, slugIssues] of grouped) {
      console.error(`  ${slug}:`);
      for (const issue of slugIssues) {
        console.error(`    - ${issue.message}`);
        console.error(`      → ${issue.remediation}`);
      }
    }
    console.error(
      `\n${issues.length} issue(s) across ${grouped.size} course(s). Fix the above and re-run \`bun content:validate\`.`,
    );
    process.exit(1);
  }

  const courseCount = (await fg('*', { cwd: COURSES_ROOT, onlyDirectories: true })).length;
  console.log(`Course registry is healthy: ${courseCount} course(s) fully registered.`);
}
