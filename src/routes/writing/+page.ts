import { createOpenGraphImage } from '@/lib/open-graph';

export async function load() {
  const title = 'Writing';
  const description =
    "A collection of articles, essays, and other writing that I've done over the years.";

  const opengraph = await createOpenGraphImage(title, description);

  return {
    title,
    description,
    opengraph,
  };
}
