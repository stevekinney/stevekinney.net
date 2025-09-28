---
title: 'Edge, SSR, and Runtime Types'
description: >-
  Target multiple runtimes—align DOM vs Node types, edge constraints, and SSR
  data contracts with TypeScript.
date: 2025-09-06T22:04:45.055Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - ssr
  - runtime
  - edge
---

Modern React applications run in multiple JavaScript environments: browsers, Node.js servers, edge runtimes like Cloudflare Workers or Vercel Edge Functions, and everything in between. Each runtime has its own APIs, constraints, and type definitions—but your TypeScript code needs to work across all of them. Let's explore how to navigate these differences, write runtime-aware code, and ensure your SSR data contracts stay bulletproof (even when your API decides to send you `null` instead of that nice user object you were expecting).

## The Runtime Multiverse Problem

When you write React components, you're often targeting multiple JavaScript runtimes simultaneously:

- **Browser**: Full DOM APIs, client-side rendering, user interactions
- **Node.js**: Server-side rendering, file system access, full Node APIs
- **Edge Runtime**: Lightweight V8 isolates with Web APIs but no Node.js APIs
- **Build Time**: Static generation during your build process

Each runtime has different global objects, different APIs, and crucially—different TypeScript definitions. Your component might render perfectly in the browser but throw type errors when you try to SSR it, or work great on your Node.js server but fail mysteriously when deployed to an edge function.

Here's a common example of this pain:

```ts
// ❌ This works in browser but breaks in Node.js
function MyComponent() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,  // ReferenceError: window is not defined
    height: window.innerHeight
  });

  return <div>Window size: {windowSize.width}x{windowSize.height}</div>;
}
```

## See Also

- [Edge, SSR, and Hydration Payload Types](edge-ssr-hydration.md)
- [Security and Escaping Types](security-and-escaping-types.md)

## Understanding Runtime Environments

### Browser Runtime

The browser gives you the full DOM APIs, `window` object, and client-side capabilities:

```ts
// ✅ Browser-specific APIs
declare const window: Window & typeof globalThis;
declare const document: Document;
declare const localStorage: Storage;
declare const fetch: typeof globalThis.fetch;
```

### Node.js Runtime

Node.js provides server APIs, file system access, and process management:

```ts
// ✅ Node.js-specific APIs
declare const process: NodeJS.Process;
declare const global: NodeJS.Global;
declare const __dirname: string;
declare const __filename: string;
```

### Edge Runtime

Edge functions (Cloudflare Workers, Vercel Edge, Deno Deploy) use Web APIs but lack Node.js APIs:

```ts
// ✅ Edge runtime APIs (Web Standard APIs)
declare const Request: typeof globalThis.Request;
declare const Response: typeof globalThis.Response;
declare const fetch: typeof globalThis.fetch;
declare const Headers: typeof globalThis.Headers;
// ❌ No Node.js APIs like `fs`, `process`, etc.
```

## Runtime Detection Patterns

Before you can write runtime-aware code, you need to reliably detect which environment you're in. Here are some battle-tested patterns:

### Basic Environment Detection

```ts
// ✅ Robust runtime detection utilities
export const isServer = typeof window === 'undefined';
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;
export const isEdge = typeof EdgeRuntime !== 'undefined';

// More specific detections
export const isDeno = typeof Deno !== 'undefined';
export const isCloudflareWorkers =
  typeof caches !== 'undefined' && typeof navigator === 'undefined';
export const isWebWorker = typeof importScripts === 'function';
```

### Advanced Runtime Detection

For more nuanced scenarios, you might need to check for specific API availability:

```ts
type RuntimeEnvironment = 'browser' | 'node' | 'edge' | 'unknown';

export function detectRuntime(): RuntimeEnvironment {
  // Check for browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  // Check for edge runtime (has fetch but no Node APIs)
  if (typeof fetch !== 'undefined' && typeof process === 'undefined') {
    return 'edge';
  }

  return 'unknown';
}

// ✅ Use it in your components
function MyComponent() {
  const runtime = detectRuntime();

  if (runtime === 'browser') {
    // Safe to use DOM APIs
    const width = window.innerWidth;
  }

  return <div>Running in: {runtime}</div>;
}
```

## Type-Safe Runtime Branching

TypeScript's control flow analysis can help you write runtime-aware code that's also type-safe. Here's how to do it properly:

### Conditional API Usage

```ts
// ✅ TypeScript understands the runtime check
function getEnvironmentInfo() {
  if (typeof window !== 'undefined') {
    // TypeScript knows `window` is available here
    return {
      type: 'browser' as const,
      userAgent: window.navigator.userAgent,
      url: window.location.href,
    };
  }

  if (typeof process !== 'undefined') {
    // TypeScript knows `process` is available here
    return {
      type: 'node' as const,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  return {
    type: 'unknown' as const,
  };
}

type EnvironmentInfo = ReturnType<typeof getEnvironmentInfo>;
// Type is: { type: 'browser'; userAgent: string; url: string } |
//           { type: 'node'; nodeVersion: string; platform: string } |
//           { type: 'unknown' }
```

