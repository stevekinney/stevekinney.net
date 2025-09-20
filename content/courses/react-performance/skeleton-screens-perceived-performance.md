---
title: Skeleton Screens & Perceived Performance
description: >-
  Make your React app feel instant with skeleton screens. Master loading states,
  progressive enhancement, and psychological performance tricks.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - ux
  - loading
  - skeleton-screens
---

Your React app takes 2 seconds to load data. You can't make it faster—the API is slow, the computation is complex, or the user's on a weak connection. But here's the secret: users don't actually care about real performance metrics. They care about _perceived_ performance. A 2-second wait with a skeleton screen feels faster than a 1-second wait with a spinner. It's not magic, it's psychology, and it's one of the most powerful performance optimizations you can make without touching a single algorithm.

Skeleton screens are the art of showing users what's coming before it arrives. Instead of spinners that scream "something's wrong," skeletons whisper "here's exactly what you're about to see." They maintain layout stability, prevent content jumps, and most importantly, they hack the user's perception of time. This guide shows you how to implement skeleton screens that make your React app feel blazingly fast, even when it's not.

## The Psychology of Perceived Performance

Understanding why skeleton screens work is key to implementing them effectively:

```tsx
// Perceived performance principles
interface PerceptualPerformance {
  // Why skeletons work
  psychology: {
    progressIndicator: 'Shows continuous progress vs binary state';
    expectationSetting: 'Prepares user for content structure';
    cognitiveLoad: 'Reduces uncertainty and anxiety';
    timePerception: 'Active waiting feels shorter than passive';
  };

  // Performance perception factors
  factors: {
    actualTime: number; // Real loading time
    perceivedTime: number; // How long it feels
    uncertaintyPenalty: 1.5; // Uncertain waits feel 50% longer
    progressBonus: 0.7; // Progress indicators feel 30% shorter
  };

  // User experience impact
  impact: {
    bounceRate: '32% reduction with skeletons vs spinners';
    engagement: '47% more likely to wait for content';
    satisfaction: 'Higher perceived performance scores';
  };
}

// Actual vs perceived performance comparison
function PerformanceComparison() {
  const [loadingType, setLoadingType] = useState<'spinner' | 'skeleton'>('skeleton');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Same actual loading time
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [loadingType]);

  return (
    <div>
      {isLoading ? (
        loadingType === 'spinner' ? (
          <Spinner /> // Feels like: 3 seconds
        ) : (
          <SkeletonCard /> // Feels like: 1.4 seconds
        )
      ) : (
        <ContentCard />
      )}
    </div>
  );
}
```

## Building Reusable Skeleton Components

Create a flexible skeleton system:

```tsx
// Base skeleton component with animations
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const SkeletonBase = styled.div<{
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}>`
  background: ${(props) =>
    props.animation === 'none'
      ? '#e0e0e0'
      : `linear-gradient(
        90deg,
        #f0f0f0 0%,
        #e0e0e0 20%,
        #f0f0f0 40%,
        #f0f0f0 100%
      )`};
  background-size: 1000px 100%;
  animation: ${(props) => (props.animation === 'wave' ? shimmer : 'none')} 2s infinite linear;

  width: ${(props) =>
    typeof props.width === 'number' ? `${props.width}px` : props.width || '100%'};
  height: ${(props) =>
    typeof props.height === 'number' ? `${props.height}px` : props.height || '20px'};

  border-radius: ${(props) => {
    switch (props.variant) {
      case 'circular':
        return '50%';
      case 'text':
        return '4px';
      default:
        return '8px';
    }
  }};

  ${(props) =>
    props.animation === 'pulse' &&
    `
    animation: pulse 1.5s ease-in-out infinite;

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
  `}
