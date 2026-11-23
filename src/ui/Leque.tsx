import { useEffect, useRef } from 'preact/hooks'
import { GOTA } from './marcaFormas'
import { DURACAO_COMEMORACAO, PENAS, quadroComemoracao, type Quadro } from './danca'

// As nove penas do símbolo, na grade 100×100 do símbolo (manual da marca). Usadas na abertura
// (a cauda que abre) e na comemoração do fim da sessão (o pavão abre e sacode a cauda).

// Pivô das penas: abaixo da base da gota, para o leque abrir em arco.
const PX = 50
const PY = 126

// As penas de fora ficam atrás: desenha do lado para o meio, a do meio por último.
const ORDEM = (() => {
  const c = (PENAS - 1) / 2
  const o: number[] = []
  for (let d = c; d >= 0; d--) {
    o.push(c - d)
    if (d) o.push(c + d)
  }
  return o
})()

const emVolta = (angulo: number, escala: number) =>
  `rotate(${angulo} ${PX} ${PY}) translate(${PX} ${PY}) scale(${escala}) translate(${-PX} ${-PY})`

export interface RefsLeque {
  feixe: SVGGElement | null
  penas: (SVGGElement | null)[]
}

export const novasRefs = (): RefsLeque => ({ feixe: null, penas: [] })

/** Aplica um quadro da dança nas penas já desenhadas. */
export function pintarLeque(q: Quadro, refs: RefsLeque) {
  refs.feixe?.setAttribute('transform', `translate(0 ${q.subida}) ${emVolta(q.anguloFeixe, q.escalaFeixe)}`)
  q.penas.forEach((p, i) => refs.penas[i]?.setAttribute('transform', emVolta(p.angulo, p.escala)))
}

/** O feixe de penas, na grade 100×100; o movimento vem de `pintarLeque`. */
export function Leque({ refs }: { refs: RefsLeque }) {
  return (
    <g ref={(el) => {
      refs.feixe = el
    }}>
      {ORDEM.map((i) => (
        <g key={i} ref={(el) => {
          refs.penas[i] = el
        }}>
          <path d={GOTA} fill="#13A3A0" />
          <ellipse cx="50" cy="62" rx="16" ry="18" fill="#C9933A" />
          <ellipse cx="50" cy="63" rx="10.5" ry="12" fill="#1F4FD1" />
          <circle cx="50" cy="64" r="4.5" fill="#EEF3FB" />
        </g>
      ))}
    </g>
  )
}

/** Comemoração do fim da sessão: o pavão sobe, abre o leque e sacode a cauda; fica aberto.
 *  Com "reduzir movimento", o leque já aparece aberto e parado. */
export function Pavao({ largura = 200 }: { largura?: number }) {
  const refs = useRef(novasRefs()).current
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pintarLeque(quadroComemoracao(DURACAO_COMEMORACAO), refs)
      return
    }
    let raf = 0
    let inicio: number | null = null
    const passo = (agora: number) => {
      inicio ??= agora
      const t = agora - inicio
      pintarLeque(quadroComemoracao(t), refs)
      if (t < DURACAO_COMEMORACAO) raf = requestAnimationFrame(passo)
    }
    pintarLeque(quadroComemoracao(0), refs)
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [])
  // A caixa cabe o leque aberto (±68°); embaixo, corta as penas enquanto sobem.
  return (
    <svg class="pavao" width={largura} height={(largura * 130) / 250} viewBox="-75 -2 250 130" aria-hidden="true" focusable="false">
      <Leque refs={refs} />
    </svg>
  )
}