### Custom Type Guards

Create reusable type guards for common runtime checks:

```ts
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isServerEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null;
}

// ✅ Use in components with proper typing
function WindowSizeComponent() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isBrowserEnvironment()) return;

    // TypeScript knows we're in browser context here
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!size) return <div>Loading...</div>;

  return <div>Size: {size.width} x {size.height}</div>;
}
```

## SSR Data Contract Validation

Server-side rendering introduces another layer of complexity: data that's fetched on the server must be serialized, sent to the client, and then hydrated back into your React components. This process is fraught with opportunities for type mismatches and runtime errors.

### The Serialization Problem

Not all JavaScript values survive the server-to-client journey:

```ts
// ❌ These don't serialize well
const problematicData = {
  date: new Date(), // Becomes string
  undefined: undefined, // Disappears entirely
  func: () => 'hello', // Becomes undefined
  symbol: Symbol('test'), // Becomes undefined
  bigint: 123n, // JSON.stringify throws
};

JSON.stringify(problematicData);
// Result: '{"date":"2025-01-06T12:00:00.000Z"}'
```

### Safe Serialization with Zod

Use Zod to define serializable data contracts that work across the server-client boundary:

```ts
import { z } from 'zod';

// ✅ Define what can safely cross the server-client boundary
export const SerializableUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(), // Store as ISO string, not Date
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
  posts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      publishedAt: z.string().datetime(),
    }),
  ),
});

export type SerializableUser = z.infer<typeof SerializableUserSchema>;

// ✅ Runtime validation ensures contract compliance
export function validateServerData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('Server data validation failed:', result.error.errors);
    throw new Error('Invalid server data shape');
  }

  return result.data;
}
```

### SSR Data Flow Pattern

Here's a complete pattern for type-safe SSR data handling:

```ts
// server.ts - Server-side data fetching
export async function getServerSideProps() {
  try {
    // Fetch from your API/database
    const rawUserData = await fetchUserFromAPI();

    // Transform to serializable format
    const serializableUser: SerializableUser = {
      id: rawUserData.id,
      name: rawUserData.name,
      email: rawUserData.email,
      createdAt: rawUserData.createdAt.toISOString(), // Date → string
      preferences: rawUserData.preferences,
      posts: rawUserData.posts.map(post => ({
        id: post.id,
        title: post.title,
        publishedAt: post.publishedAt.toISOString(), // Date → string
      })),
    };

    // Validate before sending to client
    const validatedUser = validateServerData(SerializableUserSchema, serializableUser);

    return {
      props: {
        user: validatedUser,
      },
    };
  } catch (error) {
    return {
      props: {
        user: null,
      },
    };
  }
}

// UserProfile.tsx - Client-side component
interface UserProfileProps {
  user: SerializableUser | null;
}

export function UserProfile({ user: serverUser }: UserProfileProps) {
  // ✅ Validate props even on client (defense in depth)
  const user = useMemo(() => {
    if (!serverUser) return null;

    try {
      return validateServerData(SerializableUserSchema, serverUser);
    } catch {
      console.error('Client-side user data validation failed');
      return null;
    }
  }, [serverUser]);

  // ✅ Convert back to rich types when needed
  const createdAtDate = user ? new Date(user.createdAt) : null;

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Member since: {createdAtDate?.toLocaleDateString()}</p>
      <p>Theme: {user.preferences.theme}</p>
      <div>
        <h2>Posts</h2>
        {user.posts.map(post => (
          <article key={post.id}>
            <h3>{post.title}</h3>
            <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
```

## Edge Runtime Constraints

Edge functions run in a constrained environment with specific limitations. Understanding these helps you write code that works reliably:

### What's Available in Edge Runtime

```ts
// ✅ Standard Web APIs (available everywhere)
(fetch, Request, Response, Headers, URL, URLSearchParams);
(crypto, TextEncoder, TextDecoder);
(console, setTimeout, clearTimeout);

// ✅ Some Node.js-compatible APIs
Buffer; // Available but limited
```

### What's NOT Available

```ts
// ❌ Node.js specific APIs (will cause runtime errors)
(fs, path, os, crypto.createHash);
process.env; // Use different approach
(__dirname, __filename);
```

### Edge-Safe Patterns

Here's how to write code that works in edge environments:

```ts
// ✅ Environment variables in edge runtime
function getEnvVar(key: string): string | undefined {
  // Different runtimes store env vars differently
  if (typeof process !== 'undefined') {
    return process.env[key];
  }

  // Cloudflare Workers style
  if (typeof globalThis !== 'undefined' && 'env' in globalThis) {
    return (globalThis as any).env[key];
  }

  return undefined;
}

// ✅ Edge-compatible crypto operations
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ✅ Cross-runtime JSON handling
function safeJSONParse<T>(json: string, schema: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(json);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
```

## Practical Patterns for Multi-Runtime Code

### The Universal Component Pattern

Write components that gracefully degrade across runtimes:

