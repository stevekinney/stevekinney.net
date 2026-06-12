<script lang="ts">
  import { dev } from '$app/environment';
</script>

<!--
  Site-wide Vercel analytics, rendered once from the root layout. Content pages
  render with `csr = false`, so a client-side `injectAnalytics` call would never
  hydrate on them. Emitting the first-party Vercel scripts directly into
  `<svelte:head>` prerenders them into the HTML, so analytics and speed insights
  load on both prerendered content pages and hydrating routes with a single
  mechanism.
-->
<svelte:head>
  {#if !dev}
    <script defer src="/_vercel/insights/script.js"></script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
  {/if}
</svelte:head>
