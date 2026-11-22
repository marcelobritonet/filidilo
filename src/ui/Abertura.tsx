import { useEffect, useRef, useState } from 'preact/hooks'
import { terminarAbertura } from './tema'
import { DURACAO, PENAS, diaLocal, quadro, tocarDanca, type Quadro } from './danca'

// Tela de abertura do Filidilo (manual da marca, seção Aplicações): fundo noite, símbolo com
// 96px de altura e o nome abaixo, a 48px. Na primeira abertura do dia, as penas dançam como uma
// cauda que abre e se juntam no centro formando o símbolo. Toque pula.

const CHAVE = 'filidilo-abertura-dia'
const PARADA = 600 // ms com o símbolo pronto quando não há dança
const SAIDA = 250 // ms do esmaecer ao sair

// Desenho do símbolo, na grade 100×100 (docs/marca-filidilo/design-system/assets/Logos/simbolo.svg).
const GOTA = 'M50 10C76 30 82 60 67 78C59 88 41 88 33 78C18 60 24 30 50 10Z'
// Escala para a gota (y 10 a 86) ter 96px de altura.
const K = 96 / 76
// Pivô das penas: abaixo da base da gota, para o leque abrir em arco.
const PX = 50
const PY = 126
// Nome em curvas (nome-nevoa.svg): Sora Bold com a ligadura fi, o o final é o ocelo.
const NOME =
  'M84 0V-559Q84 -654 137.5 -700.0Q191 -746 296 -746H350V-626H289Q262 -626 247.5 -611.0Q233 -596 233 -569V0ZM20 -426V-543H348V-426ZM456 0V-548H616V0ZM391 -430V-548H616V-430ZM518 -602Q473 -602 451.5 -625.5Q430 -649 430 -685Q430 -722 451.5 -745.5Q473 -769 518 -769Q564 -769 585.0 -745.5Q606 -722 606 -685Q606 -649 585.0 -625.5Q564 -602 518 -602Z M741.0 0V-730H902.0V0ZM676.0 -612V-730H902.0V-612Z M1045.0 0V-548H1205.0V0ZM972.0 -430V-548H1205.0V-430ZM1107.0 -602Q1062.0 -602 1040.5 -625.5Q1019.0 -649 1019.0 -685Q1019.0 -722 1040.5 -745.5Q1062.0 -769 1107.0 -769Q1152.0 -769 1173.5 -745.5Q1195.0 -722 1195.0 -685Q1195.0 -649 1173.5 -625.5Q1152.0 -602 1107.0 -602Z M1549.0 18Q1491.0 18 1443.5 -3.0Q1396.0 -24 1361.0 -61.5Q1326.0 -99 1307.5 -150.0Q1289.0 -201 1289.0 -260V-283Q1289.0 -342 1306.5 -393.0Q1324.0 -444 1357.5 -482.5Q1391.0 -521 1438.0 -542.5Q1485.0 -564 1543.0 -564Q1609.0 -564 1657.0 -535.5Q1705.0 -507 1732.0 -451.5Q1759.0 -396 1762.0 -315L1720.0 -354V-730H1881.0V0H1754.0V-227H1776.0Q1773.0 -149 1743.5 -94.0Q1714.0 -39 1664.0 -10.5Q1614.0 18 1549.0 18ZM1589.0 -116Q1626.0 -116 1656.5 -132.5Q1687.0 -149 1705.5 -181.0Q1724.0 -213 1724.0 -258V-295Q1724.0 -339 1705.0 -369.0Q1686.0 -399 1655.0 -415.0Q1624.0 -431 1588.0 -431Q1548.0 -431 1516.5 -410.5Q1485.0 -390 1467.0 -354.5Q1449.0 -319 1449.0 -272Q1449.0 -224 1467.0 -189.0Q1485.0 -154 1517.0 -135.0Q1549.0 -116 1589.0 -116Z M2022.0 0V-548H2182.0V0ZM1949.0 -430V-548H2182.0V-430ZM2084.0 -602Q2039.0 -602 2017.5 -625.5Q1996.0 -649 1996.0 -685Q1996.0 -722 2017.5 -745.5Q2039.0 -769 2084.0 -769Q2129.0 -769 2150.5 -745.5Q2172.0 -722 2172.0 -685Q2172.0 -649 2150.5 -625.5Q2129.0 -602 2084.0 -602Z M2307.0 0V-730H2468.0V0ZM2242.0 -612V-730H2468.0V-612Z'
