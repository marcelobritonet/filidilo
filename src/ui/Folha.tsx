import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * Folha que sobe de baixo, como a modal nativa do celular (bottom sheet).
 * Mostra o resultado sem rolar a página. A alça recolhe a folha para ver o cartão
 * inteiro; com ela recolhida, a página volta a rolar normalmente.
 */
export function Folha({ titulo, tom = 'neutro', rodape, children }: { titulo: string; tom?: 'ok' | 'erro' | 'neutro'; rodape?: ComponentChildren; children?: ComponentChildren }) {
  const [recolhida, setRecolhida] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Leva o foco para a primeira ação da folha (teclado e leitor de tela).
    const alvo = ref.current?.querySelector<HTMLElement>('.folha-acoes button') ?? ref.current?.querySelector<HTMLElement>('.folha-corpo button')
    alvo?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (recolhida) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [recolhida])

  return (
    <>
      {!recolhida && <div class="folha-fundo" aria-hidden="true" onClick={() => setRecolhida(true)} />}
      <div ref={ref} class={`folha ${tom} ${recolhida ? 'recolhida' : ''}`} role="dialog" aria-modal={!recolhida} aria-labelledby="folha-titulo">
        <button class="folha-alca" aria-expanded={!recolhida} aria-label={recolhida ? 'Mostrar o resultado' : 'Recolher para ver o cartão'} onClick={() => setRecolhida(!recolhida)}>
          <span aria-hidden="true" />
        </button>
        <h2 id="folha-titulo" class="folha-titulo" aria-live="polite">
          {titulo}
        </h2>
        {!recolhida && children && <div class="folha-corpo">{children}</div>}
        {rodape && <div class="folha-acoes">{rodape}</div>}
      </div>
    </>
  )
}
