---
title: Resource Preloading APIs
description: >-
  Prime the cache for what users will do next—preload, prefetch, and preinit
  without double‑loading or hurting metrics.
date: 2025-09-06T22:20:28.822Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - preloading
  - react-19
---

Waiting for resources to load is one of those things that makes web apps feel sluggish, even when they're actually pretty fast. Users click a button, stare at a spinner, and wonder if they should refresh the page (spoiler: they probably will). Enter React 19's resource preloading APIs—a set of functions that let you prime the browser's cache with the resources users are _about_ to need, before they actually need them.

Think of it like having your coffee ready before you're fully awake, or queuing up the next episode while you're still watching the current one. By the time you actually need these resources, they're already there, making your app feel snappier and more responsive.

## The Resource Preloading Family

React 19 gives you three main functions for preloading resources: `preload`, `prefetchDNS`, and `preinit`. Each serves a different purpose, and knowing when to use which one can make the difference between a smooth user experience and one that feels clunky.

### The Quick Rundown

- **`preload`**: Downloads a resource and caches it, but doesn't execute it
- **`prefetchDNS`**: Resolves DNS lookups ahead of time for external domains
- **`preinit`**: Downloads, caches, and initializes resources (like stylesheets and scripts)

All of these functions are designed to be safe—they won't double-download resources if they're called multiple times, and they won't block your main thread or hurt your Core Web Vitals.

## Understanding `preload`

The `preload` function is your go-to for downloading resources that users will likely need soon, but that shouldn't be executed immediately. This is perfect for things like images on the next page, fonts that might be needed, or API data that could be requested.

```tsx
import { preload } from 'react-dom';

function ProductList() {
  const handleProductHover = (productId: string) => {
    // When user hovers over a product, preload its detailed image
    preload(`/api/products/${productId}/image-hd.jpg`, {
      as: 'image',
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onMouseEnter={() => handleProductHover(product.id)}
          className="cursor-pointer"
        >
          <img src={product.thumbnail} alt={product.name} />
          <h3>{product.name}</h3>
        </div>
      ))}
    </div>
  );
}
```

The `as` parameter tells the browser what type of resource this is, which helps with caching and prioritization. Common values include:

- `'image'` - For images
- `'font'` - For web fonts (add `crossOrigin: 'anonymous'` for cross-origin fonts)
- `'script'` - For JavaScript files
- `'style'` - For CSS files
- `'fetch'` - For API calls or other fetch requests

### Preloading API Data

You can also preload API responses, which is particularly useful when you know users are likely to navigate somewhere that requires specific data:

```tsx
import { preload } from 'react-dom';

function NavigationMenu() {
  const handleDashboardHover = () => {
    // Preload the user's dashboard data when they hover over the nav link
    preload('/api/dashboard/summary', {
      as: 'fetch',
      crossOrigin: 'anonymous',
    });
  };

  return (
    <nav>
      <Link to="/dashboard" onMouseEnter={handleDashboardHover}>
        Dashboard
      </Link>
    </nav>
  );
}
```

> [!TIP]
> Preloading on hover gives you a nice balance—users who are just scanning won't trigger unnecessary requests, but users who are actually interested get a head start.

## DNS Prefetching with `prefetchDNS`

Before your browser can download any resource from an external domain, it needs to resolve that domain to an IP address. This DNS lookup can add hundreds of milliseconds to your request time, especially for users on slower networks or those geographically far from DNS servers.

`prefetchDNS` tells the browser to resolve these lookups ahead of time:

```tsx
import { prefetchDNS } from 'react-dom';

function App() {
  useEffect(() => {
    // Prefetch DNS for external services we'll likely use
    prefetchDNS('https://api.stripe.com');
    prefetchDNS('https://fonts.googleapis.com');
    prefetchDNS('https://cdn.jsdelivr.net');
  }, []);

  return <Router>...</Router>;
}
```

This is particularly valuable when:

- You're loading resources from CDNs
- You're making API calls to external services
- You're loading fonts from Google Fonts or similar services
- You have analytics or tracking scripts from third-party domains