```ts
interface UniversalComponentProps {
  data: SerializableUser;
  className?: string;
}

export function UniversalUserCard({ data, className }: UniversalComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);

  // ✅ Safe client-side hydration
  useEffect(() => {
    setIsClient(true);

    if (typeof window !== 'undefined') {
      const updateWidth = () => setWindowWidth(window.innerWidth);
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  // ✅ Render something meaningful on server
  const displayWidth = isClient && windowWidth ? windowWidth : 'unknown';

  return (
    <div className={className}>
      <h2>{data.name}</h2>
      <p>Email: {data.email}</p>
      {isClient && <p>Your screen width: {displayWidth}px</p>}
      <time>
        Member since: {new Date(data.createdAt).toLocaleDateString()}
      </time>
    </div>
  );
}
```

### The Runtime-Specific Hook Pattern

Create hooks that adapt behavior based on runtime:

```ts
function useRuntimeAwareStorage() {
  const [storage, setStorage] = useState<Storage | null>(null);

  useEffect(() => {
    // Only set storage on client
    if (typeof window !== 'undefined') {
      setStorage(window.localStorage);
    }
  }, []);

  const setItem = useCallback((key: string, value: string) => {
    storage?.setItem(key, value);
  }, [storage]);

  const getItem = useCallback((key: string): string | null => {
    return storage?.getItem(key) ?? null;
  }, [storage]);

  return { setItem, getItem, isAvailable: storage !== null };
}

function MyComponent() {
  const { setItem, getItem, isAvailable } = useRuntimeAwareStorage();

  const handleSave = (data: string) => {
    if (isAvailable) {
      setItem('user-data', data);
    } else {
      console.log('Storage not available - maybe send to server?');
    }
  };

  return <div>{/* component implementation */}</div>;
}
```

## Real World Example: API Route Handler

Let's put it all together with a realistic API route that works across different hosting platforms:

```ts
// api/user/[id].ts - Universal API handler
import { z } from 'zod';

const UserQuerySchema = z.object({
  id: z.string().min(1),
});

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

type UserResponse = z.infer<typeof UserResponseSchema>;

// ✅ Works in Node.js, Edge, and other runtimes
export async function GET(request: Request) {
  try {
    // Parse URL parameters (works everywhere)
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // Validate input
    const queryResult = UserQuerySchema.safeParse({ id });
    if (!queryResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Runtime-aware database connection
    const db = await getDatabaseConnection();
    const rawUser = await db.users.findById(queryResult.data.id);

    if (!rawUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform to serializable format
    const serializableUser: UserResponse = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      createdAt: rawUser.createdAt.toISOString(),
    };

    // Final validation before sending
    const validatedUser = UserResponseSchema.parse(serializableUser);

    return new Response(JSON.stringify(validatedUser), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Runtime-aware database connection
async function getDatabaseConnection() {
  const runtime = detectRuntime();

  switch (runtime) {
    case 'edge':
      // Use HTTP-based database for edge (like PlanetScale, Neon)
      return createHTTPDatabaseConnection();
    case 'node':
      // Can use traditional database drivers
      return createNodeDatabaseConnection();
    default:
      throw new Error(`Unsupported runtime: ${runtime}`);
  }
}
```

## Testing Across Runtimes

Don't forget to test your runtime-aware code! Here's a testing strategy:

```ts
// test-utils.ts
export function mockBrowserEnvironment() {
  Object.defineProperty(global, 'window', {
    value: {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    writable: true,
  });
}

export function mockServerEnvironment() {
  delete (global as any).window;
  Object.defineProperty(global, 'process', {
    value: {
      versions: { node: '18.0.0' },
      platform: 'linux',
    },
    writable: true,
  });
}

// user-component.test.ts
describe('UniversalUserCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly in browser environment', () => {
    mockBrowserEnvironment();

    const user = {
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2025-01-06T12:00:00.000Z'
    };

    render(<UniversalUserCard data={user} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    // Should show client-specific content after hydration
  });

  test('renders correctly in server environment', () => {
    mockServerEnvironment();

    const user = {
      name: 'Bob',
      email: 'bob@example.com',
      createdAt: '2025-01-06T12:00:00.000Z'
    };

    render(<UniversalUserCard data={user} />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Should not show client-specific content initially
    expect(screen.queryByText(/screen width/)).not.toBeInTheDocument();
  });
});
```

## Key Takeaways

Building React applications that work across multiple runtimes requires thoughtful planning and defensive coding:

1. **Always validate runtime assumptions**—don't assume DOM APIs are available
2. **Use Zod for SSR data contracts**—catch serialization issues before they reach production
3. **Design for graceful degradation**—components should work even when runtime features aren't available
4. **Test across environments**—your code should work whether it's running in a browser, on a server, or in an edge function
5. **Embrace the constraint**—edge runtime limitations force you to write more portable, efficient code

The payoff is React applications that deploy anywhere and provide consistent user experiences across the entire spectrum of modern hosting platforms. Your users won't care what runtime powers your app—they'll just notice it works fast, everywhere.

Next up, we'll explore how to optimize these multi-runtime applications for performance and dive into advanced patterns like streaming SSR and partial hydration.
