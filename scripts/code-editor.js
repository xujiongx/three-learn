/**
 * CodeMirror 6 封装：JS 语法高亮 + 暗色主题 + 常用快捷键
 */
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'

/**
 * @param {HTMLElement} parent
 * @param {{ doc?: string, onRun?: () => void }} options
 */
export function createCodeEditor(parent, options = {}) {
  const { doc = '', onRun } = options

  const runKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        onRun?.()
        return true
      },
    },
  ])

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        dropCursor(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        javascript(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        keymap.of([
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        runKeymap,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            borderRadius: '12px',
            border: '1px solid rgba(244, 244, 245, 0.14)',
            overflow: 'hidden',
          },
          '.cm-scroller': {
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            lineHeight: '1.55',
          },
          '.cm-content': {
            padding: '12px 0',
          },
          '.cm-gutters': {
            backgroundColor: '#0b0c10',
            borderRight: '1px solid rgba(244, 244, 245, 0.08)',
          },
          '&.cm-focused': {
            outline: '2px solid rgba(255, 122, 60, 0.45)',
            outlineOffset: '1px',
          },
        }),
      ],
    }),
  })

  return {
    view,
    getValue() {
      return view.state.doc.toString()
    },
    setValue(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      })
    },
    focus() {
      view.focus()
    },
    destroy() {
      view.destroy()
    },
  }
}