The beauty of `prefetchDNS` is that it's essentially free—it doesn't download any actual content, just resolves the domain name. Even if the user never ends up needing those resources, the cost was minimal.

## Preinitializing Resources with `preinit`

While `preload` downloads resources without executing them, `preinit` goes further by downloading _and_ initializing them. This means the resource becomes available for immediate use.

### Preinitializing Stylesheets

This is particularly useful for stylesheets that you know you'll need:

```tsx
import { preinit } from 'react-dom';

function SettingsPage() {
  useEffect(() => {
    // Preinit the theme switcher styles since users often toggle themes
    preinit('/styles/themes/dark-mode.css', { as: 'style' });
    preinit('/styles/themes/light-mode.css', { as: 'style' });
  }, []);

  return (
    <div className="settings-page">
      <ThemeSelector />
      {/* rest of your settings */}
    </div>
  );
}
```

### Preinitializing Scripts

You can also preinit JavaScript files that contain code you'll need soon:

```tsx
import { preinit } from 'react-dom';

function PaymentForm() {
  useEffect(() => {
    // Preinit payment processing scripts when the form loads
    preinit('https://js.stripe.com/v3/', { as: 'script' });
  }, []);

  const [showPayment, setShowPayment] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPayment(true)}>Proceed to Payment</button>
      {showPayment && <StripePaymentForm />}
    </div>
  );
}
```

> [!WARNING]
> Be cautious with `preinit` for scripts—they'll execute immediately when downloaded. Only preinit scripts you're confident you'll need and that are safe to run early.

## Real World Use Cases™

Let's look at some practical scenarios where resource preloading can make a meaningful difference in user experience.

### E-commerce Product Pages

```tsx
import { preload, prefetchDNS } from 'react-dom';

function ProductCard({ product }: { product: Product }) {
  const handleMouseEnter = () => {
    // Preload high-res images for the product detail page
    preload(`/images/products/${product.id}/hero.jpg`, { as: 'image' });
    preload(`/images/products/${product.id}/gallery.jpg`, { as: 'image' });

    // Preload the product details API call
    preload(`/api/products/${product.id}`, { as: 'fetch' });
  };

  return (
    <Link to={`/products/${product.id}`} onMouseEnter={handleMouseEnter}>
      <img src={product.thumbnail} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </Link>
  );
}
```

### Multi-step Forms

```tsx
import { preload, preinit } from 'react-dom';

function OnboardingFlow() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Always prefetch DNS for services we'll use
    prefetchDNS('https://api.stripe.com');
    prefetchDNS('https://maps.googleapis.com');

    // Preload resources for likely next steps
    if (step === 1) {
      preload('/api/validate-business', { as: 'fetch' });
    } else if (step === 2) {
      preinit('https://js.stripe.com/v3/', { as: 'script' });
      preload('/api/payment-methods', { as: 'fetch' });
    }
  }, [step]);

  return (
    <div>
      {step === 1 && <BusinessInfoStep onNext={() => setStep(2)} />}
      {step === 2 && <PaymentStep onNext={() => setStep(3)} />}
      {step === 3 && <ConfirmationStep />}
    </div>
  );
}
```

### Dashboard Applications

```tsx
import { preload, prefetchDNS } from 'react-dom';

function Dashboard() {
  useEffect(() => {
    // Preload common dashboard resources
    prefetchDNS('https://api.analytics.com');

    // Preload data for tabs users commonly switch between
    preload('/api/dashboard/analytics', { as: 'fetch' });
    preload('/api/dashboard/reports', { as: 'fetch' });

    // Preload chart rendering library (but don't preinit it)
    preload('/scripts/chart-library.js', { as: 'script' });
  }, []);

  return (
    <div className="dashboard">
      <TabNav />
      <MainContent />
    </div>
  );
}
```

## Performance Considerations

While resource preloading can dramatically improve perceived performance, it's important to use it thoughtfully. Here are the key things to keep in mind:

