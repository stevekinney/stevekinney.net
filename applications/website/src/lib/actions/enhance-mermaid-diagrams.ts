import { copyCodeBlockAsImage, supportsClipboardImageCopy } from '$lib/copy-code-block-as-image';

const CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const BUTTON_CLASSES = [
  'flex',
  'items-center',
  'justify-center',
  'rounded',
  'border',
  'border-slate-600',
  'bg-slate-800/80',
  'p-1.5',
  'text-slate-300',
  'backdrop-blur-sm',
  'hover:bg-slate-700',
  'hover:text-white',
  'cursor-pointer',
].join(' ');

const CONTAINER_CLASSES = [
  'absolute',
  'top-2',
  'right-2',
  'z-10',
  'flex',
  'gap-1',
  'opacity-0',
  'group-hover:opacity-100',
  'transition-opacity',
].join(' ');

function showFeedback(button: HTMLButtonElement, success: boolean, originalSvg: string): void {
  button.innerHTML = success ? CHECK_SVG : ERROR_SVG;
  button.style.color = success ? '#4ade80' : '#f87171';
  setTimeout(() => {
    button.innerHTML = originalSvg;
    button.style.color = '';
  }, 2000);
}

let mermaidIdCounter = 0;

let mermaidReady: Promise<typeof import('mermaid')> | null = null;

function getMermaid(): Promise<typeof import('mermaid')> {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((module) => {
      module.default.initialize({
        startOnLoad: false,
        theme: 'base',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        flowchart: {
          nodeSpacing: 30,
          rankSpacing: 50,
          curve: 'basis',
          padding: 20,
          htmlLabels: true,
          useMaxWidth: false,
          defaultRenderer: 'dagre-wrapper',
        },
        sequence: {
          useMaxWidth: false,
          actorMargin: 80,
          boxMargin: 8,
          boxTextMargin: 8,
          messageMargin: 40,
          mirrorActors: false,
          bottomMarginAdj: 2,
          noteMargin: 12,
          messageFontSize: 13,
          actorFontSize: 14,
          noteFontSize: 12,
        },
        gantt: {
          useMaxWidth: false,
          fontSize: 12,
          barHeight: 20,
          barGap: 8,
          topPadding: 50,
          leftPadding: 130,
          sectionFontSize: 13,
        },
        themeVariables: {
          darkMode: true,
          background: 'transparent',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',

          // Node styling — Night Owl palette
          primaryColor: '#1d3b53',
          primaryTextColor: '#d6deeb',
          primaryBorderColor: '#7e57c2',

          // Secondary/tertiary nodes
          secondaryColor: '#0b2942',
          secondaryTextColor: '#d6deeb',
          secondaryBorderColor: '#5f7e97',
          tertiaryColor: '#132d47',
          tertiaryTextColor: '#d6deeb',
          tertiaryBorderColor: '#5f7e97',

          // Edges and lines
          lineColor: '#7e8fa3',

          // Text
          textColor: '#d6deeb',

          // Notes, labels, clusters
          noteBkgColor: '#132d47',
          noteTextColor: '#d6deeb',
          noteBorderColor: '#7e57c2',
          labelBoxBkgColor: '#1d3b53',
          labelBoxBorderColor: '#5f7e97',
          labelTextColor: '#d6deeb',

          // Subgraph/cluster styling
          clusterBkg: 'rgba(11, 41, 66, 0.5)',
          clusterBorder: '#3e5c7a',
          titleColor: '#c792ea',

          // Sequence diagram
          actorBkg: '#1d3b53',
          actorBorder: '#7e57c2',
          actorTextColor: '#d6deeb',
          actorLineColor: '#3e5c7a',
          signalColor: '#7e8fa3',
          signalTextColor: '#d6deeb',
          activationBkgColor: '#1d3b53',
          activationBorderColor: '#7e57c2',
          sequenceNumberColor: '#011627',
          loopTextColor: '#c792ea',

          // Gantt chart
          sectionBkgColor: '#1d3b53',
          altSectionBkgColor: '#0b2942',
          gridColor: '#1d3b53',
          doneTaskBkgColor: '#7e57c2',
          doneTaskBorderColor: '#9a7fd4',
          activeTaskBkgColor: '#234e6f',
          activeTaskBorderColor: '#82aaff',
          taskBkgColor: '#132d47',
          taskBorderColor: '#3e5c7a',
          taskTextColor: '#d6deeb',
          taskTextDarkColor: '#d6deeb',
          todayLineColor: '#c792ea',
          sectionBkgColor2: '#132d47',

          // Flowchart
          nodeBorder: '#7e57c2',
          mainBkg: '#1d3b53',
          nodeBkg: '#1d3b53',
          edgeLabelBackground: '#011627',

          // Relationships
          relationColor: '#7e8fa3',
          relationLabelBackground: '#011627',
          relationLabelColor: '#d6deeb',
        },
      });
      return module;
    });
  }
  return mermaidReady;
}

/**
 * Insert invisible edges (~~~) between consecutive disconnected nodes within
 * subgraphs. Dagre places unconnected nodes in a staircase pattern; linking
 * them with invisible edges forces vertical stacking.
 */
