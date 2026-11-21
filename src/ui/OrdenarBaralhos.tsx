import { useEffect, useRef, useState } from 'preact/hooks'
import type { Baralho } from '../core/types'

interface Arrasto {
  de: number
  para: number
  /** Deslocamento do dedo desde o início, já somada a rolagem da página. */
  dy: number
  inicioY: number
  inicioScroll: number
  /** Centros verticais das linhas no início (coordenadas da página) e altura de uma linha + espaço. */
  centros: number[]
  passo: number
}

const BORDA = 72 // px perto do topo/fundo da tela em que a página rola sozinha

/** Para onde a linha arrastada vai, pelo centro dela comparado ao centro das outras. */
function destino(a: Arrasto): number {
  const centro = a.centros[a.de] + a.dy
  let para = a.de
  for (let i = 0; i < a.centros.length; i++) {
    if (i < a.de && centro < a.centros[i]) para = Math.min(para, i)
    if (i > a.de && centro > a.centros[i]) para = Math.max(para, i)
  }
  return para
}

/**
 * Lista do modo Organizar: arrasta-se pela alça ⠿ (a alça não deixa a página rolar; o resto da
 * linha deixa). Pelo teclado, a alça sobe e desce com as setas.
 */
export function OrdenarBaralhos({ baralhos, mudar }: { baralhos: Baralho[]; mudar: (lista: Baralho[]) => void }) {
  const lista = useRef<HTMLUListElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  const atual = useRef<Arrasto | null>(null)
  const dedoY = useRef(0)
  // Ao soltar, a lista muda de ordem e os deslocamentos zeram: sem transição nesse quadro, nada "pula".
  const [assentando, setAssentando] = useState(false)
  atual.current = arrasto

  // Perto das bordas da tela, a página rola sozinha enquanto se arrasta.
  useEffect(() => {
    if (!arrasto) return
    let quadro = 0
    const rolar = () => {
      const y = dedoY.current
      const v = y < BORDA ? -Math.ceil((BORDA - y) / 6) : y > innerHeight - BORDA ? Math.ceil((y - innerHeight + BORDA) / 6) : 0
      if (v) {
        scrollBy(0, v)
        const a = atual.current
        if (a) {
          const prox = { ...a, dy: y - a.inicioY + scrollY - a.inicioScroll }
          setArrasto({ ...prox, para: destino(prox) })
        }
      }
      quadro = requestAnimationFrame(rolar)
    }
    quadro = requestAnimationFrame(rolar)
    return () => cancelAnimationFrame(quadro)
  }, [!!arrasto])

  const comecar = (i: number, e: PointerEvent) => {
    const itens = [...(lista.current?.children ?? [])] as HTMLElement[]
    if (!itens[i]) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const rets = itens.map((el) => el.getBoundingClientRect())
    const passo = rets.length > 1 ? rets[1].top - rets[0].top : rets[0].height
    dedoY.current = e.clientY
    setArrasto({
      de: i,
      para: i,
      dy: 0,
      inicioY: e.clientY,
      inicioScroll: scrollY,
      centros: rets.map((r) => r.top + scrollY + r.height / 2),
      passo,
    })
  }
  const mexer = (e: PointerEvent) => {
    const a = atual.current
    if (!a) return
    dedoY.current = e.clientY
    const prox = { ...a, dy: e.clientY - a.inicioY + scrollY - a.inicioScroll }
    setArrasto({ ...prox, para: destino(prox) })
  }
  const soltar = () => {
    const a = atual.current
    setArrasto(null)
    setAssentando(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setAssentando(false)))
    if (!a || a.para === a.de) return
    const nova = [...baralhos]
    const [b] = nova.splice(a.de, 1)
    nova.splice(a.para, 0, b)
    mudar(nova)
  }
  const teclado = (i: number, e: KeyboardEvent) => {
    const j = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1
    if (j < 0 || j >= baralhos.length) return
    e.preventDefault()
    const nova = [...baralhos]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    mudar(nova)
    requestAnimationFrame(() => lista.current?.querySelectorAll<HTMLElement>('.alca')[j]?.focus())
  }

  /** Quanto cada linha se desloca durante o arrasto. */
  const deslocamento = (i: number): number => {
    if (!arrasto) return 0
    const { de, para, dy, passo } = arrasto
    if (i === de) return dy
    if (de < para && i > de && i <= para) return -passo
    if (de > para && i < de && i >= para) return passo
    return 0
  }

  return (
    <>
      <p class="dica organizar-dica">Arraste pelo ⠿ para mudar a ordem.</p>
      <ul ref={lista} class={`lista-baralhos organizando${arrasto ? ' arrastando' : ''}${assentando ? ' assentando' : ''}`}>
        {baralhos.map((b, i) => (
          <li key={b.id} class={`baralho-ordem${arrasto?.de === i ? ' pego' : ''}`} style={{ transform: `translateY(${deslocamento(i)}px)` }}>
            <span class="titulo">{b.titulo}</span>
            <button
              class="alca"
              aria-label={`Mover ${b.titulo} (posição ${i + 1} de ${baralhos.length}; setas para cima e para baixo)`}
              onPointerDown={(e) => comecar(i, e)}
              onPointerMove={mexer}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onKeyDown={(e) => teclado(i, e)}
            >
              ⠿
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
