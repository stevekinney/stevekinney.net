<script lang="ts">
  import { base } from '$app/paths';

  const contentEnhancementsUrl = `${base}/generated/content-enhancements/content-enhancements.js`;
</script>

<svelte:head>
  <script type="module" src={contentEnhancementsUrl}></script>
</svelte:head>
