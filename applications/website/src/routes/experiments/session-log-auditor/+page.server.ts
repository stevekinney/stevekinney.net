import { experiment } from './experiment';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
});