const ESCALA_NOME = 0.0447 // 140px de largura
const LARGURA_NOME = 3132 * ESCALA_NOME

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

function pintar(q: Quadro, feixe: SVGGElement, penas: (SVGGElement | null)[], nome: SVGGElement) {
  feixe.setAttribute('transform', `translate(0 ${q.subida}) ${emVolta(q.anguloFeixe, q.escalaFeixe)}`)
  q.penas.forEach((p, i) => penas[i]?.setAttribute('transform', emVolta(p.angulo, p.escala)))
  nome.setAttribute('opacity', String(q.opacidadeNome))
}

function decidirDanca(): boolean {
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
  const hoje = diaLocal(new Date())
  let ultimo: string | null = null
  try {
    ultimo = localStorage.getItem(CHAVE)
    localStorage.setItem(CHAVE, hoje)
  } catch {
    // Sem armazenamento (modo privado): dança toda vez.
  }
  return tocarDanca(ultimo, hoje, reduzir)
}

export function Abertura({ aoTerminar }: { aoTerminar: () => void }) {
  const [saindo, setSaindo] = useState(false)
  const feixe = useRef<SVGGElement>(null)
  const nome = useRef<SVGGElement>(null)
  const penas = useRef<(SVGGElement | null)[]>([])
  const pular = useRef<() => void>(() => {})

  useEffect(() => {
    let raf = 0
    let espera = 0
    let fim = 0
    const desenhar = (t: number) => pintar(quadro(t), feixe.current!, penas.current, nome.current!)
    const sair = () => {
      cancelAnimationFrame(raf)
      clearTimeout(espera)
      desenhar(DURACAO)
      setSaindo(true)
      terminarAbertura()
      fim = window.setTimeout(aoTerminar, SAIDA)
      pular.current = () => {}
    }
    pular.current = sair

    if (decidirDanca()) {
      let inicio: number | null = null
      const passo = (agora: number) => {
        inicio ??= agora
        const t = agora - inicio
        desenhar(t)
        if (t < DURACAO) raf = requestAnimationFrame(passo)
        else espera = window.setTimeout(sair, 300)
      }
      desenhar(0)
      raf = requestAnimationFrame(passo)
    } else {
      desenhar(DURACAO)
      espera = window.setTimeout(sair, PARADA)
    }
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(espera)
      clearTimeout(fim)
    }
  }, [])

  return (
    <div class={`abertura${saindo ? ' saindo' : ''}`} onClick={() => pular.current()} role="img" aria-label="filidilo">
      <svg width="360" height="640" viewBox="0 0 360 640" aria-hidden="true">
        <g transform={`translate(180 272) scale(${K}) translate(-50 -48)`}>
          <g ref={feixe}>
            {ORDEM.map((i) => (
              <g key={i} ref={(el) => {
                penas.current[i] = el
              }}>
                <path d={GOTA} fill="#13A3A0" />
                <ellipse cx="50" cy="62" rx="16" ry="18" fill="#C9933A" />
                <ellipse cx="50" cy="63" rx="10.5" ry="12" fill="#1F4FD1" />
                <circle cx="50" cy="64" r="4.5" fill="#EEF3FB" />
              </g>
            ))}
          </g>
        </g>
        <g ref={nome} opacity="0" transform={`translate(${180 - LARGURA_NOME / 2} ${368 + 769 * ESCALA_NOME}) scale(${ESCALA_NOME})`}>
          <path d={NOME} fill="#EEF3FB" />
          <circle cx="2832" cy="-280" r="300" fill="#13A3A0" />
          <circle cx="2832" cy="-280" r="180" fill="#C9933A" />
          <circle cx="2832" cy="-280" r="120" fill="#1F4FD1" />
          <circle cx="2832" cy="-280" r="48" fill="#0B1E3F" />
        </g>
      </svg>
    </div>
  )
}
