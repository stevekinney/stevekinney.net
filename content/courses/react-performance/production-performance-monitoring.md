---
title: Production Performance Monitoring
description: >-
  Monitor real user performance, set up RUM, track Core Web Vitals, and catch
  regressions before users complain.
date: 2025-09-07T01:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - monitoring
  - rum
---

Your React app passes all performance tests in development, achieves perfect Lighthouse scores in CI, and feels blazing fast on your MacBook Pro. Then you deploy to production and discover the harsh reality: your users are on slow devices, unreliable networks, and older browsers. That 2-second page load becomes 8 seconds on a Moto G4 over 3G in India. Without production performance monitoring, you're flying blind.

Real User Monitoring (RUM) bridges the gap between synthetic testing and actual user experience. It captures performance data from real users with real devices, real networks, and real usage patterns. This data reveals performance issues that synthetic tests miss: the shopping cart that's slow only when it has 50+ items, the search that degrades with concurrent users, or the iOS bug that only affects Safari 14.1.

## Understanding Real User Monitoring (RUM)

RUM collects performance metrics from actual user sessions, providing insights into how your React app performs in the wild:

```tsx
// Real User Monitoring architecture
interface RUMData {
  // Core Web Vitals - Google's user experience metrics
  vitals: {
    LCP: number; // Largest Contentful Paint
    FID: number; // First Input Delay
    CLS: number; // Cumulative Layout Shift
    FCP: number; // First Contentful Paint
    TTFB: number; // Time to First Byte
  };

  // React-specific metrics
  react: {
    renderTime: number; // Component render duration
    hydrationTime: number; // SSR hydration duration
    bundleSize: number; // JavaScript bundle size
    componentCount: number; // Number of components rendered
    reRenderCount: number; // Unnecessary re-renders
  };

  // User context
  context: {
    userId?: string;
    sessionId: string;
    userAgent: string;
    viewport: { width: number; height: number };
    connection: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  // Page context
  page: {
    url: string;
    referrer: string;
    loadType: 'navigation' | 'reload' | 'back-forward';
    route: string;
    timestamp: number;
  };
}
```

Unlike synthetic monitoring that runs in controlled environments, RUM captures the chaos of real-world usage: users on slow networks, old devices, with browser extensions, antivirus software, and dozens of other tabs open.

## Implementing Core Web Vitals Monitoring

### Web Vitals Library Integration

