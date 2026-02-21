<script lang="ts">
  const { repoPath }: { repoPath: `courses/${string}` | `content/writing/${string}` } = $props();
</script>

<footer
  class="border-primary-200 bg-primary-100 dark:border-primary-900 dark:bg-primary-800 my-10 rounded-md border-2 px-8 py-4"
>
  <p>
    See something that looks a little off? Feel free to <a
      class="decoration-primary-500 font-semibold underline decoration-2 underline-offset-4"
      href="https://github.com/stevekinney/stevekinney.net/blob/main/{repoPath}"
      >open a pull request here</a
    >.
  </p>
</footer>
