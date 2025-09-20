---
title: INP Production Monitoring
description: >-
  Measure, track, and improve Interaction to Next Paint (INP) in production
  React applications with real user data
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
status: published
tags:
  - React
  - Performance
  - INP
  - Monitoring
  - Core Web Vitals
---

You've optimized your React app locally. INP scores are perfect in your testing. You deploy to production, and suddenly users are experiencing 500ms interaction delays. What went wrong? Everything. Real users have real devices, real network conditions, and real usage patterns that your synthetic tests never captured.

This is why production INP monitoring isn't optional—it's essential. You need to know how actual users experience your app, which interactions are slow, and most importantly, why they're slow. Without this data, you're optimizing blind.

Let's build a comprehensive INP monitoring system that captures every interaction, identifies patterns, and gives you the insights you need to fix performance issues before users complain.

## Building an INP Monitoring System

### Core INP Collection

```typescript
import { onINP, INPMetric, INPAttribution } from 'web-vitals';

class INPCollector {
  private metrics: INPMetric[] = [];
  private attributions = new Map<string, INPAttribution>();
  private userContext: UserContext;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userContext = this.collectUserContext();
    this.startCollection();
  }

  private startCollection() {
    // Collect INP with attribution
    onINP(
      (metric) => {
        this.processMetric(metric);
      },
      {
        reportAllChanges: true, // Get continuous updates
        durationThreshold: 40, // Report all interactions > 40ms
      },
    );

    // Also collect raw event timing
    this.collectEventTiming();
  }

  private processMetric(metric: INPMetric) {
    // Enrich with context
    const enrichedMetric = {
      ...metric,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timestamp: Date.now(),
      context: this.userContext,
    };

    this.metrics.push(enrichedMetric);

    // Report if threshold exceeded
    if (metric.value > 200) {
      this.reportSlowInteraction(enrichedMetric);
    }
  }

  private collectEventTiming() {
    if (!PerformanceObserver.supportedEntryTypes.includes('event')) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;

        if (eventEntry.duration > 100) {
          this.analyzeSlowEvent(eventEntry);
        }
      }
    });

    observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 100,
    });
  }

  private analyzeSlowEvent(event: PerformanceEventTiming) {
    const analysis = {
      type: event.name,
      duration: event.duration,
      processingStart: event.processingStart,
      processingEnd: event.processingEnd,
      inputDelay: event.processingStart - event.startTime,
      processingTime: event.processingEnd - event.processingStart,
      presentationTime: event.duration - (event.processingEnd - event.startTime),
      target: this.getTargetSelector(event.target),
    };

    this.attributions.set(event.interactionId || '', analysis);
  }

  private getTargetSelector(target: EventTarget | null): string {
    if (!target || !(target instanceof Element)) return 'unknown';

    // Build a selector path
    const path: string[] = [];
    let element: Element | null = target;

    while (element && path.length < 5) {
      let selector = element.tagName.toLowerCase();

      if (element.id) {
        selector += `#${element.id}`;
        path.unshift(selector);
        break;
      }

      if (element.className) {
        const classes = element.className.split(' ').filter(Boolean);
        if (classes.length) {
          selector += `.${classes[0]}`;
        }
      }

      path.unshift(selector);
      element = element.parentElement;
    }

    return path.join(' > ');
  }

  private getConnectionInfo() {
    const connection = (navigator as any).connection;
    if (!connection) return null;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
}

interface UserContext {
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  referrer: string;
  language: string;
  cookieEnabled: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  duration: number;
  interactionId?: string;
  processingStart: number;
  processingEnd: number;
  target?: EventTarget | null;
}
```

## React-Specific INP Tracking

### Component-Level Performance Tracking

```typescript
// HOC for component interaction tracking
function withINPTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const interactionRef = useRef<Map<string, number>>(new Map());

    const trackInteraction = useCallback((eventName: string) => {
      const startTime = performance.now();
      interactionRef.current.set(eventName, startTime);

      // Schedule measurement after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          if (duration > 50) {
            reportComponentINP({
              component: componentName,
              event: eventName,
              duration,
              props: sanitizeProps(props)
            });
          }
        });
      });
    }, [props]);

    // Wrap event handlers
    const wrappedProps = useMemo(() => {
      const wrapped: any = { ...props };

      Object.keys(props).forEach(key => {
        if (key.startsWith('on') && typeof (props as any)[key] === 'function') {
          const originalHandler = (props as any)[key];
          wrapped[key] = (...args: any[]) => {
            trackInteraction(key);
            return originalHandler(...args);
          };
        }
      });

      return wrapped;
    }, [props, trackInteraction]);

    return <Component {...wrappedProps} ref={ref} />;
  });
}

