export const PLAYGROUND_URL_PREFIX = '/generated/playgrounds/';

/** Response policy is also part of document identity: changed headers need a new URL. */
export const PLAYGROUND_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "script-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'self'",
  'sandbox allow-forms',
].join('; ');

/** Apply to HTML responses in every environment; caching is production-only. */
export const playgroundResponseHeaders = (production: boolean): Record<string, string> => ({
  'Content-Security-Policy': PLAYGROUND_CONTENT_SECURITY_POLICY,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': production ? 'public, max-age=31536000, immutable' : 'no-cache',
});
