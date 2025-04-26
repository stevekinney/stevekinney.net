import { createOpenGraphImage } from '@/lib/open-graph';

export async function load({ fetch }) {
  const title = 'Writing';
  const description =
    "A collection of articles, essays, and other writing that I've done over the years.";

  const opengraph = await createOpenGraphImage(title, description, fetch);

  return {
    title,
    description,
    opengraph,
  };
}
