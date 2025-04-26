export function openGraphImage(title: string, description: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#333"/>
    <text x="600" y="315" font-size="64" text-anchor="middle" fill="#fff" dy=".3em">${title}</text>
    <text x="600" y="355" font-size="32" text-anchor="middle" fill="#fff" dy=".3em">${description}</text>
  </svg>`;

  // Use btoa to encode the SVG string in the browser
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
