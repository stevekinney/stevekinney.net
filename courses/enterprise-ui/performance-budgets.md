---
title: Performance Budgets
description: >-
  Performance budgets turn "we care about speed" from a personality trait into a
  release policy—here is what to budget, how to set thresholds, and how to
  enforce them at build time, in CI, and in production.
modified: 2026-03-17
date: 2026-03-01
---

Performance budgets are the point where "we care about speed" stops being a personality trait and becomes an engineering constraint. In the plainest terms, a **performance budget** is a set of limits on metrics that affect user-perceived performance, such as page weight, request counts, load timing, or specific user-centric metrics. [web.dev][1] frames budgets as a reference point for decisions about design, technology, and new features, while [MDN][2] frames them as limits meant to prevent regressions.

That second part matters more than people admit. A performance budget is not primarily an optimization technique. It is a release policy. Its job is to stop the product from quietly getting slower while everyone is busy shipping "just one more script" or "just one more hero image." [MDN][2] also recommends thinking in two levels, a warning threshold and an error threshold, so you can see trouble early without turning every tiny regression into a blocked deploy.

## What a Budget Should Cover

| Budget layer  | What it measures              | When it runs        | Key metrics                                         | Enforcement tooling                    |
| ------------- | ----------------------------- | ------------------- | --------------------------------------------------- | -------------------------------------- |
| Field budgets | Real user experience          | Production (RUM)    | LCP, INP, CLS, TTFB (p75)                           | `web-vitals`, CrUX, RUM platform       |
| Lab budgets   | Controlled test environment   | CI / pre-production | FCP, LCP, TBT, request counts                       | Lighthouse CI, `budget.json`           |
| Asset budgets | File sizes and request counts | Build time          | JS bytes, CSS bytes, image bytes, third-party count | webpack `performance`, bundler plugins |

A serious budget usually has three layers. First, you need field budgets for the experience real users actually have. Second, you need lab budgets for pre-production testing and CI. Third, you need asset and request budgets so regressions can be caught closer to the code that caused them. [web.dev][1] explicitly recommends combining quantity-based metrics with user-centric metrics rather than relying on only one class of signal.

For field budgets, the modern center of gravity is Core Web Vitals: LCP for loading, INP for responsiveness, and CLS for visual stability. Google's current [Web Vitals guidance][3] is to treat a page as "good" only when the 75th percentile of page visits meets all three thresholds, segmented across mobile and desktop devices: LCP at or under 2.5 seconds, INP at or under 200 milliseconds, and CLS at or under 0.1. That 75th-percentile rule is important because averages hide pain, and your users are not comforted by the news that the median experience was lovely while the slow end was on fire.

I would usually add TTFB as a supporting field budget even though it is not a Core Web Vital. [web.dev][4] describes 0.8 seconds or less as a rough good guide for TTFB, and notes that slow TTFB makes it much harder to hit good thresholds for metrics like LCP and FCP. In other words, if the server starts late, the rest of your budget is already being mugged in the parking lot.

For lab budgets, use metrics that are reliable in controlled environments and useful in CI. The key nuance is that lab and field are not interchangeable. [web.dev][5] explicitly says lab data is essential for developer workflows and CI, but also warns that it can differ from field data for concrete reasons: LCP in the lab can diverge because of TTFB, redirects, latency, personalization, and caching differences; CLS can look artificially low because many lab runs do not interact with the page; and INP cannot be measured in lab environments because it requires real user interactions. web.dev therefore recommends Total Blocking Time as the lab proxy for INP.