`;

// Skeleton primitive components
export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  animation = 'wave',
  className,
}: SkeletonProps) {
  return (
    <SkeletonBase
      width={width}
      height={height}
      variant={variant}
      animation={animation}
      className={className}
      aria-label="Loading..."
      role="status"
    />
  );
}

// Text skeleton with multiple lines
export function SkeletonText({ lines = 3, spacing = 8, lastLineWidth = '60%' }: SkeletonTextProps) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={16}
          style={{
            marginBottom: index < lines - 1 ? spacing : 0,
          }}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ size = 40 }: SkeletonAvatarProps) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

// Complex skeleton compositions
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <SkeletonAvatar />
        <div className="skeleton-header-text">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={200} />
      <div className="skeleton-content">
        <SkeletonText lines={3} />
      </div>
      <div className="skeleton-actions">
        <Skeleton width={80} height={36} />
        <Skeleton width={80} height={36} />
      </div>
    </div>
  );
}
```

## Smart Skeleton Loading Patterns

Implement intelligent loading strategies:

```tsx
// Progressive skeleton loading
function useProgressiveSkeleton<T>(
  fetcher: () => Promise<T>,
  options?: {
    delay?: number; // Delay before showing skeleton
    minimumDuration?: number; // Minimum skeleton display time
    timeout?: number; // Timeout for slow requests
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { delay = 200, minimumDuration = 500, timeout = 10000 } = options || {};

  useEffect(() => {
    let delayTimer: NodeJS.Timeout;
    let minimumTimer: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    let skeletonShownAt: number;

    // Don't show skeleton immediately for fast requests
    delayTimer = setTimeout(() => {
      setShowSkeleton(true);
      skeletonShownAt = Date.now();
    }, delay);

    // Timeout for very slow requests
    timeoutTimer = setTimeout(() => {
      setError(new Error('Request timeout'));
      setShowSkeleton(false);
    }, timeout);

    // Fetch data
    fetcher()
      .then(async (result) => {
        clearTimeout(timeoutTimer);

        // Ensure minimum skeleton duration for consistency
        if (skeletonShownAt) {
          const elapsed = Date.now() - skeletonShownAt;
          const remaining = minimumDuration - elapsed;

          if (remaining > 0) {
            await new Promise((resolve) => {
              minimumTimer = setTimeout(resolve, remaining);
            });
          }
        }

        setData(result);
        setShowSkeleton(false);
      })
      .catch((err) => {
        setError(err);
        setShowSkeleton(false);
      })
      .finally(() => {
        clearTimeout(delayTimer);
      });

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(minimumTimer);
      clearTimeout(timeoutTimer);
    };
  }, [fetcher, delay, minimumDuration, timeout]);

  return { data, showSkeleton, error };
}

// Skeleton with content preview
function ContentPreviewSkeleton({ preview }: { preview?: Partial<Content> }) {
  return (
    <div className="content-skeleton">
      {/* Show actual title if available */}
      {preview?.title ? <h2>{preview.title}</h2> : <Skeleton width="70%" height={32} />}

      {/* Show partial content with skeleton */}
      {preview?.excerpt ? <p className="excerpt">{preview.excerpt}</p> : <SkeletonText lines={3} />}

      {/* Always skeleton for slow-loading parts */}
      <Skeleton variant="rectangular" height={300} />

      {/* Metadata skeleton */}
      <div className="metadata">
        {preview?.author ? <span>{preview.author}</span> : <Skeleton width={120} height={16} />}
        <Skeleton width={80} height={16} />
      </div>
    </div>
  );
}

// Adaptive skeleton based on connection speed
function AdaptiveSkeleton() {
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  useEffect(() => {
    const connection = (navigator as any).connection;

    if (connection) {
      const updateQuality = () => {
        const effectiveType = connection.effectiveType;
        setQuality(effectiveType === '4g' ? 'high' : 'low');
      };

      updateQuality();
      connection.addEventListener('change', updateQuality);

      return () => connection.removeEventListener('change', updateQuality);
    }
  }, []);

  if (quality === 'low') {
    // Simpler skeleton for slow connections
    return <SimpleSkeleton />;
  }

  // Rich skeleton for fast connections
  return <DetailedSkeleton />;
}
```

## Layout-Preserving Skeletons

Prevent layout shift with accurate skeletons:

