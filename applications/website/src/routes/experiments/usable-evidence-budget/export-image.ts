import { downloadBlob } from './download';

// The chart is styled with classes, which don't travel with a serialized
// SVG, so each element's computed paint and text styles are written onto it.
const copiedProperties = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'opacity',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'font-variant-numeric',
];

const inlineComputedStyles = (source: Element, target: Element): void => {
  const computed = getComputedStyle(source);

  target.setAttribute(
    'style',
    copiedProperties
      .map((property) => `${property}:${computed.getPropertyValue(property)}`)
      .join(';'),
  );
  target.removeAttribute('class');
};

const loadImage = (address: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The chart could not be drawn as an image.'));
    image.src = address;
  });

/**
 * Draws the chart to a PNG and saves it. The picture uses whichever theme the
 * page is showing, on that theme's background.
 */
export const downloadChartImage = async (svg: SVGSVGElement, fileName: string): Promise<void> => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...svg.querySelectorAll('*')];
  const targets = [clone, ...clone.querySelectorAll('*')];

  sources.forEach((source, index) => inlineComputedStyles(source, targets[index]));

  const viewBox = svg.viewBox.baseVal;
  const scale = 2;
  const background = getComputedStyle(document.body).backgroundColor;

  clone.setAttribute('width', String(viewBox.width));
  clone.setAttribute('height', String(viewBox.height));
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');

  const backdrop = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  backdrop.setAttribute('width', String(viewBox.width));
  backdrop.setAttribute('height', String(viewBox.height));
  backdrop.setAttribute(
    'style',
    `fill:${background === 'rgba(0, 0, 0, 0)' ? '#ffffff' : background}`,
  );
  clone.insertBefore(backdrop, clone.firstChild);

  const markup = new XMLSerializer().serializeToString(clone);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);

  const canvas = document.createElement('canvas');
  canvas.width = viewBox.width * scale;
  canvas.height = viewBox.height * scale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The chart could not be drawn as an image.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The chart could not be saved as an image.');

  downloadBlob(fileName, blob);
};
