---
title: WebAssembly Integration in React
description: >-
  Supercharge React with WebAssembly for CPU-intensive tasks. Learn when and how
  to use WASM for image processing, cryptography, and complex calculations.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - webassembly
  - wasm
  - optimization
---

JavaScript is hitting a wall. Your React app needs to process 10,000 data points, apply complex image filters, or run cryptographic operations, and suddenly your UI freezes. You've tried Web Workers, optimized your algorithms, and still, the performance isn't there. Enter WebAssembly—near-native performance in the browser. It's not a silver bullet, but for CPU-intensive tasks, it's the difference between a slideshow and a smooth 60fps experience.

WebAssembly (WASM) lets you run compiled code from languages like Rust, C++, or Go directly in the browser at near-native speeds. But integrating WASM with React isn't trivial—you need to handle asynchronous loading, memory management, type conversions, and the impedance mismatch between WASM's low-level nature and React's component model. This guide shows you exactly when WASM makes sense, how to integrate it properly, and how to avoid the pitfalls that can make WASM slower than JavaScript.

## Understanding WebAssembly Performance

When WASM beats JavaScript and when it doesn't:

```tsx
// WebAssembly performance characteristics
interface WASMPerformance {
  // Where WASM excels
  strengths: {
    cpuIntensive: 'Heavy mathematical computations';
    predictablePerformance: 'No JIT warmup or deoptimization';
    parallelism: 'SIMD and threading support';
    memoryControl: 'Manual memory management';
  };

  // Where WASM struggles
  weaknesses: {
    startupTime: 'Module compilation and instantiation';
    jsInterop: 'Crossing JS/WASM boundary is expensive';
    domAccess: 'Cannot directly manipulate DOM';
    bundleSize: 'WASM modules can be large';
  };

  // Performance comparison
  comparison: {
    fibonacci: { js: 1; wasm: 0.3 }; // WASM 3x faster
    sorting: { js: 1; wasm: 0.5 }; // WASM 2x faster
    domManipulation: { js: 1; wasm: 10 }; // JS 10x faster
    simpleCalculation: { js: 1; wasm: 1.2 }; // JS slightly faster
  };
}

// Decision matrix for WASM usage
function shouldUseWASM(task: TaskProfile): boolean {
  const {
    computationComplexity, // O(n), O(n²), O(n³)
    dataSize, // Number of elements
    frequency, // How often it runs
    requiresDom, // Needs DOM access
  } = task;

  // WASM overhead not worth it for simple tasks
  if (computationComplexity === 'O(n)' && dataSize < 1000) {
    return false;
  }

  // DOM manipulation should stay in JS
  if (requiresDom) {
    return false;
  }

  // High-frequency simple operations stay in JS
  if (frequency > 60 && computationComplexity === 'O(n)') {
    return false;
  }

  // Complex computations benefit from WASM
  if (computationComplexity === 'O(n²)' || computationComplexity === 'O(n³)') {
    return true;
  }

  // Large data processing benefits from WASM
  if (dataSize > 10000) {
    return true;
  }

  return false;
}
```

## Setting Up WebAssembly with React

Basic WASM integration setup:

