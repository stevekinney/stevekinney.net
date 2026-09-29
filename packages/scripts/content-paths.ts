import path from 'node:path';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(__dirname, '..', '..');
export const writingRoot = path.resolve(repositoryRoot, 'writing');
export const coursesRoot = path.resolve(repositoryRoot, 'courses');
export const projectsRoot = path.resolve(repositoryRoot, 'projects');
export const websiteRoot = path.resolve(repositoryRoot, 'applications', 'website');
export const websiteStaticRoot = path.resolve(websiteRoot, 'static');
export const websiteBuildRoot = path.resolve(websiteRoot, 'build');
export const websiteSvelteKitClientRoot = path.resolve(
  websiteRoot,
  '.svelte-kit',
  'output',
  'client',
);
export const websiteVercelStaticRoot = path.resolve(websiteRoot, '.vercel', 'output', 'static');
export const websiteVercelFunctionsRoot = path.resolve(
  websiteRoot,
  '.vercel',
  'output',
  'functions',
);
export const generatedContentDirectory = path.resolve(websiteRoot, '.generated');
export const generatedContentDataPath = path.resolve(
  generatedContentDirectory,
  'content-data.json',
);
export const generatedObsidianContentPath = path.resolve(
  generatedContentDirectory,
  'obsidian-content.json',
);
export const generatedObsidianMathStylesheetPath = path.resolve(
  generatedContentDirectory,
  'obsidian-math.css',
);
export const contentEnhancementsPackageRoot = path.resolve(
  repositoryRoot,
  'packages',
  'content-enhancements',
);
const contentEnhancementsSourceDirectory = path.resolve(contentEnhancementsPackageRoot, 'src');
export const contentEnhancementsEntryPath = path.resolve(
  contentEnhancementsSourceDirectory,
  'content-enhancements.ts',
);
export const generatedContentEnhancementsDirectory = path.resolve(
  generatedContentDirectory,
  'content-enhancements',
);
export const resolveRepositoryPath = (repositoryPath: string): string =>
  path.resolve(repositoryRoot, repositoryPath);

/** Return whether the given path exists and is a directory. */
export const directoryExists = async (directoryPath: string): Promise<boolean> => {
  try {
    const directoryStat = await stat(directoryPath);
    return directoryStat.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};