```tsx
// rum/web-vitals-collector.ts
import { getLCP, getFID, getCLS, getFCP, getTTFB } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  entries: PerformanceEntry[];
}

class WebVitalsCollector {
  private metrics: Map<string, WebVitalMetric> = new Map();
  private isEnabled = true;

  constructor(
    private config: {
      sampleRate?: number;
      endpoint?: string;
      debug?: boolean;
    } = {},
  ) {
    // Sample only a percentage of users to manage data volume
    this.isEnabled = Math.random() < (config.sampleRate || 0.1);

    if (this.isEnabled) {
      this.setupCollection();
    }
  }

  private setupCollection(): void {
    // Largest Contentful Paint
    getLCP((metric) => {
      this.collectMetric(metric);

      if (this.config.debug) {
        this.highlightLCPElement(metric);
      }
    });

    // First Input Delay
    getFID((metric) => {
      this.collectMetric(metric);
    });

    // Cumulative Layout Shift
    getCLS((metric) => {
      this.collectMetric(metric);

      if (this.config.debug) {
        this.logLayoutShifts(metric);
      }
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.collectMetric(metric);
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.collectMetric(metric);
    });

    // Send metrics when page is unloaded
    this.setupBeaconSending();
  }

  private collectMetric(metric: WebVitalMetric): void {
    this.metrics.set(metric.name, metric);

    if (this.config.debug) {
      console.log(`📊 ${metric.name}: ${metric.value}ms (${metric.rating})`);
    }

    // Send individual metric immediately for critical issues
    if (metric.rating === 'poor' && this.config.endpoint) {
      this.sendMetric(metric);
    }
  }

  private highlightLCPElement(metric: WebVitalMetric): void {
    // Highlight the LCP element in development
    const lcpEntry = metric.entries[metric.entries.length - 1] as any;
    if (lcpEntry?.element) {
      lcpEntry.element.style.outline = '3px solid red';
      console.log('🎯 LCP Element:', lcpEntry.element);
    }
  }

  private logLayoutShifts(metric: WebVitalMetric): void {
    // Log layout shift sources
    metric.entries.forEach((entry: any) => {
      if (entry.sources) {
        entry.sources.forEach((source: any) => {
          console.log('📏 Layout shift source:', source.node);
        });
      }
    });
  }

  private setupBeaconSending(): void {
    // Send data when user leaves the page
    const sendBeacon = () => {
      this.sendAllMetrics();
    };

    // Multiple events to catch page unload
    addEventListener('beforeunload', sendBeacon);
    addEventListener('pagehide', sendBeacon);
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendBeacon();
      }
    });
  }

  private async sendMetric(metric: WebVitalMetric): Promise<void> {
    if (!this.config.endpoint) return;

    const payload = {
      metric,
      context: this.getContext(),
      timestamp: Date.now(),
    };

    try {
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload));
      } else {
        // Fallback to fetch with keepalive
        fetch(this.config.endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {
          // Fail silently to avoid affecting user experience
        });
      }
    } catch (error) {
      // Fail silently
    }
  }

  private sendAllMetrics(): void {
    if (!this.config.endpoint || this.metrics.size === 0) return;

    const payload = {
      metrics: Object.fromEntries(this.metrics),
      context: this.getContext(),
      timestamp: Date.now(),
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload));
    }
  }

  private getContext(): any {
    return {
      url: location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timestamp: Date.now(),
    };
  }

  getMetrics(): Map<string, WebVitalMetric> {
    return new Map(this.metrics);
  }
}

// Initialize Web Vitals collection
const webVitalsCollector = new WebVitalsCollector({
  sampleRate: 0.1, // Monitor 10% of users
  endpoint: '/api/vitals',
  debug: process.env.NODE_ENV === 'development',
});
```

### React-Specific Performance Monitoring