```tsx
// Layout-stable skeleton system
interface SkeletonConfig {
  dimensions: {
    width: number | string;
    height: number | string;
  };
  aspectRatio?: number;
  children?: SkeletonConfig[];
}

function useLayoutSkeleton(ref: RefObject<HTMLElement>) {
  const [skeleton, setSkeleton] = useState<SkeletonConfig | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Capture actual element dimensions
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      setSkeleton({
        dimensions: { width, height },
        aspectRatio: width / height,
      });
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);

  return skeleton;
}

// Auto-sizing skeleton
function AutoSkeleton({ children, loading }: AutoSkeletonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!loading && ref.current) {
      // Capture dimensions when content loads
      setDimensions(ref.current.getBoundingClientRect());
    }
  }, [loading]);

  if (loading) {
    return (
      <div
        style={{
          width: dimensions?.width || '100%',
          height: dimensions?.height || 'auto',
        }}
      >
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }

  return <div ref={ref}>{children}</div>;
}

// Skeleton that matches exact content structure
function ContentAwareSkeleton({ template }: { template: ContentTemplate }) {
  const renderSkeleton = (node: TemplateNode): ReactNode => {
    switch (node.type) {
      case 'text':
        return <SkeletonText lines={node.lines} lastLineWidth={node.lastLineWidth} />;

      case 'image':
        return (
          <Skeleton
            variant="rectangular"
            width={node.width}
            height={node.height}
            style={{ aspectRatio: node.aspectRatio }}
          />
        );

      case 'container':
        return (
          <div className={node.className}>
            {node.children?.map((child, index) => (
              <div key={index}>{renderSkeleton(child)}</div>
            ))}
          </div>
        );

      default:
        return <Skeleton />;
    }
  };

  return <>{renderSkeleton(template.root)}</>;
}
```

## Incremental Content Loading

Load content progressively as it becomes available:

```tsx
// Incremental loading with partial skeletons
function IncrementalContent() {
  const [content, setContent] = useState<Partial<Article>>({});
  const [loadingStates, setLoadingStates] = useState({
    header: true,
    body: true,
    comments: true,
    related: true,
  });

  useEffect(() => {
    // Load header first (fastest)
    fetchHeader().then((header) => {
      setContent((prev) => ({ ...prev, ...header }));
      setLoadingStates((prev) => ({ ...prev, header: false }));
    });

    // Load body (medium speed)
    fetchBody().then((body) => {
      setContent((prev) => ({ ...prev, ...body }));
      setLoadingStates((prev) => ({ ...prev, body: false }));
    });

    // Load comments (slow)
    fetchComments().then((comments) => {
      setContent((prev) => ({ ...prev, comments }));
      setLoadingStates((prev) => ({ ...prev, comments: false }));
    });

    // Load related articles (slowest)
    fetchRelated().then((related) => {
      setContent((prev) => ({ ...prev, related }));
      setLoadingStates((prev) => ({ ...prev, related: false }));
    });
  }, []);

  return (
    <article>
      {/* Header loads first */}
      {loadingStates.header ? <HeaderSkeleton /> : <Header {...content} />}

      {/* Body loads independently */}
      {loadingStates.body ? <BodySkeleton /> : <Body content={content.body} />}

      {/* Comments can load later */}
      {loadingStates.comments ? <CommentsSkeleton /> : <Comments comments={content.comments} />}

      {/* Related articles load last */}
      {loadingStates.related ? <RelatedSkeleton /> : <RelatedArticles articles={content.related} />}
    </article>
  );
}

// Streaming skeleton updates
function StreamingSkeleton() {
  const [loadedParts, setLoadedParts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const { part, data } = JSON.parse(event.data);
      setLoadedParts((prev) => new Set([...prev, part]));
      // Update content...
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="streaming-content">
      {['header', 'sidebar', 'main', 'footer'].map((part) => (
        <div key={part} className={part}>
          {loadedParts.has(part) ? <Content part={part} /> : <SkeletonPart type={part} />}
        </div>
      ))}
    </div>
  );
}
```

## Animated Skeleton Transitions

Smooth transitions from skeleton to content:

