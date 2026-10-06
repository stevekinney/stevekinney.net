import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Colors come from custom properties that `markdown-editor.svelte` defines for
 * light and dark, so the editor follows the page's color scheme without
 * rebuilding the view.
 */
const theme = EditorView.theme({
  '&': {
    color: 'var(--markdown-editor-text)',
    backgroundColor: 'var(--markdown-editor-background)',
    fontSize: '0.875rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--markdown-editor-text)' },
  '.cm-line': { padding: '0 0.75rem' },
  '.cm-cursor': { borderLeftColor: 'var(--markdown-editor-text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--markdown-editor-selection)',
  },
  '.cm-placeholder': { color: 'var(--markdown-editor-muted)' },
});

const highlighting = HighlightStyle.define([
  { tag: tags.heading, fontWeight: '700', color: 'var(--markdown-editor-heading)' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--markdown-editor-link)' },
  { tag: tags.monospace, color: 'var(--markdown-editor-code)' },
  {
    tag: [tags.processingInstruction, tags.meta, tags.contentSeparator],
    color: 'var(--markdown-editor-muted)',
  },
  { tag: [tags.quote, tags.list], color: 'var(--markdown-editor-muted)' },
  { tag: [tags.angleBracket, tags.tagName], color: 'var(--markdown-editor-tag)' },
]);

export type MarkdownEditorView = {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  destroy: () => void;
};

export type MarkdownEditorOptions = {
  parent: HTMLElement;
  value: string;
  /** The id of the element that names the editor, for `aria-labelledby`. */
  labelledBy: string;
  /** The id of the element that describes the editor, if any. */
  describedBy?: string | undefined;
  placeholder?: string | undefined;
  onChange: (value: string) => void;
};

/**
 * A plain-text Markdown editor. It edits the source, so prompt syntax that a
 * rich-text editor would rewrite (`!` command blocks, `$ARGUMENTS`, XML-style
 * tags) comes back exactly as typed. Tab keeps moving focus, so the editor is
 * never a keyboard trap.
 */
export const createMarkdownEditorView = ({
  parent,
  value,
  labelledBy,
  describedBy,
  placeholder: placeholderText,
  onChange,
}: MarkdownEditorOptions): MarkdownEditorView => {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(highlighting),
        theme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          'aria-labelledby': labelledBy,
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        }),
        ...(placeholderText ? [placeholder(placeholderText)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (next) => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
};
