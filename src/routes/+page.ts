import metadata from '@/lib/metadata';
import { createOpenGraphImage } from '@/lib/open-graph';

export async function load({ fetch }) {
  const opengraph = await createOpenGraphImage(metadata.title, metadata.description, fetch);

  return {
    opengraph,
  };
}
