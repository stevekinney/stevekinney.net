import metadata from '$lib/metadata';
import { createOpenGraphImage } from './open-graph';

export const GET = async ({ url, fetch }) => {
  const title = url.searchParams.get('title') || metadata.title;
  const description = url.searchParams.get('description');

  const image = await createOpenGraphImage(fetch, { title, description });

  const body = new ReadableStream<typeof image>({
    async start(controller) {
      controller.enqueue(image);
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.length.toString(),
    },
  });
};
