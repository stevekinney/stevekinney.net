const svgEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  '—': '&#8212;',
  '–': '&#8211;',
  '…': '&hellip;',
  '™': '&trade;',
  '®': '&reg;',
  '©': '&copy;',
  '‘': '&lsquo;',
  '’': '&rsquo;',
  '“': '&ldquo;',
  '”': '&rdquo;',
} as const;

function escapeSvg(input: string): string {
  return input.replace(/[&<>"'—–…™®©‘’“”]/g, (char) => svgEscapeMap[char] || char);
}

export { escapeSvg };

export async function createOpenGraphImage(title: string, description: string): Promise<string> {
  const [mainTitle, subtitle] = title
    .split(' | ')
    .map((line) => line.trim())
    .map(escapeSvg);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#333"/>
    <text x="600" y="200" font-size="64" text-anchor="middle" fill="#fff" dy=".3em">${mainTitle}</text>
    <text x="600" y="300" font-size="32" text-anchor="middle" fill="#fff" dy=".3em">${subtitle}</text>
    <text x="600" y="400" font-size="24" text-anchor="middle" fill="#fff" dy=".3em">${escapeSvg(description)}</text>
  </svg>`;

  // Use btoa to encode the SVG string in the browser
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
