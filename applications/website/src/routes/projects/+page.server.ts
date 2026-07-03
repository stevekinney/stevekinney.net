import { getProjectIndex } from '$lib/server/content';

import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async () => {
  return {
    title: 'Projects',
    description:
      'A collection of tools, experiments, and open source projects that I maintain or keep nearby.',
    projects: getProjectIndex(),
  };
};
