import { novoId, obter, salvar } from './baralhos'
import type { Baralho, Cartao } from './types'
import { validar } from './validar'

/** Envelope do arquivo compartilhado. Aceitamos também um Baralho "cru". */
interface ArquivoBaralho {
  app: 'tatino'
  tipo: 'baralho'
  formato: 2
  baralho: Baralho
}

/**
 * Nome e conteúdo do arquivo. Usa .txt porque o Chrome do Android só compartilha
 * alguns tipos de arquivo (JSON não está entre eles); o conteúdo continua JSON.
 */
export function arquivoDoBaralho(b: Baralho): { nome: string; texto: string } {
  const envelope: ArquivoBaralho = { app: 'tatino', tipo: 'baralho', formato: 2, baralho: b }
  const titulo = b.titulo.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'baralho'
  return { nome: `${titulo} (Tatino).txt`, texto: JSON.stringify(envelope) }
}

/** Lê o arquivo recebido e valida. Lança erro com mensagem em português. */
export function lerBaralho(texto: string): Baralho {
  let dados: unknown
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error('Este arquivo não é um baralho do Tatino.')
  }
  const d = dados as Partial<ArquivoBaralho> & Partial<Baralho> & { estados?: unknown }
  if (d.app === 'tatino' && d.estados) throw new Error('Este arquivo é um backup, não um baralho. Use “Backup e reportes” → Restaurar.')
  const b = (d.tipo === 'baralho' ? d.baralho : d) as Baralho
  if (!b || typeof b.id !== 'string' || !Array.isArray(b.cartoes) || !Array.isArray(b.temas)) throw new Error('Este arquivo não é um baralho do Tatino.')
  const erros = validar(b, 20)
  if (erros.length) throw new Error(`O baralho tem ${erros.length} problema(s), por exemplo: ${erros[0]}`)
  return b
}

export interface PlanoImportacao {
  recebido: Baralho
  atual?: Baralho
  novos: Cartao[]
  atualizados: Cartao[]
  /** Cartões que ela editou: ficam como estão. */
  preservados: Cartao[]
  iguais: number
  /** Cartões que só existem no dela: ficam (nada é apagado). */
  soNoMeu: number
  temasNovos: Baralho['temas']
}

const semMeta = (c: Cartao) => {
  const { atualizadoEm: _a, editado: _e, origem: _o, ...resto } = c
  return JSON.stringify(resto)
}

export async function planejar(recebido: Baralho): Promise<PlanoImportacao> {
  const atual = await obter(recebido.id)
  const plano: PlanoImportacao = { recebido, atual, novos: [], atualizados: [], preservados: [], iguais: 0, soNoMeu: 0, temasNovos: [] }
  if (!atual) {
    plano.novos = recebido.cartoes
    return plano
  }
  const meus = new Map(atual.cartoes.map((c) => [c.id, c]))
  for (const c of recebido.cartoes) {
    const meu = meus.get(c.id)
    if (!meu) plano.novos.push(c)
    else if (semMeta(meu) === semMeta(c)) plano.iguais++
    else if (meu.editado) plano.preservados.push(meu)
    else plano.atualizados.push(c)
  }
  const recebidos = new Set(recebido.cartoes.map((c) => c.id))
  plano.soNoMeu = atual.cartoes.filter((c) => !recebidos.has(c.id)).length
  const temas = new Set(atual.temas.map((t) => t.id))
  plano.temasNovos = recebido.temas.filter((t) => !temas.has(t.id))
  return plano
}

const marcarImportado = (c: Cartao): Cartao => ({ ...c, origem: c.origem ?? 'importado', editado: undefined })

/** Atualiza o baralho dela (ou cria, se não existir), preservando o que ela editou. */
export async function aplicar(p: PlanoImportacao): Promise<Baralho> {
  if (!p.atual) return salvar({ ...p.recebido, cartoes: p.recebido.cartoes.map(marcarImportado), criadoEm: undefined })
  const trocar = new Map(p.atualizados.map((c) => [c.id, c]))
  const cartoes = [...p.atual.cartoes.map((c) => (trocar.has(c.id) ? marcarImportado(trocar.get(c.id)!) : c)), ...p.novos.map(marcarImportado)]
  // Nome, data da prova e temas que ela já tem continuam os dela; só entram os temas novos.
  return salvar({ ...p.atual, cartoes, temas: [...p.atual.temas, ...p.temasNovos] })
}

/** Importa como um baralho separado, sem tocar no que ela já tem. */
export async function importarComoCopia(recebido: Baralho): Promise<Baralho> {
  const titulo = `${recebido.titulo} (recebido)`
  return salvar({ ...recebido, id: novoId(titulo), titulo, cartoes: recebido.cartoes.map(marcarImportado), criadoEm: undefined })
}
