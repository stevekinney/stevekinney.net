import { buildHookShapes } from './build-shapes';
import { experiment } from './experiment';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Turns the hook schemas into plain field trees and sample payloads, so the
 * page draws them without loading a schema library.
 */
export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
  shapes: buildHookShapes(),
});