// Usage
const TrackedButton = withINPTracking(Button, 'Button');

// Hook for manual tracking
const useINPTracking = (componentName: string) => {
  const trackInteraction = useCallback((
    eventName: string,
    handler: () => void | Promise<void>
  ) => {
    const startMark = `${componentName}-${eventName}-start`;
    const endMark = `${componentName}-${eventName}-end`;

    performance.mark(startMark);

    const result = handler();

    if (result instanceof Promise) {
      result.finally(() => {
        performance.mark(endMark);
        performance.measure(eventName, startMark, endMark);

        const measure = performance.getEntriesByName(eventName)[0];
        if (measure && measure.duration > 50) {
          reportComponentINP({
            component: componentName,
            event: eventName,
            duration: measure.duration
          });
        }
      });
    } else {
      performance.mark(endMark);
      performance.measure(eventName, startMark, endMark);

      const measure = performance.getEntriesByName(eventName)[0];
      if (measure && measure.duration > 50) {
        reportComponentINP({
          component: componentName,
          event: eventName,
          duration: measure.duration
        });
      }
    }

    return result;
  }, [componentName]);

  return { trackInteraction };
};
```

### Route-Based INP Analysis

```typescript
const useRouteINPTracking = () => {
  const location = useLocation();
  const [routeMetrics, setRouteMetrics] = useState<Map<string, RouteINPMetrics>>(new Map());

  useEffect(() => {
    const metrics = new RouteINPMetrics(location.pathname);
    metrics.start();

    return () => {
      metrics.stop();
      setRouteMetrics((prev) => new Map(prev).set(location.pathname, metrics));
    };
  }, [location]);

  return routeMetrics;
};

class RouteINPMetrics {
  private route: string;
  private interactions: InteractionMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor(route: string) {
    this.route = route;
  }

  start() {
    if (!PerformanceObserver.supportedEntryTypes.includes('event')) return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = entry as PerformanceEventTiming;

        this.interactions.push({
          type: event.name,
          duration: event.duration,
          timestamp: event.startTime,
          route: this.route,
        });
      }
    });

    this.observer.observe({ type: 'event', buffered: false });
  }

  stop() {
    this.observer?.disconnect();
    this.analyze();
  }

  private analyze() {
    if (this.interactions.length === 0) return;

    const p75 = this.calculatePercentile(75);
    const p95 = this.calculatePercentile(95);
    const p99 = this.calculatePercentile(99);

    const analysis = {
      route: this.route,
      interactionCount: this.interactions.length,
      p75INP: p75,
      p95INP: p95,
      p99INP: p99,
      slowInteractions: this.interactions.filter((i) => i.duration > 200),
      timestamp: Date.now(),
    };

    // Send to analytics
    this.report(analysis);
  }

  private calculatePercentile(percentile: number): number {
    const sorted = [...this.interactions].sort((a, b) => a.duration - b.duration);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index]?.duration || 0;
  }

  private report(analysis: any) {
    navigator.sendBeacon('/api/metrics/route-inp', JSON.stringify(analysis));
  }
}

interface InteractionMetric {
  type: string;
  duration: number;
  timestamp: number;
  route: string;
}
```

## Correlating INP with User Actions

### Action Attribution System

```typescript
class ActionAttributionSystem {
  private actionStack: UserAction[] = [];
  private actionMap = new Map<string, ActionMetrics>();

  trackAction(action: UserAction) {
    this.actionStack.push(action);

    // Link to performance entries
    this.correlateWithPerformance(action);

    // Clean old actions
    this.cleanOldActions();
  }

  private correlateWithPerformance(action: UserAction) {
    // Get recent performance entries
    const entries = performance.getEntriesByType('event') as PerformanceEventTiming[];

    const relevantEntries = entries.filter((entry) => {
      return Math.abs(entry.startTime - action.timestamp) < 100;
    });

    if (relevantEntries.length > 0) {
      const slowest = relevantEntries.reduce((prev, curr) =>
        curr.duration > prev.duration ? curr : prev,
      );

      this.updateActionMetrics(action, slowest);
    }
  }

  private updateActionMetrics(action: UserAction, timing: PerformanceEventTiming) {
    const key = `${action.type}:${action.target}`;

    if (!this.actionMap.has(key)) {
      this.actionMap.set(key, {
        action: action.type,
        target: action.target,
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        slowCount: 0,
      });
    }

    const metrics = this.actionMap.get(key)!;
    metrics.count++;
    metrics.totalDuration += timing.duration;
    metrics.maxDuration = Math.max(metrics.maxDuration, timing.duration);
    metrics.minDuration = Math.min(metrics.minDuration, timing.duration);

    if (timing.duration > 200) {
      metrics.slowCount++;
      this.reportSlowAction(action, timing);
    }
  }

