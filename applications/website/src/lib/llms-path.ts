import { normalizeOpenGraphPath } from './og/paths';

const isReservedSegment = (segment: string | undefined): boolean =>
  segment === undefined ||
  segment === 'llms.txt' ||
  segment === 'open-graph.jpg' ||
  segment === 'rss';

export const createLlmsAlternatePath = (pathname: string): string | null => {
  const normalizedPath = normalizeOpenGraphPath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/llms.txt';
  }

  if (segments[0] === 'writing' && segments.length === 2 && !isReservedSegment(segments[1])) {
    return `${normalizedPath}/llms.txt`;
  }

  if (segments[0] === 'courses' && segments.length === 2 && !isReservedSegment(segments[1])) {
    return `${normalizedPath}/llms.txt`;
  }

  if (
    segments[0] === 'courses' &&
    segments.length === 3 &&
    !isReservedSegment(segments[1]) &&
    !isReservedSegment(segments[2])
  ) {
    return `${normalizedPath}/llms.txt`;
  }

  return null;
};