That means a modern lab budget should emphasize FCP, LCP, TBT, request counts, and transfer sizes, not old Lighthouse-era mythology. [web.dev's FCP documentation][6] puts the current guidance at 1.8 seconds or less, and for TBT it is under 200 milliseconds on average mobile hardware. TBT is not a Core Web Vital, but web.dev explicitly calls it valuable for diagnosing and catching interactivity problems that can affect INP.

For asset and request budgets, the useful categories are things like total transferred bytes, script bytes, image bytes, stylesheet bytes, request counts, and third-party counts. [web.dev's performance-budget guide][1] calls out exactly these sorts of quantity-based metrics, including image size, script size, font count, and total external resources such as third-party scripts. Lighthouse's `budget.json` format also supports resource budgets for `document`, `font`, `image`, `media`, `other`, `script`, `stylesheet`, `third-party`, and `total`.

## How to Set Sane Numbers

The first mistake is picking thresholds out of the air because they look impressive in a slide deck. [MDN's guidance][2] is better: start with the devices and connection speeds your users actually have, and define budgets as reachable goals tied to user experience and business or product goals. It even suggests thinking in terms of low-end Android devices on slower connections, because that is where budgets stop being decorative.

The second mistake is using one global budget for the entire site. That is too coarse for most products. A homepage, article page, dashboard, checkout, and authenticated app shell often have meaningfully different budgets. Lighthouse's [`budget.json`][7] supports path-based matching with a robots.txt-like path format, and the last matching rule wins, which is how you can set a broad default and then override it for specific sections. Lighthouse CI also supports `assertMatrix`, which lets you apply different assertions to different URL patterns.

The third mistake is budgeting only a Lighthouse score. Rule-based metrics have their place, but [web.dev][1] explicitly recommends combining quantity-based and user-centric metrics, not relying on one composite indicator. [Lighthouse's scoring docs][15] say the performance score is a weighted average of underlying metric scores and that the weightings have changed over time. That makes the score useful as a secondary signal and a terrible sole budget. A composite score is fine for an executive dashboard. It is a weak release gate.

A good budgeting model is therefore layered and asymmetric. Put hard release gates on a small number of truly important metrics. Put softer warnings on leading indicators that often foreshadow regressions. For example, a production budget might hard-fail when p75 LCP exceeds 2.5 seconds or p75 INP exceeds 200 milliseconds, while a CI budget might warn when third-party request count creeps upward or a route bundle grows by 10%. That "warning versus error" split is exactly the pattern [MDN recommends][2].

## How to Enforce Budgets

There are three enforcement points that actually matter: during bundling, in CI, and in production telemetry.

At build time, bundlers can enforce simple file-size budgets. webpack has built-in [performance hints][8] for this. Its `performance` config can warn or error when an emitted asset exceeds `maxAssetSize` or when an entrypoint exceeds `maxEntrypointSize`, and `assetFilter` lets you decide which files count. webpack explicitly recommends `hints: "error"` in production builds to help prevent oversized bundles from shipping. That is a useful first line of defense, not a full performance strategy. It catches bundle bloat early, which is more than most teams manage.

```js
// webpack.config.js
module.exports = {
  // ...
  performance: {
    hints: 'error',
    maxAssetSize: 120000,
    maxEntrypointSize: 220000,
    assetFilter(assetFilename) {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    },
  },
};
```

In CI, Lighthouse and Lighthouse CI are the obvious tools. Chrome's [Lighthouse documentation][9] describes Lighthouse as an automated auditing tool you can run in DevTools, from the command line, or as a Node module, and explicitly calls out Lighthouse CI as the way to prevent regressions continuously. Lighthouse CI supports both generic assertions and `budget.json`-style budgets. If you use a `budgetsFile`, that assert mode cannot be combined with other assert options, but you can also express resource budgets using Lighthouse CI's own assertion format such as `resource-summary:third-party:count` and combine that with metric assertions and user timings.

Two details here are annoyingly important. First, if you want the Budgets section to appear in the Lighthouse report itself, you set [`collect.settings.budgetPath`][10], and then you can assert `"performance-budget": "error"` in LHCI. Second, `budget.json` uses kilobytes for resource-size budgets, while LHCI `maxNumericValue` for `resource-summary:*:size` assertions uses bytes. That unit mismatch is exactly the kind of tiny nonsense that eats an afternoon if you miss it.

Here is a budget file that sets different limits for the site default and for checkout.

```json
// budgets.json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 170 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [{ "resourceType": "third-party", "budget": 8 }]
  },
  {
    "path": "/checkout",
    "resourceSizes": [
      { "resourceType": "script", "budget": 220 },
      { "resourceType": "total", "budget": 650 }
    ],
    "resourceCounts": [{ "resourceType": "third-party", "budget": 10 }]
  }
]
```

The Lighthouse CI configuration then references that budget file and layers on metric and user-timing assertions.

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 5,
      "settings": {
        "budgetPath": "./budgets.json"
      }
    },
    "assert": {
      "assertions": {
        "performance-budget": "error",
        "first-contentful-paint": [
          "warn",
          { "maxNumericValue": 1800, "aggregationMethod": "median" }
        ],
        "resource-summary:third-party:count": ["error", { "maxNumericValue": 8 }],
        "user-timings:route-ready": ["error", { "maxNumericValue": 1500 }]
      }
    }
  }
}
```

[Lighthouse CI][10] also gives you useful control over variance. Its docs describe several aggregation methods for multiple runs: `median`, `optimistic`, `pessimistic`, and `median-run`, and its "complete experience" example uses `numberOfRuns: 5`. If your budgets are too sensitive to run-to-run noise, the problem is often not the budget itself but the way you are aggregating lab runs.

In production, you need field data. [web.dev][5] explicitly recommends supplementing CrUX-based tools with your own RUM because your own RUM is more detailed and more immediate, while CrUX-based sources are aggregated over longer windows such as 28 days in PSI and Search Console or calendar-month slices in CrUX datasets and dashboards. The easiest way to collect your own field data is the [`web-vitals`][11] library, which its docs describe as a tiny modular library for measuring Web Vitals on real users, and web.dev recommends it directly for teams building their own RUM.

```js
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToRum(metric) {
  navigator.sendBeacon('/rum', JSON.stringify(metric));
}

onCLS(sendToRum);
onINP(sendToRum);
onLCP(sendToRum);
```

That library also uses buffered observers, so the [docs][11] note you do not need to load it extremely early to get accurate measurements. In practice, that makes field instrumentation easier to add than teams expect, which is irritating because it removes one more excuse.

For monitoring and investigation, the starting stack is pretty clear. web.dev's [measurement guide][5] recommends Chrome DevTools' live metrics view as an easy way to compare local behavior to CrUX data, PSI for page-level and origin-level 28-day data plus suggestions, and Search Console for page-specific performance reporting with history. Those tools are great for visibility, but your actual enforcement should still come from CI and your own RUM, because that is where budgets become immediate enough to shape day-to-day engineering behavior.

## SPAs and Route Transitions

This is where people get confused and invent bad dashboards. [web.dev's SPA FAQ][12] is explicit that Core Web Vitals do not currently reset on SPA route changes because those metrics are measured relative to the current top-level navigation. If your app swaps content and updates the URL without a real browser navigation, the CWV APIs do not treat that as a new page load. That means CrUX and standard CWV reporting won't give you a neat per-route-transition budget in a single-page app.

So, for SPAs, budget route transitions separately with your own custom RUM and your own route-level timings. Lighthouse CI supports assertions against custom user timings created with `performance.mark()` and `performance.measure()`, using the [`user-timings:<kebab-cased-name>` assertion format][10]. That is the clean way to budget things like "route-ready," "above-the-fold-ready," or "search-results-rendered" in both CI and field telemetry, rather than pretending CrUX will do something it currently does not.

## What Not to Do

Do not center a new budget program on deprecated Lighthouse metrics. Some older articles and examples still talk about First Meaningful Paint and Time to Interactive as if it were 2019 and everyone was still listening to productivity podcasts about `bundlephobia`. But, [Lighthouse's current docs][13] say FMP was removed as of Lighthouse 13 and should be replaced by LCP, and TTI was removed from Lighthouse 10 because it was overly sensitive and variable. For modern budgets, use Core Web Vitals in the field and use TBT as the lab proxy for interaction performance.

Do not trust lab data alone. [web.dev][14] is very explicit that lab data is useful and necessary, but it also says you must compare it with field data because the two diverge for real reasons, including redirects, server latency, caching, personalization, non-load interactions, and the lifespan effects of metrics like CLS. A lab-only budget is better than nothing. It is not enough to tell you what your users actually experienced.

Do not use one site-wide number for every route. The path-based structure in [`budget.json`][7] and URL-based `assertMatrix` in Lighthouse CI both exist because different pages and journeys deserve different budgets. A login page, article page, dashboard, and checkout are not the same thing, and pretending they are only makes your budgets noisier and less respected.

Do not use a Lighthouse performance score as the only gate. [Lighthouse's scoring docs][15] say the score is a weighted average of underlying metric scores and that those weightings have changed over time. Use the score as a summary, not as your only contract. Budget the metrics that actually represent the experience you care about.

## A Sane Starter Policy

If I were setting this up from scratch today, I would use this shape. In production, I would hard-budget p75 LCP at 2.5 seconds, p75 INP at 200 milliseconds, p75 CLS at 0.1, and p75 TTFB at roughly 0.8 seconds, separately for mobile and desktop. In CI, I would budget FCP at 1.8 seconds or less, TBT under 200 milliseconds, and then add route-specific JS, total-byte, and third-party-count caps derived from the current fastest acceptable version of each page template. I would set warnings at roughly 85% to 90% of the hard ceiling and errors at the ceiling itself, because teams need early smoke alarms as much as hard stops. The thresholds come from current [Web Vitals][3] and supporting guidance; the exact byte budgets should come from your own routes, your own devices, and your own product tolerances.

That is the whole trick. Budget the user experience in the field, budget proxies and resources in CI, and budget bytes at build time. Then make the budgets part of release policy instead of dashboard wallpaper. That is when performance budgets stop being a nice idea and start doing their actual job.

[1]: https://web.dev/articles/performance-budgets-101 'Performance budgets 101 | web.dev'
[2]: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Performance_budgets 'Performance budgets | MDN'
[3]: https://web.dev/articles/vitals 'Web Vitals | web.dev'
[4]: https://web.dev/articles/optimize-ttfb 'Optimize Time to First Byte | web.dev'
[5]: https://web.dev/articles/vitals-measurement-getting-started 'Getting started with measuring Web Vitals | web.dev'
[6]: https://web.dev/articles/fcp 'First Contentful Paint (FCP) | web.dev'
[7]: https://github.com/GoogleChrome/budget.json 'GoogleChrome/budget.json'
[8]: https://webpack.js.org/configuration/performance/ 'Performance | webpack'
[9]: https://developer.chrome.com/docs/lighthouse/overview 'Introduction to Lighthouse | Chrome for Developers'
[10]: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html 'Configuration | lighthouse-ci'
[11]: https://github.com/GoogleChrome/web-vitals 'GoogleChrome/web-vitals'
[12]: https://web.dev/articles/vitals-spa-faq 'How SPA architectures affect Core Web Vitals | web.dev'
[13]: https://developer.chrome.com/docs/lighthouse/performance/first-meaningful-paint 'First Meaningful Paint | Chrome for Developers'
[14]: https://web.dev/articles/use-lighthouse-for-performance-budgets 'Use Lighthouse for performance budgets | web.dev'
[15]: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring 'Lighthouse performance scoring | Chrome for Developers'

---

## TL;DR

### Three Budget Layers

> Budget the user experience in the field, proxies in CI, and bytes at build time.

| Layer     | What you measure           | Where it runs | Tooling                           |
| --------- | -------------------------- | ------------- | --------------------------------- |
| **Field** | Real user metrics (RUM)    | Production    | web-vitals, Datadog, Sentry       |
| **Lab**   | Synthetic audits           | CI            | Lighthouse CI, WebPageTest        |
| **Asset** | Bundle size, request count | Build time    | webpack `performance`, bundlesize |

- Field budgets catch what users actually experience.
- Lab budgets catch regressions before deploy.
- Asset budgets catch problems before the build ships.

---

### Core Web Vitals Thresholds

> These are the numbers that matter at p75.

| Metric  | Good     | Needs Improvement | Poor     |
| ------- | -------- | ----------------- | -------- |
| **LCP** | ≤ 2.5 s  | ≤ 4.0 s           | > 4.0 s  |
| **INP** | ≤ 200 ms | ≤ 500 ms          | > 500 ms |
| **CLS** | ≤ 0.1    | ≤ 0.25            | > 0.25   |

- Budget separately for mobile and desktop—they're different populations.
- INP can't be measured in lab. Use TBT as a CI proxy.
- Lab LCP can differ from field LCP by 2x or more because of TTFB variance.

---

### Enforcement Points

> A budget nobody enforces is dashboard wallpaper.

- **Build time:** webpack `performance.maxAssetSize` and `maxEntrypointSize` fail the build when bundles exceed limits.
- **CI:** Lighthouse CI asserts against metric thresholds per route. Use `median` aggregation and path-based overrides.
- **Production:** Collect field data with `web-vitals`, send to your analytics pipeline, alert when p75 regresses.
- Set warnings at 85–90% of the hard ceiling. Teams need early smoke alarms, not just hard stops.