```tsx
// Smooth skeleton-to-content transition
const ContentTransition = styled.div<{ isLoading: boolean }>`
  position: relative;

  .skeleton-layer {
    position: ${(props) => (props.isLoading ? 'relative' : 'absolute')};
    top: 0;
    left: 0;
    right: 0;
    opacity: ${(props) => (props.isLoading ? 1 : 0)};
    transition: opacity 0.3s ease-out;
    pointer-events: ${(props) => (props.isLoading ? 'auto' : 'none')};
  }

  .content-layer {
    opacity: ${(props) => (props.isLoading ? 0 : 1)};
    transform: ${(props) => (props.isLoading ? 'translateY(10px)' : 'translateY(0)')};
    transition:
      opacity 0.3s ease-out,
      transform 0.3s ease-out;
  }
`;

function SmoothSkeletonTransition({ loading, skeleton, content }: TransitionProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Slight delay for smooth transition
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [loading]);

  return (
    <ContentTransition isLoading={loading}>
      <div className="skeleton-layer">{skeleton}</div>
      {showContent && <div className="content-layer">{content}</div>}
    </ContentTransition>
  );
}

// Staggered content reveal
function StaggeredReveal({ items, loading }: StaggeredRevealProps) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!loading && items.length > 0) {
      const interval = setInterval(() => {
        setRevealedCount((prev) => {
          if (prev >= items.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 100); // Reveal one item every 100ms

      return () => clearInterval(interval);
    }
  }, [loading, items.length]);

  return (
    <div className="staggered-list">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="staggered-item"
          style={{
            opacity: index < revealedCount ? 1 : 0,
            transform: index < revealedCount ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
            transitionDelay: `${index * 0.05}s`,
          }}
        >
          {loading ? <ItemSkeleton /> : <Item data={item} />}
        </div>
      ))}
    </div>
  );
}
```

## Skeleton Themes and Variations

Create contextual skeleton variants:

```tsx
// Theme-aware skeleton system
interface SkeletonTheme {
  baseColor: string;
  highlightColor: string;
  animation: 'wave' | 'pulse' | 'none';
  speed: number;
  borderRadius: number;
}

const SkeletonThemeContext = createContext<SkeletonTheme>({
  baseColor: '#e0e0e0',
  highlightColor: '#f0f0f0',
  animation: 'wave',
  speed: 2,
  borderRadius: 4,
});

// Dark mode skeleton
const darkTheme: SkeletonTheme = {
  baseColor: '#2a2a2a',
  highlightColor: '#3a3a3a',
  animation: 'pulse',
  speed: 1.5,
  borderRadius: 4,
};

// High contrast skeleton
const highContrastTheme: SkeletonTheme = {
  baseColor: '#000000',
  highlightColor: '#333333',
  animation: 'none',
  speed: 0,
  borderRadius: 0,
};

// Contextual skeleton variations
function ContextualSkeleton({ context }: { context: 'card' | 'list' | 'grid' }) {
  switch (context) {
    case 'card':
      return <CardSkeleton />;

    case 'list':
      return <ListItemSkeleton />;

    case 'grid':
      return <GridItemSkeleton />;

    default:
      return <GenericSkeleton />;
  }
}

// Responsive skeleton
function ResponsiveSkeleton() {
  const [variant, setVariant] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateVariant = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setVariant('mobile');
      } else if (width < 1024) {
        setVariant('tablet');
      } else {
        setVariant('desktop');
      }
    };

    updateVariant();
    window.addEventListener('resize', updateVariant);

    return () => window.removeEventListener('resize', updateVariant);
  }, []);

  return <SkeletonVariant type={variant} />;
}
```

## Performance Optimizations

Optimize skeleton performance:

```tsx
// Optimized skeleton rendering
const MemoizedSkeleton = memo(
  function MemoizedSkeleton({ type, count = 1 }: MemoizedSkeletonProps) {
    // Use CSS for animations instead of JS
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`skeleton skeleton--${type}`} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if type or count changes
    return prevProps.type === nextProps.type && prevProps.count === nextProps.count;
  },
);

// CSS-only skeleton animation
const cssSkeletonStyles = `
  @keyframes skeleton-wave {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .skeleton {
    position: relative;
    overflow: hidden;
    background: #e0e0e0;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: skeleton-wave 2s infinite;
      will-change: transform;
    }
  }
