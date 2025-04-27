import { createOpenGraphImage } from './open-graph';

export const prerender = false;

export const GET = async ({ params }) => {
  const title = params.title;
  const description = params.description;

  const image = await createOpenGraphImage(title, description);

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
