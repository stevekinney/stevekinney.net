<script lang="ts">
  const { filename }: { filename: `courses/${string}` | `writing/${string}` } = $props();
</script>

<footer
  class="my-10 rounded-md border-2 border-primary-200 bg-primary-100 px-8 py-4 dark:border-primary-900 dark:bg-primary-800"
>
  <p>
    See something that looks a little off? Feel free to <a
      class="font-semibold underline decoration-primary-500 decoration-2 underline-offset-4"
      href="https://github.com/stevekinney/stevekinney.net/blob/main/content/{filename}.md"
      >open a pull request here</a
    >.
  </p>
</footer>