`;

// Virtualized skeleton for long lists
function VirtualizedSkeleton({ itemCount, itemHeight }: VirtualizedSkeletonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.ceil((scrollTop + containerHeight) / itemHeight);

      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [itemHeight]);

  const visibleItems = Array.from(
    { length: visibleRange.end - visibleRange.start },
    (_, i) => visibleRange.start + i,
  );

  return (
    <div
      ref={containerRef}
      className="virtualized-skeleton"
      style={{ height: 400, overflow: 'auto' }}
    >
      <div style={{ height: itemCount * itemHeight }}>
        {visibleItems.map((index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            <ItemSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Accessibility Considerations

Make skeletons accessible:

```tsx
// Accessible skeleton components
function AccessibleSkeleton({ type }: AccessibleSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading content">
      <span className="sr-only">Loading {type}...</span>
      <div className="skeleton" aria-hidden="true">
        {/* Visual skeleton */}
      </div>
    </div>
  );
}

// Screen reader announcements
function SkeletonWithAnnouncements({ loading, contentType }: AnnouncedSkeletonProps) {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (loading && !announced) {
      // Announce loading state
      announceToScreenReader(`Loading ${contentType}`);
      setAnnounced(true);
    } else if (!loading && announced) {
      // Announce completion
      announceToScreenReader(`${contentType} loaded`);
      setAnnounced(false);
    }
  }, [loading, contentType, announced]);

  return loading ? <Skeleton /> : null;
}

function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

## Best Practices Checklist

```typescript
interface SkeletonBestPractices {
  // Design
  design: {
    matchLayout: 'Skeleton should match actual content structure';
    preserveSpace: 'Maintain exact dimensions to prevent shifts';
    subtleAnimation: 'Use gentle animations that dont distract';
    consistentStyle: 'Keep skeleton style consistent across app';
  };

  // Performance
  performance: {
    cssAnimations: 'Use CSS animations over JavaScript';
    memoization: 'Memoize skeleton components';
    lazyRender: 'Only render visible skeletons';
    simplifyMobile: 'Use simpler skeletons on slow devices';
  };

  // UX
  ux: {
    showDelay: 'Delay skeleton for fast requests (200ms)';
    minimumDuration: 'Show skeleton for minimum time (500ms)';
    progressiveLoad: 'Load content incrementally';
    smoothTransition: 'Fade from skeleton to content';
  };

  // Accessibility
  accessibility: {
    announceLoading: 'Announce loading state to screen readers';
    properRoles: 'Use role="status" and aria-busy';
    hiddenDecorative: 'Hide decorative elements from screen readers';
    meaningfulLabels: 'Provide context about what is loading';
  };
}
```

## Related Topics

- **[Suspense for Data Fetching](./suspense-for-data-fetching.md)** - Implement declarative loading states with React Suspense boundaries
- **[Image and Asset Optimization](./image-and-asset-optimization.md)** - Optimize image loading to reduce the time skeleton screens are visible
- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Understand how perceived performance affects your Core Web Vitals scores
- **[Animation Performance](./animation-performance.md)** - Create smooth skeleton animations that don't impact performance
- **[Resource Preloading APIs](./resource-preloading-apis.md)** - Preload content to minimize skeleton screen duration

## Wrapping Up

Skeleton screens are the ultimate performance hack—they make your app feel faster without actually being faster. By showing users the shape of content before it arrives, you transform dead waiting time into active anticipation. The psychology is simple: uncertainty makes time drag, while visible progress makes it fly.

The key is accuracy and subtlety. Your skeletons should match your content structure exactly to prevent jarring transitions. Animations should be smooth but not distracting. And most importantly, the skeleton-to-content transition should feel natural, not like two completely different states.

Master skeleton screens, and you'll have users perceiving your React app as lightning-fast, even when it's waiting on that slow API or crunching through complex calculations. Sometimes the best performance optimization isn't making things faster—it's making them feel faster.
