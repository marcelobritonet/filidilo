/** Marca do Filidilo: símbolo (pena com ocelo), nome em curvas e os desenhos da ofensiva (ocelo e leque).
 *  Desenhos e regras em docs/marca-filidilo/design-system/ (manual da marca). */

import { GOTA, NOME } from './marcaFormas'

/** Ícone do app: quadrado noite com a pena. */
export function Simbolo({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg class="simbolo" width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect width="100" height="100" rx="22.6" fill="#0B1E3F" />
      <g transform="translate(14 13) scale(.72)">
        <path d={GOTA} fill="#13A3A0" />
        <ellipse cx="50" cy="62" rx="16" ry="18" fill="#C9933A" />
        <ellipse cx="50" cy="63" rx="10.5" ry="12" fill="#1F4FD1" />
        <circle cx="50" cy="64" r="4.5" fill="#EEF3FB" />
      </g>
    </svg>
  )
}

/** Nome "filidilo" em curvas (Sora Bold, ligadura fi); as letras usam a cor do texto. */
function Nome({ altura }: { altura: number }) {
  return (
    <svg class="marca-nome" height={altura} viewBox={NOME.caixa.join(' ')} aria-hidden="true" focusable="false">
      <path fill="currentColor" d={NOME.letras} />
      <circle cx="2832" cy="-280" r="300" fill="#13A3A0" />
      <circle cx="2832" cy="-280" r="180" fill="#C9933A" />
      <circle cx="2832" cy="-280" r="120" fill="#1F4FD1" />
      <circle cx="2832" cy="-280" r="48" fill="#0B1E3F" />
    </svg>
  )
}

export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span class={`marca ${grande ? 'grande' : ''}`}>
      <Simbolo tamanho={grande ? 44 : 30} />
      <Nome altura={grande ? 40 : 22} />
      <span class="so-leitor">tatino.</span>
    </span>
  )
}

/** Ocelo: aceso (quatro anéis) ou apagado (contorno tracejado). */
export function Ocelo({ tamanho = 20, apagado = false }: { tamanho?: number; apagado?: boolean }) {
  if (apagado)
    return (
      <svg class="ocelo apagado" width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="9" stroke-dasharray="14 10" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="8" />
      </svg>
    )
  return (
    <svg class="ocelo" width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="50" fill="#13A3A0" />
      <circle cx="50" cy="50" r="30" fill="#C9933A" />
      <circle cx="50" cy="50" r="20" fill="#1F4FD1" />
      <circle cx="50" cy="50" r="8" fill="#0B1E3F" />
    </svg>
  )
}

const ANGULOS: Record<number, number[]> = { 3: [-36, 36, 0], 5: [-72, 72, -36, 36, 0] }
const CAIXA: Record<number, string> = { 3: '-14 6 128 88', 5: '-40 6 180 102' }

/** Leque de penas da ofensiva longa: 3 penas (7 a 29 dias) ou 5 (30 ou mais). */
export function Leque({ penas, altura = 22, apagado = false }: { penas: 3 | 5; altura?: number; apagado?: boolean }) {
  const [, , w, h] = CAIXA[penas].split(' ').map(Number)
  return (
    <svg class={`leque ${apagado ? 'apagado' : ''}`} width={(altura * w) / h} height={altura} viewBox={CAIXA[penas]} aria-hidden="true" focusable="false">
      {ANGULOS[penas].map((a) => (
        <g transform={`rotate(${a} 50 90) rotate(180 50 50)`}>
          <path d={GOTA} class="pena" stroke-width="5" stroke-linejoin="round" />
          <ellipse cx="50" cy="62" rx="16" ry="18" class="anel-1" />
          <ellipse cx="50" cy="63" rx="10.5" ry="12" class="anel-2" />
          <circle cx="50" cy="64" r="4.5" class="anel-3" />
        </g>
      ))}
    </svg>
  )
}

/** Desenho do estágio da ofensiva: ocelo (1 a 6 dias), leque de 3 (7 a 29) ou de 5 penas (30+). */
export function DesenhoOfensiva({ dias, aceso, tamanho = 22 }: { dias: number; aceso: boolean; tamanho?: number }) {
  if (dias >= 30) return <Leque penas={5} altura={tamanho} apagado={!aceso} />
  if (dias >= 7) return <Leque penas={3} altura={tamanho} apagado={!aceso} />
  return <Ocelo tamanho={tamanho} apagado={!aceso || dias === 0} />
}

/** Folga: uma pena guardada (cheia) ou o lugar vazio dela. */
export function PenaFolga({ cheia }: { cheia: boolean }) {
  return (
    <svg class={`pena-folga ${cheia ? 'cheia' : ''}`} width="12" height="16" viewBox="18 6 64 84" aria-hidden="true" focusable="false">
      <path d={GOTA} stroke-width="8" stroke-linejoin="round" />
    </svg>
  )
}
