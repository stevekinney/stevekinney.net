import { createOpenGraphImage } from './open-graph';

export const prerender = true;

export const GET = async ({ params }) => {
  const title = params.title;
  const description = params.description;

  const image = await createOpenGraphImage(title, description);

  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
    },
  });
};
