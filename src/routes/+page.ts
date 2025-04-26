import metadata from '@/lib/metadata';
import { createOpenGraphImage } from '@/lib/open-graph';

export async function load() {
  const opengraph = await createOpenGraphImage(metadata.title, metadata.description);

  return {
    opengraph,
  };
}