```tsx
// wasm-loader.ts
export class WASMLoader {
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory;

  constructor() {
    // Shared memory for WASM modules
    this.memory = new WebAssembly.Memory({
      initial: 256, // 256 pages = 16MB
      maximum: 512, // 512 pages = 32MB
    });
  }

  async load(wasmPath: string): Promise<void> {
    // Fetch and compile WASM module
    const response = await fetch(wasmPath);
    const bytes = await response.arrayBuffer();

    // Compile module (cached by browser)
    this.wasmModule = await WebAssembly.compile(bytes);

    // Instantiate with imports
    this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, {
      env: {
        memory: this.memory,
        abort: this.abort.bind(this),
        log: console.log,
      },
      js: {
        mem: this.memory,
      },
    });
  }

  private abort(msg: number, file: number, line: number, column: number): void {
    console.error('WASM abort:', { msg, file, line, column });
  }

  getExports(): any {
    if (!this.wasmInstance) {
      throw new Error('WASM module not loaded');
    }
    return this.wasmInstance.exports;
  }

  getMemory(): WebAssembly.Memory {
    return this.memory;
  }

  // Helper to convert JS string to WASM memory
  allocateString(str: string): number {
    const exports = this.getExports();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);

    const ptr = exports.malloc(encoded.length + 1);
    const memory = new Uint8Array(this.memory.buffer);

    memory.set(encoded, ptr);
    memory[ptr + encoded.length] = 0; // Null terminator

    return ptr;
  }

  // Helper to read string from WASM memory
  readString(ptr: number): string {
    const memory = new Uint8Array(this.memory.buffer);
    let end = ptr;

    while (memory[end] !== 0) {
      end++;
    }

    const decoder = new TextDecoder();
    return decoder.decode(memory.subarray(ptr, end));
  }

  // Clean up
  free(ptr: number): void {
    const exports = this.getExports();
    exports.free(ptr);
  }
}

// React hook for WASM modules
export function useWASM(wasmPath: string) {
  const [loader, setLoader] = useState<WASMLoader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initWASM = async () => {
      try {
        const wasmLoader = new WASMLoader();
        await wasmLoader.load(wasmPath);
        setLoader(wasmLoader);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initWASM();

    return () => {
      // Cleanup if needed
    };
  }, [wasmPath]);

  return { loader, isLoading, error };
}
```

## Image Processing with WebAssembly

High-performance image manipulation:

```rust
// image_processor.rs - Rust source for WASM
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ImageProcessor {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> ImageProcessor {
        ImageProcessor {
            width,
            height,
            pixels: vec![0; (width * height * 4) as usize],
        }
    }

    pub fn load_image(&mut self, data: &[u8]) {
        self.pixels = data.to_vec();
    }

    pub fn get_pixels(&self) -> Vec<u8> {
        self.pixels.clone()
    }

    pub fn apply_blur(&mut self, radius: u32) {
        let mut output = vec![0u8; self.pixels.len()];

        for y in 0..self.height {
            for x in 0..self.width {
                let mut r = 0u32;
                let mut g = 0u32;
                let mut b = 0u32;
                let mut count = 0u32;

                for dy in -(radius as i32)..=(radius as i32) {
                    for dx in -(radius as i32)..=(radius as i32) {
                        let nx = x as i32 + dx;
                        let ny = y as i32 + dy;

                        if nx >= 0 && nx < self.width as i32 &&
                           ny >= 0 && ny < self.height as i32 {
                            let idx = ((ny as u32 * self.width + nx as u32) * 4) as usize;
                            r += self.pixels[idx] as u32;
                            g += self.pixels[idx + 1] as u32;
                            b += self.pixels[idx + 2] as u32;
                            count += 1;
                        }
                    }
                }

                let idx = ((y * self.width + x) * 4) as usize;
                output[idx] = (r / count) as u8;
                output[idx + 1] = (g / count) as u8;
                output[idx + 2] = (b / count) as u8;
                output[idx + 3] = self.pixels[idx + 3];
            }
        }

        self.pixels = output;
    }

    pub fn apply_sharpen(&mut self, strength: f32) {
        let kernel = [
            0.0, -1.0, 0.0,
            -1.0, 5.0, -1.0,
            0.0, -1.0, 0.0,
        ];

        self.apply_convolution(&kernel, strength);
    }

    fn apply_convolution(&mut self, kernel: &[f32; 9], strength: f32) {
        let mut output = self.pixels.clone();

        for y in 1..self.height - 1 {
            for x in 1..self.width - 1 {
                let mut r = 0.0;
                let mut g = 0.0;
                let mut b = 0.0;

                for ky in 0..3 {
                    for kx in 0..3 {
                        let px = (x + kx - 1) as usize;
                        let py = (y + ky - 1) as usize;
                        let idx = (py * self.width as usize + px) * 4;
                        let k = kernel[ky * 3 + kx];

                        r += self.pixels[idx] as f32 * k;
                        g += self.pixels[idx + 1] as f32 * k;
                        b += self.pixels[idx + 2] as f32 * k;
                    }
                }

                let idx = ((y * self.width + x) * 4) as usize;
                output[idx] = (self.pixels[idx] as f32 * (1.0 - strength) +
                              r * strength).clamp(0.0, 255.0) as u8;
                output[idx + 1] = (self.pixels[idx + 1] as f32 * (1.0 - strength) +
                                   g * strength).clamp(0.0, 255.0) as u8;
                output[idx + 2] = (self.pixels[idx + 2] as f32 * (1.0 - strength) +
                                   b * strength).clamp(0.0, 255.0) as u8;
            }
        }

        self.pixels = output;
    }
}
```