  private reportSlowAction(action: UserAction, timing: PerformanceEventTiming) {
    const report = {
      action: action.type,
      target: action.target,
      component: action.component,
      duration: timing.duration,
      inputDelay: timing.processingStart - timing.startTime,
      processingTime: timing.processingEnd - timing.processingStart,
      context: action.context,
      timestamp: action.timestamp,
    };

    // Send immediately for slow interactions
    fetch('/api/metrics/slow-action', {
      method: 'POST',
      body: JSON.stringify(report),
      keepalive: true,
    });
  }

  getActionMetrics(): ActionMetrics[] {
    return Array.from(this.actionMap.values());
  }

  private cleanOldActions() {
    const cutoff = Date.now() - 60000; // Keep last minute
    this.actionStack = this.actionStack.filter((a) => a.timestamp > cutoff);
  }
}

interface UserAction {
  type: string;
  target: string;
  component?: string;
  timestamp: number;
  context?: Record<string, any>;
}

interface ActionMetrics {
  action: string;
  target: string;
  count: number;
  totalDuration: number;
  maxDuration: number;
  minDuration: number;
  slowCount: number;
}

// React integration
const ActionContext = React.createContext<ActionAttributionSystem | null>(null);

const useActionTracking = () => {
  const system = useContext(ActionContext);

  const trackAction = useCallback(
    (type: string, target: string, context?: Record<string, any>) => {
      system?.trackAction({
        type,
        target,
        component: getComponentName(),
        timestamp: Date.now(),
        context,
      });
    },
    [system],
  );

  return { trackAction };
};
```

## Real User Monitoring Dashboard

### INP Metrics Aggregation

```typescript
class INPAggregator {
  private buckets = new Map<string, MetricBucket>();
  private flushInterval = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startAggregation();
  }

  addMetric(metric: INPMetric) {
    const bucketKey = this.getBucketKey(metric);

    if (!this.buckets.has(bucketKey)) {
      this.buckets.set(bucketKey, {
        key: bucketKey,
        metrics: [],
        stats: this.initializeStats(),
      });
    }

    const bucket = this.buckets.get(bucketKey)!;
    bucket.metrics.push(metric);
    this.updateStats(bucket.stats, metric);
  }

  private getBucketKey(metric: INPMetric): string {
    const url = new URL(metric.url || window.location.href);
    return `${url.pathname}:${metric.name}`;
  }

  private initializeStats(): BucketStats {
    return {
      count: 0,
      sum: 0,
      min: Infinity,
      max: 0,
      p50: 0,
      p75: 0,
      p95: 0,
      p99: 0,
    };
  }

  private updateStats(stats: BucketStats, metric: INPMetric) {
    stats.count++;
    stats.sum += metric.value;
    stats.min = Math.min(stats.min, metric.value);
    stats.max = Math.max(stats.max, metric.value);
  }

  private calculatePercentiles(bucket: MetricBucket) {
    const values = bucket.metrics.map((m) => m.value).sort((a, b) => a - b);
    const len = values.length;

    bucket.stats.p50 = values[Math.floor(len * 0.5)] || 0;
    bucket.stats.p75 = values[Math.floor(len * 0.75)] || 0;
    bucket.stats.p95 = values[Math.floor(len * 0.95)] || 0;
    bucket.stats.p99 = values[Math.floor(len * 0.99)] || 0;
  }

  private startAggregation() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async flush() {
    if (this.buckets.size === 0) return;

    // Calculate percentiles for each bucket
    for (const bucket of this.buckets.values()) {
      this.calculatePercentiles(bucket);
    }

    // Prepare batch report
    const report = {
      timestamp: Date.now(),
      buckets: Array.from(this.buckets.values()).map((b) => ({
        key: b.key,
        stats: b.stats,
        sampleCount: b.metrics.length,
      })),
    };

    // Send to backend
    await this.sendReport(report);

    // Clear buckets
    this.buckets.clear();
  }

  private async sendReport(report: any) {
    try {
      await fetch('/api/metrics/inp-aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send INP report:', error);
      // Store locally for retry
      this.storeLocally(report);
    }
  }

  private storeLocally(report: any) {
    const stored = localStorage.getItem('inp-reports') || '[]';
    const reports = JSON.parse(stored);
    reports.push(report);

    // Keep only last 10 reports
    if (reports.length > 10) {
      reports.shift();
    }

    localStorage.setItem('inp-reports', JSON.stringify(reports));
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.flush(); // Final flush
    }
  }
}

interface MetricBucket {
  key: string;
  metrics: INPMetric[];
  stats: BucketStats;
}