function connectDisconnectedSubgraphNodes(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  const subgraphStack: { nodes: string[]; startIndex: number }[] = [];

  const nodeDefinitionPattern = /^(\w+)\s*(\[|\(|\{|>)/;
  const edgePattern = /-->|~~~|==>|-\.->|---/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('subgraph ')) {
      subgraphStack.push({ nodes: [], startIndex: result.length });
      result.push(line);
      continue;
    }

    if (trimmed === 'end' && subgraphStack.length > 0) {
      const subgraph = subgraphStack.pop()!;

      // Find which nodes are already connected by edges within this subgraph
      const connectedNodes = new Set<string>();
      const bodyLines = result.slice(subgraph.startIndex + 1);
      for (const bodyLine of bodyLines) {
        if (edgePattern.test(bodyLine)) {
          const ids = bodyLine.trim().match(/\b(\w+)\b/g) || [];
          for (const id of ids) connectedNodes.add(id);
        }
      }

      const disconnected = subgraph.nodes.filter((n) => !connectedNodes.has(n));

      if (disconnected.length >= 2) {
        for (let i = 0; i < disconnected.length - 1; i++) {
          result.push(`    ${disconnected[i]} ~~~ ${disconnected[i + 1]}`);
        }
      }

      result.push(line);
      continue;
    }

    // Track node definitions inside subgraphs
    if (subgraphStack.length > 0) {
      const match = trimmed.match(nodeDefinitionPattern);
      if (match && !trimmed.startsWith('direction') && !edgePattern.test(trimmed)) {
        subgraphStack[subgraphStack.length - 1].nodes.push(match[1]);
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * After CSS changes label width (uppercase, font-weight, letter-spacing),
 * the foreignObject is too narrow, causing left-aligned overflow.
 * Widen each cluster label's foreignObject to match its cluster rect
 * and recenter the label's g transform.
 */
function recenterClusterLabels(wrapper: HTMLElement): void {
  const clusters = wrapper.querySelectorAll<SVGGElement>('.cluster');
  for (const cluster of clusters) {
    const rect = cluster.querySelector<SVGRectElement>('rect');
    const labelG = cluster.querySelector<SVGGElement>('.cluster-label');
    if (!rect || !labelG) continue;

    const fo = labelG.querySelector<SVGForeignObjectElement>('foreignObject');
    if (!fo) continue;

    const rectX = +rect.getAttribute('x')!;
    const rectWidth = +rect.getAttribute('width')!;

    // Give the foreignObject the full cluster width and position at x=0
    fo.setAttribute('width', String(rectWidth));
    fo.setAttribute('x', '0');

    // Reposition the label g to start at the rect's x
    const currentTransform = labelG.getAttribute('transform') || '';
    const yMatch = currentTransform.match(/translate\([^,]+,\s*([^)]+)\)/);
    const y = yMatch ? yMatch[1].trim() : '8';
    labelG.setAttribute('transform', `translate(${rectX}, ${y})`);
  }
}

async function renderMermaidDiagram(container: HTMLElement): Promise<void> {
  const sourceElement = container.querySelector('.mermaid-source');
  if (!sourceElement) return;

  let source = sourceElement.textContent?.trim();
  if (!source) return;

  // Replace literal \n (backslash + n) with <br/> for Mermaid line breaks.
  // Content files use \n inside node labels for multi-line text, but Mermaid's
  // htmlLabels rendering path doesn't convert them automatically.
  source = source.replace(/\\n/g, '<br/>');

  // Connect disconnected nodes in subgraphs to prevent staircase layout.
  source = connectDisconnectedSubgraphNodes(source);

  const { default: mermaid } = await getMermaid();
  const id = `mermaid-diagram-${mermaidIdCounter++}`;

  try {
    const { svg } = await mermaid.render(id, source);
    sourceElement.remove();

    const diagramWrapper = document.createElement('div');
    diagramWrapper.className = 'mermaid-diagram flex items-center justify-center';
    diagramWrapper.innerHTML = svg;
    container.prepend(diagramWrapper);
    recenterClusterLabels(diagramWrapper);
  } catch (error) {
    console.error('Failed to render mermaid diagram:', error);
  }
}

function createCopyImageButton(
  diagramContainer: HTMLElement,
  buttonContainer: HTMLElement,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASSES;
  button.setAttribute('aria-label', 'Copy diagram as image');
  button.innerHTML = CAMERA_SVG;

  button.addEventListener('click', async () => {
    try {
      buttonContainer.style.display = 'none';
      await copyCodeBlockAsImage(diagramContainer);
      buttonContainer.style.display = '';
      showFeedback(button, true, CAMERA_SVG);
    } catch (error) {
      buttonContainer.style.display = '';
      console.error('Failed to copy diagram as image:', error);
      showFeedback(button, false, CAMERA_SVG);
    }
  });

  return button;
}

export function enhanceMermaidDiagrams(node: HTMLElement): { destroy: () => void } {
  const mermaidContainers = node.querySelectorAll<HTMLElement>('[data-mermaid]');
  const buttonContainers: HTMLElement[] = [];

  if (mermaidContainers.length === 0) return { destroy() {} };

  const canCopyImage = supportsClipboardImageCopy();

  for (const container of mermaidContainers) {
    container.classList.add('relative', 'group');

    renderMermaidDiagram(container).then(() => {
      if (canCopyImage && container.querySelector('.mermaid-diagram')) {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = CONTAINER_CLASSES;
        buttonWrapper.appendChild(createCopyImageButton(container, buttonWrapper));
        container.appendChild(buttonWrapper);
        buttonContainers.push(buttonWrapper);
      }
    });
  }

  return {
    destroy() {
      for (const buttonContainer of buttonContainers) {
        buttonContainer.remove();
      }
    },
  };
}