React component using WASM image processor:

```tsx
// ImageEditor.tsx
function ImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processor, setProcessor] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load WASM module
    import('../wasm/image_processor_bg.wasm').then(async (module) => {
      const wasm = await module.default();
      setProcessor(wasm);
    });
  }, []);

  const loadImage = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Initialize WASM processor
        if (processor) {
          const imgProcessor = new processor.ImageProcessor(img.width, img.height);
          imgProcessor.load_image(imageData.data);

          // Store processor instance
          canvasRef.current.wasmProcessor = imgProcessor;
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const applyFilter = async (filterType: string) => {
    if (!canvasRef.current?.wasmProcessor) return;

    setProcessing(true);

    // Use requestAnimationFrame for smooth UI
    requestAnimationFrame(() => {
      const startTime = performance.now();
      const processor = canvasRef.current.wasmProcessor;

      switch (filterType) {
        case 'blur':
          processor.apply_blur(5);
          break;
        case 'sharpen':
          processor.apply_sharpen(0.5);
          break;
        // Add more filters
      }

      // Get processed pixels
      const pixels = processor.get_pixels();

      // Update canvas
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);

      const processingTime = performance.now() - startTime;
      console.log(`Filter applied in ${processingTime.toFixed(2)}ms`);

      setProcessing(false);
    });
  };

  return (
    <div className="image-editor">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])}
      />

      <div className="filters">
        <button onClick={() => applyFilter('blur')} disabled={processing}>
          Blur
        </button>
        <button onClick={() => applyFilter('sharpen')} disabled={processing}>
          Sharpen
        </button>
      </div>

      <canvas ref={canvasRef} />

      {processing && <div className="processing-indicator">Processing...</div>}
    </div>
  );
}
```

## Complex Calculations with WASM

Offload heavy computations:

```cpp
// math_engine.cpp - C++ source for WASM
#include <emscripten.h>
#include <vector>
#include <cmath>
#include <algorithm>

extern "C" {

EMSCRIPTEN_KEEPALIVE
double* matrix_multiply(double* a, double* b, int n) {
    double* result = (double*)malloc(n * n * sizeof(double));

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            double sum = 0;
            for (int k = 0; k < n; k++) {
                sum += a[i * n + k] * b[k * n + j];
            }
            result[i * n + j] = sum;
        }
    }

    return result;
}

EMSCRIPTEN_KEEPALIVE
void fibonacci_sequence(int* output, int count) {
    if (count <= 0) return;

    output[0] = 0;
    if (count == 1) return;

    output[1] = 1;
    for (int i = 2; i < count; i++) {
        output[i] = output[i-1] + output[i-2];
    }
}

EMSCRIPTEN_KEEPALIVE
double monte_carlo_pi(int iterations) {
    int inside = 0;

    for (int i = 0; i < iterations; i++) {
        double x = (double)rand() / RAND_MAX;
        double y = (double)rand() / RAND_MAX;

        if (x*x + y*y <= 1.0) {
            inside++;
        }
    }

    return 4.0 * inside / iterations;
}

EMSCRIPTEN_KEEPALIVE
void prime_sieve(bool* is_prime, int limit) {
    std::fill(is_prime, is_prime + limit + 1, true);
    is_prime[0] = is_prime[1] = false;

    for (int i = 2; i * i <= limit; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j <= limit; j += i) {
                is_prime[j] = false;
            }
        }
    }
}

}
```

React hook for mathematical computations:

```tsx
// useMathWASM.ts
export function useMathWASM() {
  const [wasm, setWasm] = useState<any>(null);

  useEffect(() => {
    loadMathWASM().then(setWasm);
  }, []);

  const matrixMultiply = useCallback(
    (a: number[][], b: number[][]): number[][] | null => {
      if (!wasm) return null;

      const n = a.length;
      const flatA = a.flat();
      const flatB = b.flat();

      // Allocate memory in WASM
      const bytesPerElement = 8; // double
      const aPtr = wasm._malloc(n * n * bytesPerElement);
      const bPtr = wasm._malloc(n * n * bytesPerElement);

      // Copy data to WASM memory
      wasm.HEAPF64.set(flatA, aPtr / bytesPerElement);
      wasm.HEAPF64.set(flatB, bPtr / bytesPerElement);

      // Perform multiplication
      const resultPtr = wasm._matrix_multiply(aPtr, bPtr, n);

      // Read result
      const result: number[][] = [];
      for (let i = 0; i < n; i++) {
        result[i] = [];
        for (let j = 0; j < n; j++) {
          result[i][j] = wasm.HEAPF64[resultPtr / bytesPerElement + i * n + j];
        }
      }

      // Free memory
      wasm._free(aPtr);
      wasm._free(bPtr);
      wasm._free(resultPtr);

      return result;
    },
    [wasm],
  );

  const calculatePrimes = useCallback(
    (limit: number): number[] => {
      if (!wasm) return [];

      const isPrimePtr = wasm._malloc(limit + 1);

      // Calculate primes
      wasm._prime_sieve(isPrimePtr, limit);

      // Read results
      const primes: number[] = [];
      for (let i = 2; i <= limit; i++) {
        if (wasm.HEAPU8[isPrimePtr + i]) {
          primes.push(i);
        }
      }

      wasm._free(isPrimePtr);
      return primes;
    },
    [wasm],
  );

  return {
    isReady: !!wasm,
    matrixMultiply,
    calculatePrimes,
    monteCarloPi: (iterations: number) => wasm?._monte_carlo_pi(iterations),
  };
}
```

## WASM with Web Workers

Combine WASM with Workers for maximum performance:

```tsx
// wasm-worker.ts
const ctx: Worker = self as any;

let wasmModule: any = null;

// Initialize WASM in worker
async function initWASM() {
  const response = await fetch('/wasm/processor.wasm');
  const bytes = await response.arrayBuffer();
  const module = await WebAssembly.compile(bytes);

  wasmModule = await WebAssembly.instantiate(module, {
    env: {
      memory: new WebAssembly.Memory({ initial: 256 }),
    },
  });
}

ctx.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (!wasmModule) {
    await initWASM();
  }

  switch (type) {
    case 'PROCESS_DATA':
      const result = processWithWASM(data);
      ctx.postMessage({ type: 'RESULT', data: result });
      break;

    case 'BATCH_PROCESS':
      const results = await processBatch(data);
      ctx.postMessage({ type: 'BATCH_RESULT', data: results });
      break;
  }
});

function processWithWASM(data: any) {
  const exports = wasmModule.exports;

  // Allocate memory
  const ptr = exports.malloc(data.length * 4);

  // Copy data to WASM
  const memory = new Float32Array(exports.memory.buffer);
  memory.set(data, ptr / 4);

  // Process
  exports.process_data(ptr, data.length);

  // Read result
  const result = Array.from(memory.subarray(ptr / 4, ptr / 4 + data.length));

  // Clean up
  exports.free(ptr);

  return result;
}

// React hook for WASM worker
export function useWASMWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./wasm-worker.ts', import.meta.url), {
      type: 'module',
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const process = useCallback(async (data: Float32Array): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setIsProcessing(true);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'RESULT') {
          workerRef.current?.removeEventListener('message', handleMessage);
          setIsProcessing(false);
          resolve(new Float32Array(event.data.data));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type: 'PROCESS_DATA', data });
    });
  }, []);

  return { process, isProcessing };
}
```

## Memory Management

Handle WASM memory efficiently:

```tsx
// Memory management utilities
export class WASMMemoryManager {
  private allocations: Map<number, number> = new Map();
  private exports: any;

  constructor(wasmExports: any) {
    this.exports = wasmExports;
  }

  allocate(bytes: number): number {
    const ptr = this.exports.malloc(bytes);

    if (ptr === 0) {
      throw new Error(`Failed to allocate ${bytes} bytes`);
    }

    this.allocations.set(ptr, bytes);
    return ptr;
  }

  free(ptr: number): void {
    if (!this.allocations.has(ptr)) {
      console.warn(`Attempting to free untracked pointer: ${ptr}`);
      return;
    }

    this.exports.free(ptr);
    this.allocations.delete(ptr);
  }

  freeAll(): void {
    for (const ptr of this.allocations.keys()) {
      this.exports.free(ptr);
    }
    this.allocations.clear();
  }

  getMemoryUsage(): number {
    let total = 0;
    for (const bytes of this.allocations.values()) {
      total += bytes;
    }
    return total;
  }

  // Auto-cleanup wrapper
  withMemory<T>(fn: (allocate: (bytes: number) => number) => T): T {
    const ptrs: number[] = [];

    const trackedAllocate = (bytes: number): number => {
      const ptr = this.allocate(bytes);
      ptrs.push(ptr);
      return ptr;
    };

    try {
      return fn(trackedAllocate);
    } finally {
      // Clean up all allocations
      for (const ptr of ptrs) {
        this.free(ptr);
      }
    }
  }
}

// React component with memory management
function WASMComponent() {
  const memoryManagerRef = useRef<WASMMemoryManager | null>(null);

  useEffect(() => {
    return () => {
      // Clean up all allocations on unmount
      memoryManagerRef.current?.freeAll();
    };
  }, []);

  const processData = (data: Float32Array) => {
    if (!memoryManagerRef.current) return;

    memoryManagerRef.current.withMemory((allocate) => {
      const ptr = allocate(data.length * 4);

      // Use allocated memory
      // ...

      // Memory automatically freed when function exits
    });
  };
}
```

## Performance Monitoring

Track WASM performance:

```tsx
// WASM performance monitor
export class WASMPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  measure<T>(name: string, fn: () => T): T {
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    const startTime = performance.now();

    const result = fn();

    const duration = performance.now() - startTime;
    const memoryDelta = (performance.memory?.usedJSHeapSize || 0) - startMemory;

    this.recordMetric(name, {
      duration,
      memoryDelta,
      timestamp: Date.now(),
    });

    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    const startTime = performance.now();

    const result = await fn();

    const duration = performance.now() - startTime;
    const memoryDelta = (performance.memory?.usedJSHeapSize || 0) - startMemory;

    this.recordMetric(name, {
      duration,
      memoryDelta,
      timestamp: Date.now(),
    });

    return result;
  }

  private recordMetric(name: string, metric: PerformanceMetric) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Keep only last 100 metrics
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration);
    const memoryDeltas = metrics.map((m) => m.memoryDelta);

    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
    };
  }

  compareWithJS(
    name: string,
    jsImpl: () => void,
    wasmImpl: () => void,
    iterations: number = 100,
  ): ComparisonResult {
    // Warm up
    for (let i = 0; i < 10; i++) {
      jsImpl();
      wasmImpl();
    }

    // Measure JS
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      jsImpl();
    }
    const jsTime = performance.now() - jsStart;

    // Measure WASM
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      wasmImpl();
    }
    const wasmTime = performance.now() - wasmStart;

    return {
      jsTime: jsTime / iterations,
      wasmTime: wasmTime / iterations,
      speedup: jsTime / wasmTime,
      winner: jsTime > wasmTime ? 'WASM' : 'JS',
    };
  }
}
```

## Best Practices Checklist

```typescript
interface WASMBestPractices {
  // When to use WASM
  useWhen: {
    cpuIntensive: 'Heavy mathematical computations';
    largeDatasets: 'Processing arrays with 10K+ elements';
    consistentPerformance: 'Need predictable performance';
    existingCode: 'Porting existing C/C++/Rust code';
  };

  // When NOT to use WASM
  avoidWhen: {
    domManipulation: 'Working with DOM elements';
    simpleCalculations: 'Basic arithmetic or string operations';
    frequentInterop: 'Many JS/WASM boundary crossings';
    smallData: 'Processing small amounts of data';
  };

  // Performance tips
  performance: {
    batchOperations: 'Process data in batches to reduce overhead';
    reuseMemory: 'Allocate once, reuse memory buffers';
    useWorkers: 'Run WASM in Web Workers for non-blocking';
    preloadModules: 'Load WASM modules ahead of time';
  };

  // Memory management
  memory: {
    trackAllocations: 'Keep track of all malloc calls';
    freeMemory: 'Always free allocated memory';
    useArena: 'Use arena allocation for temporary data';
    limitSize: 'Set memory limits to prevent runaway growth';
  };
}
```
