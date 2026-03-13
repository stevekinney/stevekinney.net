import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const redirects: Record<string, string> = {
  '/rss': '/writing/rss',
  '/feed': '/writing/rss',
  '/rss.xml': '/writing/rss',
  '/atom.xml': '/writing/rss',
  '/sitemap.xml.gz': '/sitemap.xml',
};

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (pathname.startsWith('/.well-known/appspecific/com.chrome.devtools')) {
    return new Response(null, { status: 204 });
  }

  if (pathname === '/.well-known/traffic-advice') {
    return new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const target = redirects[pathname];
  if (target) {
    redirect(301, target);
  }

  return await resolve(event);
};
