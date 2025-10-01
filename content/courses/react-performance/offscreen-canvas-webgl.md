---
title: OffscreenCanvas & WebGL for React
description: >-
  Leverage OffscreenCanvas and WebGL to create high-performance visualizations
  and graphics in React applications
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
status: published
tags:
  - React
  - Performance
  - OffscreenCanvas
  - WebGL
  - Graphics
---

Your React app needs to render a complex chart with 100,000 data points. Or animate a 3D visualization. Or process real-time video streams. You implement it on the main thread, and suddenly your entire UI freezes. Every interaction becomes sluggish. The browser's performance monitor shows one long, red bar blocking everything.

Here's the problem: canvas operations and WebGL rendering are computationally expensive, and when they run on the main thread, they block everything else. But there's a solution that most React developers don't know about: OffscreenCanvas. It lets you move all that heavy graphics work to a Web Worker, keeping your main thread free and your UI responsive.

Let's explore how to build blazing-fast visualizations and graphics in React using OffscreenCanvas and WebGL, without sacrificing interactivity.

## Understanding OffscreenCanvas

OffscreenCanvas enables canvas rendering in Web Workers:

```typescript
interface OffscreenCanvasCapabilities {
  rendering: 'Runs in Web Worker';
  threading: 'Parallel to main thread';
  contexts: ['2d', 'webgl', 'webgl2', 'webgpu'];
  performance: 'No main thread blocking';
}

// Check for support
const isSupported = 'OffscreenCanvas' in window;

// Transfer canvas control to worker
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const offscreen = canvas.transferControlToOffscreen();

// Send to worker
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

## Basic OffscreenCanvas Setup

### Creating the Worker Infrastructure

```typescript
// canvas.worker.ts
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let animationId: number | null = null;

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      initCanvas(data.canvas);
      break;

    case 'render':
      renderFrame(data);
      break;

    case 'startAnimation':
      startAnimation();
      break;

    case 'stopAnimation':
      stopAnimation();
      break;

    case 'resize':
      resizeCanvas(data.width, data.height);
      break;
  }
});

function initCanvas(offscreenCanvas: OffscreenCanvas) {
  canvas = offscreenCanvas;
  ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  // Initial render
  renderFrame({});
}

function renderFrame(data: any) {
  if (!ctx || !canvas) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Expensive rendering operation
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
    ctx.fill();
  }

  // Report completion
  self.postMessage({ type: 'frameComplete', timestamp: performance.now() });
}

function startAnimation() {
  const animate = () => {
    renderFrame({});
    animationId = requestAnimationFrame(animate);
  };
  animate();
}

function stopAnimation() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function resizeCanvas(width: number, height: number) {
  if (!canvas) return;
  canvas.width = width;
  canvas.height = height;
  renderFrame({});
}
```

### React Hook for OffscreenCanvas

```typescript
const useOffscreenCanvas = (
  workerPath: string,
  options?: OffscreenCanvasOptions
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Check for OffscreenCanvas support
    if (!('transferControlToOffscreen' in canvasRef.current)) {
      console.warn('OffscreenCanvas not supported, falling back to main thread');
      return;
    }

    // Create worker
    const worker = new Worker(workerPath);
    workerRef.current = worker;

    // Transfer canvas control
    const offscreen = canvasRef.current.transferControlToOffscreen();
    worker.postMessage(
      { type: 'init', data: { canvas: offscreen } },
      [offscreen]
    );

    // Handle worker messages
    let frameCount = 0;
    let lastTime = performance.now();

    worker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      if (type === 'ready') {
        setIsReady(true);
      } else if (type === 'frameComplete') {
        frameCount++;
        const now = performance.now();

        if (now - lastTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastTime = now;
        }
      } else if (type === 'error') {
        console.error('Worker error:', data);
      }
    });

    // Start animation if requested
    if (options?.autoStart) {
      worker.postMessage({ type: 'startAnimation' });
    }

    return () => {
      worker.postMessage({ type: 'stopAnimation' });
      worker.terminate();
    };
  }, [workerPath, options]);

  const sendMessage = useCallback((type: string, data?: any) => {
    workerRef.current?.postMessage({ type, data });
  }, []);

  return {
    canvasRef,
    isReady,
    fps,
    sendMessage
  };
};

