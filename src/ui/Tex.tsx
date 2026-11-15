import katex from 'katex'
import 'katex/dist/katex.min.css'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function html(texto: string): string {
  return texto
    .split(/(\$[^$]+\$)/g)
    .map((parte) => {
      if (parte.startsWith('$') && parte.endsWith('$') && parte.length > 2) {
        try {
          return katex.renderToString(parte.slice(1, -1), { throwOnError: false, output: 'html' })
        } catch {
          return esc(parte)
        }
      }
      return esc(parte)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    })
    .join('')
}

/** Texto com fórmulas entre $...$ e **negrito**. */
export function Tex({ texto, class: cls }: { texto: string; class?: string }) {
  return <span class={cls} dangerouslySetInnerHTML={{ __html: html(texto) }} />
}