### Don't Preload Everything

The temptation is to preload all the things, but this can backfire:

```tsx
// ❌ This will hurt more than it helps
useEffect(() => {
  // Don't do this - you're wasting bandwidth and potentially blocking more important resources
  preload('/images/gallery/image1.jpg', { as: 'image' });
  preload('/images/gallery/image2.jpg', { as: 'image' });
  preload('/images/gallery/image3.jpg', { as: 'image' });
  // ... 50 more images
}, []);

// ✅ Better - preload strategically
const handleGalleryEnter = () => {
  // Only preload the first few images when user shows intent
  preload('/images/gallery/image1.jpg', { as: 'image' });
  preload('/images/gallery/image2.jpg', { as: 'image' });
};
```

### Mobile Considerations

Be especially careful on mobile networks where bandwidth is limited and data costs money:

```tsx
import { preload } from 'react-dom';

function usePreloadStrategy() {
  const [connection] = useState(
    () =>
      // @ts-ignore - not all browsers support this yet
      navigator.connection || navigator.mozConnection || navigator.webkitConnection,
  );

  const shouldPreload = useMemo(() => {
    // Don't preload on slow connections or when user has data saver enabled
    if (connection?.saveData) return false;
    if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return false;
    }
    return true;
  }, [connection]);

  return { shouldPreload };
}

function ProductGrid() {
  const { shouldPreload } = usePreloadStrategy();

  const handleProductHover = (productId: string) => {
    if (shouldPreload) {
      preload(`/api/products/${productId}`, { as: 'fetch' });
    }
  };

  // ... rest of component
}
```

### Avoiding Double-Loading

One of the great things about React's preloading functions is that they're smart about not double-loading resources:

```tsx
function ComponentA() {
  useEffect(() => {
    preload('/api/user-data', { as: 'fetch' });
  }, []);

  return <div>Component A</div>;
}

function ComponentB() {
  useEffect(() => {
    // This won't trigger another download - React knows this resource is already preloaded
    preload('/api/user-data', { as: 'fetch' });
  }, []);

  return <div>Component B</div>;
}
```

## Common Pitfalls and How to Avoid Them

### Preloading Resources Too Early

```tsx
// ❌ This preloads immediately when the app starts, potentially wasting bandwidth
function App() {
  useEffect(() => {
    preload('/api/premium-features', { as: 'fetch' }); // Most users might never need this
  }, []);

  return <Router />;
}

// ✅ Better - preload when there's user intent
function PricingPage() {
  const handleUpgradeHover = () => {
    preload('/api/premium-features', { as: 'fetch' }); // Now we know they're interested
  };

  return <button onMouseEnter={handleUpgradeHover}>Upgrade to Premium</button>;
}
```

### Forgetting CORS for Cross-Origin Resources

```tsx
// ❌ This might fail for cross-origin requests
preload('https://api.external.com/data', { as: 'fetch' });

// ✅ Include CORS headers when needed
preload('https://api.external.com/data', {
  as: 'fetch',
  crossOrigin: 'anonymous',
});
```

### Not Considering Cache Headers

Make sure your server is setting appropriate cache headers for preloaded resources. If your API responses have `Cache-Control: no-cache`, preloading them won't help much since they can't be cached.

```tsx
// Your API endpoint should include proper cache headers
app.get('/api/products/:id', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  res.json(productData);
});
```

## Best Practices Checklist

Here's a quick checklist for using resource preloading effectively:

- ✅ Preload resources based on user intent (hover, focus, scroll proximity)
- ✅ Use `prefetchDNS` for external domains you'll likely need
- ✅ Consider network conditions and data saver preferences
- ✅ Preload high-impact resources first (critical images, initial API calls)
- ✅ Test on slow networks to ensure you're actually improving performance
- ✅ Monitor your loading metrics to verify preloading is helping
- ❌ Don't preload resources "just in case"—be strategic
- ❌ Don't forget CORS headers for cross-origin resources
- ❌ Don't preload large resources unless you're confident they'll be needed
