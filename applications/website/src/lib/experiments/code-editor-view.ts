import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';

export type CodeEditorLanguage = 'javascript' | 'markdown';

/**
 * Colors come from custom properties that `code-editor.svelte` defines for
 * light and dark, so the editor follows the page's color scheme without
 * rebuilding the view.
 */
const theme = EditorView.theme({
  '&': {
    color: 'var(--code-editor-text)',
    backgroundColor: 'var(--code-editor-background)',
    fontSize: '0.875rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--code-editor-text)' },
  '.cm-line': { padding: '0 0.75rem' },
  '.cm-cursor': { borderLeftColor: 'var(--code-editor-text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--code-editor-selection)',
  },
  '.cm-placeholder': { color: 'var(--code-editor-muted)' },
});

const highlighting = HighlightStyle.define([
  { tag: tags.heading, fontWeight: '700', color: 'var(--code-editor-heading)' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: 'var(--code-editor-link)' },
  { tag: tags.monospace, color: 'var(--code-editor-string)' },
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword],
    color: 'var(--code-editor-keyword)',
  },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--code-editor-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-editor-number)' },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: 'var(--code-editor-muted)',
    fontStyle: 'italic',
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: 'var(--code-editor-function)',
  },
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: 'var(--code-editor-property)',
  },
  {
    tag: [tags.processingInstruction, tags.meta, tags.contentSeparator, tags.quote, tags.list],
    color: 'var(--code-editor-muted)',
  },
  { tag: [tags.angleBracket, tags.tagName], color: 'var(--code-editor-keyword)' },
]);

export type CodeEditorView = {
  getValue: () => string;
  setValue: (value: string) => void;
  /** Selects a 1-based line and scrolls it into view. */
  revealLine: (line: number) => void;
  focus: () => void;
  destroy: () => void;
};

export type CodeEditorOptions = {
  parent: HTMLElement;
  value: string;
  language: CodeEditorLanguage;
  /** The id of the element that names the editor, for `aria-labelledby`. */
  labelledBy: string;
  /** The id of the element that describes the editor, if any. */
  describedBy?: string | undefined;
  placeholder?: string | undefined;
  onChange: (value: string) => void;
};

/**
 * A plain-text source editor. Tab keeps moving focus, so the editor is never
 * a keyboard trap.
 */
export const createCodeEditorView = ({
  parent,
  value,
  language,
  labelledBy,
  describedBy,
  placeholder: placeholderText,
  onChange,
}: CodeEditorOptions): CodeEditorView => {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        language === 'javascript' ? javascript() : markdown({ base: markdownLanguage }),
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
    revealLine: (line) => {
      const { doc } = view.state;
      const target = doc.line(Math.min(Math.max(1, line), doc.lines));
      view.dispatch({
        selection: EditorSelection.range(target.from, target.to),
        effects: EditorView.scrollIntoView(target.from, { y: 'center' }),
      });
      view.focus();
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
};