```tsx
// rum/react-performance-monitor.ts
import { Profiler, ProfilerOnRenderCallback } from 'react';

interface ReactPerformanceData {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

class ReactPerformanceMonitor {
  private renderData: ReactPerformanceData[] = [];
  private slowRenders: ReactPerformanceData[] = [];
  private componentCounts = new Map<string, number>();

  constructor(
    private config: {
      slowRenderThreshold?: number;
      maxDataPoints?: number;
      reportingEndpoint?: string;
    } = {},
  ) {
    this.config.slowRenderThreshold = config.slowRenderThreshold || 16; // 60fps
    this.config.maxDataPoints = config.maxDataPoints || 1000;
  }

  createProfilerCallback(componentName: string): ProfilerOnRenderCallback {
    return (id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) => {
      const renderData: ReactPerformanceData = {
        componentName,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions,
      };

      // Track render data
      this.renderData.push(renderData);

      // Track component render counts
      const currentCount = this.componentCounts.get(componentName) || 0;
      this.componentCounts.set(componentName, currentCount + 1);

      // Flag slow renders
      if (actualDuration > this.config.slowRenderThreshold!) {
        this.slowRenders.push(renderData);

        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `🐌 Slow render detected in ${componentName}: ${actualDuration.toFixed(2)}ms`,
          );
        }
      }

      // Limit data to prevent memory leaks
      if (this.renderData.length > this.config.maxDataPoints!) {
        this.renderData = this.renderData.slice(-this.config.maxDataPoints! / 2);
      }

      if (this.slowRenders.length > 100) {
        this.slowRenders = this.slowRenders.slice(-50);
      }
    };
  }

  generateReport(): {
    totalRenders: number;
    slowRenders: number;
    averageRenderTime: number;
    slowestComponents: Array<{ component: string; avgTime: number; count: number }>;
    recommendations: string[];
  } {
    const totalRenders = this.renderData.length;
    const slowRenderCount = this.slowRenders.length;

    const avgRenderTime =
      totalRenders > 0
        ? this.renderData.reduce((sum, data) => sum + data.actualDuration, 0) / totalRenders
        : 0;

    // Analyze slowest components
    const componentStats = new Map<string, { totalTime: number; count: number }>();

    this.renderData.forEach((data) => {
      const existing = componentStats.get(data.componentName) || { totalTime: 0, count: 0 };
      componentStats.set(data.componentName, {
        totalTime: existing.totalTime + data.actualDuration,
        count: existing.count + 1,
      });
    });

    const slowestComponents = Array.from(componentStats.entries())
      .map(([component, stats]) => ({
        component,
        avgTime: stats.totalTime / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];

    if (slowRenderCount / totalRenders > 0.1) {
      recommendations.push(
        'High percentage of slow renders detected - review component optimization',
      );
    }

    if (slowestComponents.length > 0 && slowestComponents[0].avgTime > 50) {
      recommendations.push(
        `Consider optimizing ${slowestComponents[0].component} - average render time: ${slowestComponents[0].avgTime.toFixed(2)}ms`,
      );
    }

    const frequentReRenders = Array.from(this.componentCounts.entries())
      .filter(([, count]) => count > 100)
      .map(([component]) => component);

    if (frequentReRenders.length > 0) {
      recommendations.push(
        `These components re-render frequently: ${frequentReRenders.join(', ')}`,
      );
    }

    return {
      totalRenders,
      slowRenders: slowRenderCount,
      averageRenderTime: avgRenderTime,
      slowestComponents,
      recommendations,
    };
  }

  async sendReport(): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    const report = this.generateReport();
    const payload = {
      ...report,
      context: {
        url: location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.config.reportingEndpoint, JSON.stringify(payload));
      } else {
        fetch(this.config.reportingEndpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {}); // Fail silently
      }
    } catch (error) {
      // Fail silently
    }
  }
}

// Global monitor instance
const reactPerformanceMonitor = new ReactPerformanceMonitor({
  slowRenderThreshold: 16,
  reportingEndpoint: '/api/react-performance',
});

// HOC for automatic profiling
function withPerformanceMonitoring<T extends {}>(
  Component: React.ComponentType<T>,
  componentName?: string,
): React.ComponentType<T> {
  const name = componentName || Component.displayName || Component.name || 'UnknownComponent';

  return function MonitoredComponent(props: T) {
    return (
      <Profiler id={name} onRender={reactPerformanceMonitor.createProfilerCallback(name)}>
        <Component {...props} />
      </Profiler>
    );
  };
}

// Hook for component-level monitoring
function usePerformanceMonitoring(componentName: string) {
  return {
    onRender: reactPerformanceMonitor.createProfilerCallback(componentName),
    generateReport: () => reactPerformanceMonitor.generateReport(),
  };
}
```

## Error and Performance Correlation