interface OffscreenCanvasOptions {
  autoStart?: boolean;
  width?: number;
  height?: number;
}

// Usage in component
const VisualizationComponent: React.FC = () => {
  const { canvasRef, isReady, fps, sendMessage } = useOffscreenCanvas(
    '/workers/canvas.worker.js',
    { autoStart: true }
  );

  return (
    <div>
      <canvas ref={canvasRef} width={800} height={600} />
      <div>Status: {isReady ? 'Ready' : 'Loading'}</div>
      <div>FPS: {fps}</div>
      <button onClick={() => sendMessage('startAnimation')}>Start</button>
      <button onClick={() => sendMessage('stopAnimation')}>Stop</button>
    </div>
  );
};
```

## WebGL with OffscreenCanvas

### High-Performance WebGL Rendering

```typescript
// webgl.worker.ts
class WebGLRenderer {
  private canvas: OffscreenCanvas;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private buffers: Map<string, WebGLBuffer> = new Map();
  private uniforms: Map<string, WebGLUniformLocation> = new Map();

  constructor(canvas: OffscreenCanvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;
    this.initialize();
  }

  private initialize() {
    const gl = this.gl;

    // Vertex shader
    const vertexShaderSource = `#version 300 es
      in vec3 a_position;
      in vec3 a_color;

      uniform mat4 u_matrix;
      uniform float u_time;

      out vec3 v_color;

      void main() {
        vec3 pos = a_position;
        pos.x += sin(u_time + a_position.y * 0.1) * 0.1;
        pos.y += cos(u_time + a_position.x * 0.1) * 0.1;

        gl_Position = u_matrix * vec4(pos, 1.0);
        gl_PointSize = 2.0;
        v_color = a_color;
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec3 v_color;
      out vec4 fragColor;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        if (length(coord) > 0.5) {
          discard;
        }
        fragColor = vec4(v_color, 1.0);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Create program
    this.program = this.createProgram(vertexShader, fragmentShader);

    // Get uniform locations
    this.uniforms.set('u_matrix', gl.getUniformLocation(this.program, 'u_matrix')!);
    this.uniforms.set('u_time', gl.getUniformLocation(this.program, 'u_time')!);

    // Setup GL state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram()!;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${info}`);
    }

    return program;
  }

  renderParticles(particles: Float32Array, colors: Float32Array, time: number) {
    const gl = this.gl;

    // Clear
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!this.program) return;

    // Use program
    gl.useProgram(this.program);

    // Create/update position buffer
    let positionBuffer = this.buffers.get('position');
    if (!positionBuffer) {
      positionBuffer = gl.createBuffer()!;
      this.buffers.set('position', positionBuffer);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particles, gl.DYNAMIC_DRAW);

    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Create/update color buffer
    let colorBuffer = this.buffers.get('color');
    if (!colorBuffer) {
      colorBuffer = gl.createBuffer()!;
      this.buffers.set('color', colorBuffer);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

    const colorLoc = gl.getAttribLocation(this.program, 'a_color');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const matrix = this.createPerspectiveMatrix();
    gl.uniformMatrix4fv(this.uniforms.get('u_matrix')!, false, matrix);
    gl.uniform1f(this.uniforms.get('u_time')!, time);

    // Draw
    gl.drawArrays(gl.POINTS, 0, particles.length / 3);
  }

  private createPerspectiveMatrix(): Float32Array {
    // Simple perspective matrix
    const aspect = this.canvas.width / this.canvas.height;
    const fov = Math.PI / 4;
    const near = 0.1;
    const far = 100;

    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (near + far) * rangeInv,
      -1,
      0,
      0,
      near * far * rangeInv * 2,
      0,
    ]);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  dispose() {
    const gl = this.gl;

    // Clean up buffers
    this.buffers.forEach((buffer) => gl.deleteBuffer(buffer));
    this.buffers.clear();

    // Clean up program
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}

