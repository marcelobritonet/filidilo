// Baralho recebido (link ou arquivo) que a pessoa deixou para depois com "Agora não".
// Fica guardado neste aparelho e vira um lembrete na tela inicial até ela adicionar ou descartar.

const CHAVE = 'tatino-recebido-pendente'
/** Depois disso o lembrete some sozinho. */
const VALIDADE = 7 * 24 * 60 * 60 * 1000

export interface RecebidoPendente {
  /** O conteúdo recebido, como chegou (o mesmo texto do arquivo ou do link). */
  texto: string
  titulo: string
  cartoes: number
  em: number
}

export function guardarPendente(p: Omit<RecebidoPendente, 'em'>, agora = Date.now(), ls: Storage = localStorage): void {
  try {
    ls.setItem(CHAVE, JSON.stringify({ ...p, em: agora }))
  } catch {
    // Sem espaço: o lembrete é só uma ajuda.
  }
}

export function lerPendente(agora = Date.now(), ls: Storage = localStorage): RecebidoPendente | null {
  try {
    const p = JSON.parse(ls.getItem(CHAVE) ?? 'null') as RecebidoPendente | null
    if (!p || typeof p.texto !== 'string' || typeof p.em !== 'number') return null
    if (agora - p.em > VALIDADE) {
      ls.removeItem(CHAVE)
      return null
    }
    return p
  } catch {
    return null
  }
}

export function esquecerPendente(ls: Storage = localStorage): void {
  try {
    ls.removeItem(CHAVE)
  } catch {
    // nada
  }
}
