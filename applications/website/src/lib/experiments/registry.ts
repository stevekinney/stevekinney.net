/**
 * What an experiment says about itself. Every folder under
 * `src/routes/experiments/` exports one of these from an `experiment.ts`
 * beside its `+page.svelte`, and the index page, the Open Graph images, and
 * the experiment's own page all read it from there.
 */
export type ExperimentMetadata = {
  title: string;
  description: string;
  /** The day the experiment went up, as `YYYY-MM-DD`. The index lists the newest first. */
  added: string;
};

export type Experiment = ExperimentMetadata & {
  /** The route folder's name, such as `model-calculator`. */
  slug: string;
  /** The page's path, such as `/experiments/model-calculator`. */
  path: string;
};

/** The title and description of the `/experiments` index page itself. */
export const experimentsIndex = {
  title: 'Experiments',
  description:
    "Small interactive tools I've built to answer specific questions, mostly about what AI models cost and how coding agents spend their context.",
};

// Discovering experiments by convention means adding one never edits a shared
// file, so experiments built on separate branches merge without conflicts.
const modules = import.meta.glob<{ experiment: ExperimentMetadata }>(
  '/src/routes/experiments/*/experiment.ts',
  { eager: true },
);

const toSlug = (file: string): string => file.split('/').at(-2) ?? '';

/** Every experiment, newest first, then by title. */
export const experiments: Experiment[] = Object.entries(modules)
  .map(([file, module]) => {
    const slug = toSlug(file);

    return { ...module.experiment, slug, path: `/experiments/${slug}` };
  })
  .sort(
    (first, second) =>
      second.added.localeCompare(first.added) || first.title.localeCompare(second.title),
  );