// Worker message handler
let renderer: WebGLRenderer | null = null;
let animating = false;

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      renderer = new WebGLRenderer(data.canvas);
      self.postMessage({ type: 'ready' });
      break;

    case 'render':
      if (renderer) {
        renderer.renderParticles(data.particles, data.colors, data.time);
        self.postMessage({ type: 'frameComplete' });
      }
      break;

    case 'startAnimation':
      animating = true;
      animate();
      break;

    case 'stopAnimation':
      animating = false;
      break;

    case 'resize':
      renderer?.resize(data.width, data.height);
      break;

    case 'dispose':
      renderer?.dispose();
      renderer = null;
      break;
  }
});

function animate() {
  if (!animating || !renderer) return;

  // Generate particle data
  const particleCount = 10000;
  const particles = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = Math.random() * 5;

    particles[i * 3] = Math.cos(angle) * radius;
    particles[i * 3 + 1] = Math.sin(angle) * radius;
    particles[i * 3 + 2] = (Math.random() - 0.5) * 2;

    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();
  }

  renderer.renderParticles(particles, colors, performance.now() / 1000);
  self.postMessage({ type: 'frameComplete' });

  requestAnimationFrame(animate);
}
```

## Complex Data Visualization

### Chart Rendering with OffscreenCanvas

```typescript
// chart.worker.ts
class ChartRenderer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private data: ChartData | null = null;

  constructor(canvas: OffscreenCanvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get 2D context');
    }

    this.ctx = ctx;
  }

  updateData(data: ChartData) {
    this.data = data;
    this.render();
  }

  private render() {
    if (!this.data) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Render based on chart type
    switch (this.data.type) {
      case 'scatter':
        this.renderScatterPlot();
        break;
      case 'heatmap':
        this.renderHeatmap();
        break;
      case 'line':
        this.renderLineChart();
        break;
    }

    self.postMessage({
      type: 'renderComplete',
      stats: {
        pointsRendered: this.data.points.length,
        renderTime: performance.now(),
      },
    });
  }

  private renderScatterPlot() {
    if (!this.data) return;

    const { width, height } = this.canvas;
    const { points, colorScale } = this.data;

    // Use ImageData for better performance with many points
    const imageData = this.ctx.createImageData(width, height);
    const pixels = imageData.data;

    points.forEach((point) => {
      const x = Math.floor(point.x * width);
      const y = Math.floor((1 - point.y) * height);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const index = (y * width + x) * 4;
        const color = colorScale(point.value);

        pixels[index] = color.r;
        pixels[index + 1] = color.g;
        pixels[index + 2] = color.b;
        pixels[index + 3] = 255;
      }
    });

    this.ctx.putImageData(imageData, 0, 0);
  }

  private renderHeatmap() {
    if (!this.data) return;

    const { width, height } = this.canvas;
    const { grid, colorScale } = this.data;

    const cellWidth = width / grid[0].length;
    const cellHeight = height / grid.length;

    grid.forEach((row, y) => {
      row.forEach((value, x) => {
        const color = colorScale(value);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      });
    });
  }

  private renderLineChart() {
    if (!this.data) return;

    const { width, height } = this.canvas;
    const { series } = this.data;

    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2;

    series.forEach((line) => {
      this.ctx.beginPath();

      line.points.forEach((point, i) => {
        const x = (point.x / line.maxX) * width;
        const y = height - (point.y / line.maxY) * height;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });

      this.ctx.stroke();
    });
  }
}