interface BucketStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
}
```

## Alerting and Anomaly Detection

```typescript
class INPAnomalyDetector {
  private baseline: Map<string, BaselineMetrics> = new Map();
  private alertThresholds = {
    absolute: 500, // Alert if INP > 500ms
    relative: 2.0, // Alert if INP > 2x baseline
    volumeThreshold: 10, // Minimum events before alerting
  };

  updateBaseline(key: string, value: number) {
    if (!this.baseline.has(key)) {
      this.baseline.set(key, {
        values: [],
        mean: 0,
        stdDev: 0,
      });
    }

    const baseline = this.baseline.get(key)!;
    baseline.values.push(value);

    // Keep rolling window of 1000 values
    if (baseline.values.length > 1000) {
      baseline.values.shift();
    }

    // Recalculate statistics
    this.calculateStatistics(baseline);
  }

  private calculateStatistics(baseline: BaselineMetrics) {
    const values = baseline.values;
    const sum = values.reduce((a, b) => a + b, 0);
    baseline.mean = sum / values.length;

    const squaredDiffs = values.map((v) => Math.pow(v - baseline.mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    baseline.stdDev = Math.sqrt(avgSquaredDiff);
  }

  detectAnomaly(key: string, value: number): AnomalyResult {
    const baseline = this.baseline.get(key);

    // Check absolute threshold
    if (value > this.alertThresholds.absolute) {
      return {
        isAnomaly: true,
        severity: 'critical',
        reason: `INP exceeds absolute threshold (${value}ms > ${this.alertThresholds.absolute}ms)`,
        value,
        threshold: this.alertThresholds.absolute,
      };
    }

    // Check relative to baseline
    if (baseline && baseline.values.length >= this.alertThresholds.volumeThreshold) {
      const zScore = (value - baseline.mean) / baseline.stdDev;

      if (zScore > 3) {
        return {
          isAnomaly: true,
          severity: 'high',
          reason: `INP is ${zScore.toFixed(1)} standard deviations above normal`,
          value,
          baseline: baseline.mean,
        };
      }

      if (value > baseline.mean * this.alertThresholds.relative) {
        return {
          isAnomaly: true,
          severity: 'medium',
          reason: `INP is ${(value / baseline.mean).toFixed(1)}x above baseline`,
          value,
          baseline: baseline.mean,
        };
      }
    }

    return { isAnomaly: false, value };
  }

  async sendAlert(anomaly: AnomalyResult, context: any) {
    const alert = {
      type: 'INP_ANOMALY',
      severity: anomaly.severity,
      message: anomaly.reason,
      value: anomaly.value,
      context,
      timestamp: Date.now(),
    };

    // Send to alerting service
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('INP Anomaly Detected:', alert);
    }
  }
}

interface BaselineMetrics {
  values: number[];
  mean: number;
  stdDev: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  value: number;
  baseline?: number;
  threshold?: number;
}
```

## Best Practices Checklist

✅ **Collect comprehensive data:**

- Track all interactions, not just samples
- Include device and network context
- Capture interaction attribution

✅ **Monitor by segment:**

- Track INP by route/page
- Segment by device type
- Monitor by connection speed

✅ **Set up alerting:**

- Define absolute thresholds
- Detect anomalies from baseline
- Alert on degradation trends

✅ **Correlate with user actions:**

- Link INP to specific components
- Track user flows
- Identify problematic patterns

✅ **Report actionable insights:**

- Show worst performing interactions
- Highlight regression risks
- Provide fix recommendations

## Related Topics

- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Comprehensive guide to measuring INP and other Core Web Vitals
- **[Production Performance Monitoring](./production-performance-monitoring.md)** - Broader production monitoring strategies beyond INP
- **[INP Optimization Long Tasks](./inp-optimization-long-tasks.md)** - Fix the INP issues you discover through monitoring
- **[Debugging Performance Issues](./debugging-performance-issues.md)** - Debug INP problems identified in production
- **[Performance Budgets and Automation](./performance-budgets-and-automation.md)** - Set up automated INP alerting

## Conclusion

Production INP monitoring isn't about collecting data—it's about understanding real user pain. Every slow interaction you catch is a frustrated user you can help. Every pattern you identify is an opportunity to improve.

The monitoring system we've built doesn't just measure INP; it tells you exactly what's slow, where it's slow, and why it's slow. It correlates interactions with components, tracks degradation over time, and alerts you before users notice problems.

Remember: synthetic tests lie, but production metrics tell the truth. Build your monitoring system to capture that truth, and use it to deliver the responsive, instant interactions your users deserve. Because in the end, performance monitoring is really user experience monitoring. And that's what matters most.
