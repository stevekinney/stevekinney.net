<script lang="ts">
  import { base } from '$app/paths';

  const contentEnhancementsUrl = `${base}/generated/content-enhancements/content-enhancements.js?v=${__CONTENT_ENHANCEMENTS_BUILD_HASH__}`;
</script>

<svelte:head>
  <script type="module" src={contentEnhancementsUrl}></script>
</svelte:head>