```tsx
// rum/error-performance-correlator.ts
interface PerformanceError {
  error: Error;
  context: {
    url: string;
    userAgent: string;
    timestamp: number;
    performanceData: {
      renderTime?: number;
      memoryUsage?: number;
      networkSpeed?: string;
    };
  };
}

class ErrorPerformanceCorrelator {
  private errors: PerformanceError[] = [];
  private performanceThresholds = {
    slowRender: 100, // ms
    highMemory: 100 * 1024 * 1024, // 100MB
    slowNetwork: ['slow-2g', '2g'],
  };

  captureError(error: Error, performanceData?: any): void {
    const errorData: PerformanceError = {
      error,
      context: {
        url: location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        performanceData: {
          renderTime: performanceData?.renderTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize,
          networkSpeed: (navigator as any).connection?.effectiveType,
        },
      },
    };

    this.errors.push(errorData);

    // Analyze correlation
    this.analyzeCorrelation(errorData);

    // Send to error tracking service
    this.sendErrorReport(errorData);
  }

  private analyzeCorrelation(errorData: PerformanceError): void {
    const { performanceData } = errorData.context;
    const correlations: string[] = [];

    // Check for slow render correlation
    if (
      performanceData.renderTime &&
      performanceData.renderTime > this.performanceThresholds.slowRender
    ) {
      correlations.push(`slow-render-${performanceData.renderTime}ms`);
    }

    // Check for high memory correlation
    if (
      performanceData.memoryUsage &&
      performanceData.memoryUsage > this.performanceThresholds.highMemory
    ) {
      correlations.push(`high-memory-${Math.round(performanceData.memoryUsage / 1024 / 1024)}MB`);
    }

    // Check for slow network correlation
    if (
      performanceData.networkSpeed &&
      this.performanceThresholds.slowNetwork.includes(performanceData.networkSpeed)
    ) {
      correlations.push(`slow-network-${performanceData.networkSpeed}`);
    }

    if (correlations.length > 0) {
      console.warn(`🔗 Error correlated with performance issues: ${correlations.join(', ')}`);

      // Add correlation data to error
      (errorData as any).performanceCorrelations = correlations;
    }
  }

  private async sendErrorReport(errorData: PerformanceError): Promise<void> {
    // Send to error tracking service (Sentry, Bugsnag, etc.)
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
        keepalive: true,
      });
    } catch (error) {
      // Fail silently
    }
  }

  generateCorrelationReport(): {
    totalErrors: number;
    performanceCorrelatedErrors: number;
    topCorrelations: Array<{ correlation: string; count: number }>;
  } {
    const performanceCorrelatedErrors = this.errors.filter(
      (error) => (error as any).performanceCorrelations?.length > 0,
    );

    // Count correlation patterns
    const correlationCounts = new Map<string, number>();

    performanceCorrelatedErrors.forEach((error) => {
      const correlations = (error as any).performanceCorrelations || [];
      correlations.forEach((correlation: string) => {
        const count = correlationCounts.get(correlation) || 0;
        correlationCounts.set(correlation, count + 1);
      });
    });

    const topCorrelations = Array.from(correlationCounts.entries())
      .map(([correlation, count]) => ({ correlation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errors.length,
      performanceCorrelatedErrors: performanceCorrelatedErrors.length,
      topCorrelations,
    };
  }
}

// Global error correlation instance
const errorCorrelator = new ErrorPerformanceCorrelator();

// React Error Boundary with performance correlation
class PerformanceAwareErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture performance data at time of error
    const performanceData = {
      renderTime: performance.now(), // Time since navigation start
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      networkSpeed: (navigator as any).connection?.effectiveType,
    };

    // Send error with performance correlation
    errorCorrelator.captureError(error, performanceData);

    console.error('React Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to continue.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Performance Alerting System

```tsx
// rum/performance-alerting.ts
interface PerformanceAlert {
  type: 'web-vital' | 'react-performance' | 'error-spike' | 'memory-leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: number;
}

class PerformanceAlertingSystem {
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    renderTime: { good: 16, poor: 100 },
    memoryUsage: { good: 50 * 1024 * 1024, poor: 200 * 1024 * 1024 },
  };

  private alertHandlers: Array<(alert: PerformanceAlert) => void> = [];

  onAlert(handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  checkWebVital(name: string, value: number): void {
    const threshold = this.thresholds[name as keyof typeof this.thresholds];
    if (!threshold) return;

    let severity: PerformanceAlert['severity'] = 'low';

    if (name === 'cls') {
      // CLS uses different scale
      if (value > threshold.poor) severity = 'critical';
      else if (value > threshold.good) severity = 'medium';
    } else {
      if (value > threshold.poor) severity = 'critical';
      else if (value > threshold.good) severity = 'medium';
    }

    if (severity !== 'low') {
      this.createAlert({
        type: 'web-vital',
        severity,
        message: `${name.toUpperCase()} is ${severity}: ${value}${name === 'cls' ? '' : 'ms'}`,
        data: { metric: name, value, threshold },
        timestamp: Date.now(),
      });
    }
  }

  checkReactPerformance(componentName: string, renderTime: number): void {
    let severity: PerformanceAlert['severity'] = 'low';

    if (renderTime > this.thresholds.renderTime.poor) {
      severity = 'high';
    } else if (renderTime > this.thresholds.renderTime.good) {
      severity = 'medium';
    }

    if (severity !== 'low') {
      this.createAlert({
        type: 'react-performance',
        severity,
        message: `Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`,
        data: { component: componentName, renderTime },
        timestamp: Date.now(),
      });
    }
  }

  checkMemoryUsage(usage: number): void {
    let severity: PerformanceAlert['severity'] = 'low';

    if (usage > this.thresholds.memoryUsage.poor) {
      severity = 'critical';
    } else if (usage > this.thresholds.memoryUsage.good) {
      severity = 'medium';
    }

    if (severity !== 'low') {
      this.createAlert({
        type: 'memory-leak',
        severity,
        message: `High memory usage: ${(usage / 1024 / 1024).toFixed(2)}MB`,
        data: { memoryUsage: usage },
        timestamp: Date.now(),
      });
    }
  }

  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Limit stored alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }

    // Notify handlers
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    });

    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error('🚨 Critical Performance Alert:', alert.message);
    }
  }

  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    return severity ? this.alerts.filter((alert) => alert.severity === severity) : [...this.alerts];
  }

  generateAlertReport(): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    recentCriticalAlerts: PerformanceAlert[];
  } {
    const alertsBySeverity = this.alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentCriticalAlerts = this.alerts
      .filter((alert) => alert.severity === 'critical' && alert.timestamp > oneDayAgo)
      .slice(-10);

    return {
      totalAlerts: this.alerts.length,
      alertsBySeverity,
      recentCriticalAlerts,
    };
  }
}