interface ChartData {
  type: 'scatter' | 'heatmap' | 'line';
  points?: Array<{ x: number; y: number; value: number }>;
  grid?: number[][];
  series?: Array<{
    points: Array<{ x: number; y: number }>;
    maxX: number;
    maxY: number;
  }>;
  colorScale: (value: number) => { r: number; g: number; b: number };
}
```

### React Component for Data Visualization

```typescript
const DataVisualization: React.FC<{ data: any[] }> = ({ data }) => {
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderStats, setRenderStats] = useState<RenderStats | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Check for OffscreenCanvas support
    if (!('transferControlToOffscreen' in canvasRef.current)) {
      // Fallback to main thread rendering
      renderOnMainThread(canvasRef.current, data);
      return;
    }

    // Create worker
    const worker = new Worker('/workers/chart.worker.js');
    workerRef.current = worker;

    // Transfer canvas
    const offscreen = canvasRef.current.transferControlToOffscreen();
    worker.postMessage(
      { type: 'init', canvas: offscreen },
      [offscreen]
    );

    // Handle worker messages
    worker.addEventListener('message', (event) => {
      if (event.data.type === 'renderComplete') {
        setRenderStats(event.data.stats);
      }
    });

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;

    // Process data for visualization
    const processed = processDataForVisualization(data);

    // Send to worker
    workerRef.current.postMessage({
      type: 'updateData',
      data: processed
    });
  }, [data]);

  return (
    <div className="visualization-container">
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        className="visualization-canvas"
      />
      {renderStats && (
        <div className="render-stats">
          Points: {renderStats.pointsRendered.toLocaleString()} |
          Time: {renderStats.renderTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );
};

interface RenderStats {
  pointsRendered: number;
  renderTime: number;
}

function processDataForVisualization(data: any[]): ChartData {
  // Transform data for visualization
  const points = data.map(d => ({
    x: d.x / 100,
    y: d.y / 100,
    value: d.value
  }));

  const colorScale = (value: number) => {
    const hue = value * 360;
    // Convert HSL to RGB
    const c = 0.5;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = 0.5;

    let r = 0, g = 0, b = 0;

    if (hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  };

  return {
    type: 'scatter',
    points,
    colorScale
  };
}

function renderOnMainThread(canvas: HTMLCanvasElement, data: any[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fallback rendering on main thread
  console.warn('OffscreenCanvas not supported, rendering on main thread');

  // Simple rendering implementation
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  data.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${point.value * 360}, 50%, 50%)`;
    ctx.fill();
  });
}
```

## Performance Monitoring

```typescript
class CanvasPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    workerTime: 0,
    transferTime: 0,
    renderTime: 0,
  };

  private frameTimings: number[] = [];
  private lastFrameTime = 0;

  startFrame(): FrameTimer {
    const startTime = performance.now();

    return {
      markTransferStart: () => {
        this.metrics.transferTime = performance.now() - startTime;
      },

      markWorkerStart: () => {
        const workerStart = performance.now();
        return () => {
          this.metrics.workerTime = performance.now() - workerStart;
        };
      },

      markRenderComplete: () => {
        const frameTime = performance.now() - startTime;
        this.metrics.frameTime = frameTime;
        this.updateFPS(frameTime);
        this.reportIfSlow(frameTime);
      },
    };
  }

  private updateFPS(frameTime: number) {
    this.frameTimings.push(frameTime);

    // Keep last 60 frames
    if (this.frameTimings.length > 60) {
      this.frameTimings.shift();
    }

    // Calculate average FPS
    const avgFrameTime = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
    this.metrics.fps = 1000 / avgFrameTime;
  }

  private reportIfSlow(frameTime: number) {
    if (frameTime > 16.67) {
      // Slower than 60fps
      console.warn(`Slow frame detected: ${frameTime.toFixed(2)}ms`, {
        workerTime: this.metrics.workerTime,
        transferTime: this.metrics.transferTime,
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  workerTime: number;
  transferTime: number;
  renderTime: number;
}

interface FrameTimer {
  markTransferStart: () => void;
  markWorkerStart: () => () => void;
  markRenderComplete: () => void;
}
```

## Best Practices Checklist

✅ **Use OffscreenCanvas for:**

- Complex visualizations
- Real-time data rendering
- Image/video processing
- 3D graphics and games

✅ **Optimize worker communication:**

- Use transferable objects
- Batch updates when possible
- Minimize message size
- Avoid frequent back-and-forth

✅ **Handle fallbacks:**

- Check for support
- Provide main thread fallback
- Test on various devices
- Monitor performance

✅ **Manage resources:**

- Clean up workers
- Dispose WebGL resources
- Clear large buffers
- Terminate unused workers

✅ **Profile performance:**

- Monitor frame times
- Track worker utilization
- Measure transfer overhead
- Identify bottlenecks

