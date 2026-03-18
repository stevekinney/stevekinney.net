export type ImageVariant = {
  width: number;
  url: string;
};

export type ImageManifestEntry = {
  /** Truncated SHA-256 of source image bytes (first 16 hex chars) */
  hash: string;
  /** Original pixel dimensions */
  width: number;
  height: number;
  /** Blob URL for the image at mainWidth in its original format */
  original: string;
  /** AVIF variants at target widths; empty for SVG/GIF/video */
  avif: ImageVariant[];
  /** Base64 data URI for LQIP; null for SVG/GIF/video */
  lqip: string | null;
  /** MIME type, e.g. "video/mp4" — set for videos, null otherwise */
  videoMimeType: string | null;
};

export type ImageManifest = {
  version: 1;
  images: Record<string, ImageManifestEntry>;
};