// Global alerting system
const performanceAlerting = new PerformanceAlertingSystem();

// Setup alert handlers
performanceAlerting.onAlert((alert) => {
  // Send critical alerts to monitoring service immediately
  if (alert.severity === 'critical') {
    fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
      keepalive: true,
    }).catch(() => {}); // Fail silently
  }
});

// Setup visual alerts for development
if (process.env.NODE_ENV === 'development') {
  performanceAlerting.onAlert((alert) => {
    if (alert.severity === 'high' || alert.severity === 'critical') {
      // Show toast notification in development
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${alert.severity === 'critical' ? '#d32f2f' : '#f57c00'};
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
        max-width: 300px;
      `;
      toast.textContent = alert.message;

      document.body.appendChild(toast);

      setTimeout(() => {
        document.body.removeChild(toast);
      }, 5000);
    }
  });
}
```

## Analytics Integration

```tsx
// rum/analytics-integration.ts
interface AnalyticsEvent {
  category: 'Performance';
  action: string;
  label?: string;
  value?: number;
  customDimensions?: Record<string, string | number>;
}

class PerformanceAnalytics {
  private queue: AnalyticsEvent[] = [];
  private isOnline = navigator.onLine;

  constructor(
    private config: {
      googleAnalyticsId?: string;
      customEndpoint?: string;
      batchSize?: number;
    } = {},
  ) {
    // Monitor online status
    addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Flush queue periodically
    setInterval(() => this.flushQueue(), 30000); // Every 30 seconds
  }

  trackWebVital(name: string, value: number, rating: string): void {
    this.track({
      category: 'Performance',
      action: 'Web Vital',
      label: name,
      value: Math.round(value),
      customDimensions: {
        rating,
        url: location.pathname,
        device: this.getDeviceType(),
        connection: this.getConnectionType(),
      },
    });
  }

  trackReactRender(componentName: string, duration: number, phase: string): void {
    // Only track slow renders to reduce noise
    if (duration > 16) {
      this.track({
        category: 'Performance',
        action: 'Slow React Render',
        label: componentName,
        value: Math.round(duration),
        customDimensions: {
          phase,
          url: location.pathname,
        },
      });
    }
  }

  trackBundle(bundleName: string, size: number, loadTime: number): void {
    this.track({
      category: 'Performance',
      action: 'Bundle Load',
      label: bundleName,
      value: Math.round(loadTime),
      customDimensions: {
        size: Math.round(size / 1024), // KB
        url: location.pathname,
      },
    });
  }

  trackError(error: string, performanceContext: any): void {
    this.track({
      category: 'Performance',
      action: 'Performance Related Error',
      label: error,
      customDimensions: {
        memoryUsage: Math.round((performanceContext.memoryUsage || 0) / 1024 / 1024), // MB
        renderTime: performanceContext.renderTime,
        url: location.pathname,
      },
    });
  }

  private track(event: AnalyticsEvent): void {
    this.queue.push(event);

    // Send immediately if online and queue is not too large
    if (this.isOnline && this.queue.length >= (this.config.batchSize || 10)) {
      this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const events = this.queue.splice(0, this.config.batchSize || 10);

    // Send to Google Analytics
    if (this.config.googleAnalyticsId && typeof gtag !== 'undefined') {
      events.forEach((event) => {
        gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          custom_map: event.customDimensions,
        });
      });
    }

    // Send to custom endpoint
    if (this.config.customEndpoint) {
      try {
        const response = await fetch(this.config.customEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
          keepalive: true,
        });

        if (!response.ok) {
          // Re-queue events on failure
          this.queue.unshift(...events);
        }
      } catch (error) {
        // Re-queue events on failure
        this.queue.unshift(...events);
      }
    }
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string {
    return (navigator as any).connection?.effectiveType || 'unknown';
  }
}

// Global analytics instance
const performanceAnalytics = new PerformanceAnalytics({
  googleAnalyticsId: 'GA_MEASUREMENT_ID',
  customEndpoint: '/api/performance-analytics',
  batchSize: 5,
});
```

## Dashboard and Reporting

```tsx
// rum/performance-dashboard.ts
interface DashboardData {
  webVitals: {
    lcp: { p50: number; p75: number; p95: number };
    fid: { p50: number; p75: number; p95: number };
    cls: { p50: number; p75: number; p95: number };
  };
  reactMetrics: {
    averageRenderTime: number;
    slowRenders: number;
    topSlowComponents: Array<{ name: string; avgTime: number }>;
  };
  errors: {
    total: number;
    performanceRelated: number;
    topErrors: Array<{ message: string; count: number }>;
  };
  trends: {
    performanceScore: number[];
    memoryUsage: number[];
    bundleSize: number[];
  };
}

class PerformanceDashboard {
  async fetchDashboardData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<DashboardData> {
    try {
      const response = await fetch(`/api/performance-dashboard?range=${timeRange}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      return this.getEmptyDashboardData();
    }
  }

  generatePerformanceScore(data: DashboardData): number {
    // Calculate overall performance score (0-100)
    const webVitalsScore = this.calculateWebVitalsScore(data.webVitals);
    const reactScore = this.calculateReactScore(data.reactMetrics);
    const errorScore = this.calculateErrorScore(data.errors);

    return Math.round(webVitalsScore * 0.5 + reactScore * 0.3 + errorScore * 0.2);
  }

  private calculateWebVitalsScore(vitals: DashboardData['webVitals']): number {
    // Score based on Google's thresholds
    const lcpScore = vitals.lcp.p75 <= 2500 ? 100 : vitals.lcp.p75 <= 4000 ? 50 : 0;
    const fidScore = vitals.fid.p75 <= 100 ? 100 : vitals.fid.p75 <= 300 ? 50 : 0;
    const clsScore = vitals.cls.p75 <= 0.1 ? 100 : vitals.cls.p75 <= 0.25 ? 50 : 0;

    return (lcpScore + fidScore + clsScore) / 3;
  }

  private calculateReactScore(reactMetrics: DashboardData['reactMetrics']): number {
    // Score based on React performance
    const avgRenderScore =
      reactMetrics.averageRenderTime <= 16 ? 100 : reactMetrics.averageRenderTime <= 50 ? 70 : 40;

    const slowRenderScore =
      reactMetrics.slowRenders === 0 ? 100 : reactMetrics.slowRenders < 10 ? 80 : 50;

    return (avgRenderScore + slowRenderScore) / 2;
  }

  private calculateErrorScore(errors: DashboardData['errors']): number {
    if (errors.total === 0) return 100;

    const errorRate = errors.performanceRelated / errors.total;

    if (errorRate < 0.01) return 100; // < 1%
    if (errorRate < 0.05) return 80; // < 5%
    if (errorRate < 0.1) return 60; // < 10%
    return 40;
  }

  generateRecommendations(data: DashboardData): string[] {
    const recommendations: string[] = [];

    // Web Vitals recommendations
    if (data.webVitals.lcp.p75 > 2500) {
      recommendations.push(
        'Optimize Largest Contentful Paint - consider image optimization, preloading critical resources',
      );
    }

    if (data.webVitals.cls.p75 > 0.1) {
      recommendations.push(
        'Reduce Cumulative Layout Shift - ensure images have dimensions, avoid dynamic content insertion',
      );
    }

    if (data.webVitals.fid.p75 > 100) {
      recommendations.push(
        'Improve First Input Delay - reduce JavaScript execution time, use code splitting',
      );
    }

    // React recommendations
    if (data.reactMetrics.averageRenderTime > 16) {
      recommendations.push(
        'Optimize React render performance - review component memoization and state management',
      );
    }

    if (data.reactMetrics.slowRenders > 50) {
      recommendations.push(
        `High number of slow renders (${data.reactMetrics.slowRenders}) - investigate top slow components`,
      );
    }

    // Error recommendations
    if (data.errors.performanceRelated / data.errors.total > 0.05) {
      recommendations.push(
        'High rate of performance-related errors - review error-performance correlations',
      );
    }

    return recommendations;
  }

  private getEmptyDashboardData(): DashboardData {
    return {
      webVitals: {
        lcp: { p50: 0, p75: 0, p95: 0 },
        fid: { p50: 0, p75: 0, p95: 0 },
        cls: { p50: 0, p75: 0, p95: 0 },
      },
      reactMetrics: {
        averageRenderTime: 0,
        slowRenders: 0,
        topSlowComponents: [],
      },
      errors: {
        total: 0,
        performanceRelated: 0,
        topErrors: [],
      },
      trends: {
        performanceScore: [],
        memoryUsage: [],
        bundleSize: [],
      },
    };
  }
}

// React component for performance dashboard
function PerformanceDashboardComponent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const dashboard = useRef(new PerformanceDashboard());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const dashboardData = await dashboard.current.fetchDashboardData('24h');
      setData(dashboardData);
      setLoading(false);
    };

    loadData();

    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading performance data...</div>;
  if (!data) return <div>Failed to load performance data</div>;

  const performanceScore = dashboard.current.generatePerformanceScore(data);
  const recommendations = dashboard.current.generateRecommendations(data);

  return (
    <div className="performance-dashboard">
      <h2>Performance Dashboard</h2>

      <div className="performance-score">
        <h3>Overall Score: {performanceScore}/100</h3>
      </div>

      <div className="web-vitals">
        <h3>Core Web Vitals</h3>
        <div>LCP (p75): {data.webVitals.lcp.p75}ms</div>
        <div>FID (p75): {data.webVitals.fid.p75}ms</div>
        <div>CLS (p75): {data.webVitals.cls.p75}</div>
      </div>

      <div className="react-metrics">
        <h3>React Performance</h3>
        <div>Average Render Time: {data.reactMetrics.averageRenderTime.toFixed(2)}ms</div>
        <div>Slow Renders: {data.reactMetrics.slowRenders}</div>
      </div>

      <div className="recommendations">
        <h3>Recommendations</h3>
        <ul>
          {recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Related Topics

- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Deep dive into optimizing LCP, CLS, and INP
- **[Performance Budgets and Automation](./performance-budgets-and-automation.md)** - Setting thresholds and CI enforcement
- **[Debugging Performance Issues](./debugging-performance-issues.md)** - Systematic troubleshooting approach
- **[Measuring Performance with Real Tools](./measuring-performance-with-real-tools.md)** - Local profiling and measurement

## Prerequisites

- Understanding of Core Web Vitals metrics
- Basic knowledge of React performance concepts
- Familiarity with browser performance APIs

## Next Steps

Production performance monitoring is essential for maintaining React app performance at scale:

1. **Start with Core Web Vitals** - These directly impact user experience and SEO
2. **Implement React-specific monitoring** - Track component render performance
3. **Correlate errors with performance** - Identify performance-related failures
4. **Set up alerting** - Get notified before users complain
5. **Create dashboards** - Visualize trends and make data-driven decisions

The key is balancing comprehensive monitoring with performance impact—monitoring shouldn't slow down your app. Use sampling, batch data collection, and fail-silent error handling to ensure your monitoring enhances rather than degrades user experience.

Remember: you can't improve what you don't measure. Production monitoring transforms performance from guesswork into data-driven optimization.

## Practical Examples

Common monitoring implementation patterns:

- **Startup monitoring** - Track initial app load performance across user segments
- **Feature-specific monitoring** - Monitor critical user journeys (checkout, search, etc.)
- **A/B testing integration** - Compare performance across feature variants
- **Progressive enhancement tracking** - Monitor how features degrade on low-end devices
