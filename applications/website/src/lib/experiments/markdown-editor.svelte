<script lang="ts">
  import CodeEditor from './code-editor.svelte';

  type Props = {
    /** The Markdown source. Bind it to follow edits. */
    value: string;
    /** The id of the visible label that names the editor. */
    labelledBy: string;
    /** The id of the hint that describes the editor, if any. */
    describedBy?: string;
    placeholder?: string;
    /** Rows for the plain text area shown before the editor loads. */
    rows?: number;
  };

  let { value = $bindable(), labelledBy, describedBy, placeholder, rows }: Props = $props();
</script>

<!--
  A source editor, not a rich-text one, so prompt syntax a rich-text editor would rewrite
  (`!` command blocks, `$ARGUMENTS`, XML-style tags) comes back exactly as typed.
-->
<CodeEditor bind:value language="markdown" {labelledBy} {describedBy} {placeholder} {rows} />
