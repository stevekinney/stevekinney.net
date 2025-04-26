import { createOpenGraphImage } from './open-graph';

export const GET = async ({ url }) => {
  const title = url.searchParams.get('title') || 'Steve Kinney';
  const description = url.searchParams.get('description');

  const image = await createOpenGraphImage(title, description);

  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
