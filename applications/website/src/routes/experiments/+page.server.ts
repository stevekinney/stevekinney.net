import { experiments, experimentsIndex } from '$lib/experiments/registry';

import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => ({
  title: experimentsIndex.title,
  description: experimentsIndex.description,
  experiments: experiments.map(({ slug, path, title, description }) => ({
    slug,
    path,
    title,
    description,
  })),
});
