const OG_TEMPLATE_VERSION = '1';

type OpenGraphHashInput = {
  title?: string;
  description?: string | null;
  accentColor?: string;
  secondaryAccentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  hideFooter?: boolean;
};

const toPart = (value: string | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildOpenGraphHash = ({
  title,
  description,
  accentColor,
  secondaryAccentColor,
  textColor,
  backgroundColor,
  hideFooter,
}: OpenGraphHashInput): string => {
  const parts = [
    OG_TEMPLATE_VERSION,
    toPart(title),
    toPart(description),
    toPart(accentColor),
    toPart(secondaryAccentColor),
    toPart(textColor),
    toPart(backgroundColor),
    toPart(hideFooter),
  ];

  return fnv1a(parts.join('|'));
};
