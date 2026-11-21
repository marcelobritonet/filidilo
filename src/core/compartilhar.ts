import { novoId, obter, salvar } from './baralhos'
import { filtrarProgresso, mesclarProgresso, trocarBaralho, type Progresso } from './progresso'
import type { Baralho, Cartao } from './types'
import { validar } from './validar'

/** Envelope do arquivo compartilhado. Aceitamos também um Baralho "cru". */
interface ArquivoBaralho {
  app: 'tatino'
  tipo: 'baralho'
  formato: 2
  baralho: Baralho
  /** Opcional: o progresso de quem enviou, para levar o baralho a outro aparelho dela. */
  progresso?: Progresso
}

/**
 * Nome e conteúdo do arquivo. Usa .txt porque o Chrome do Android só compartilha
 * alguns tipos de arquivo (JSON não está entre eles); o conteúdo continua JSON.
 */
export function arquivoDoBaralho(b: Baralho, progresso?: Progresso): { nome: string; texto: string } {
  // Arquivar é só deste aparelho: quem recebe ganha o baralho na lista principal.
  const { arquivadoEm: _arq, ...baralho } = b
  const envelope: ArquivoBaralho = { app: 'tatino', tipo: 'baralho', formato: 2, baralho, ...(progresso && { progresso }) }
  const titulo = nomeArquivo(b.titulo) || 'baralho'
  return { nome: `${titulo}${progresso ? ' com progresso' : ''} (Tatino).txt`, texto: JSON.stringify(envelope) }
}

const nomeArquivo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Envelope com alguns cartões soltos (enviar um cartão). */
interface ArquivoCartoes {
  app: 'tatino'
  tipo: 'cartoes'
  formato: 2
  /** Baralho de onde vieram, para sugerir o destino e o nome. */
  origem: { titulo: string }
  temas: Baralho['temas']
  cartoes: Cartao[]
}

export interface CartoesRecebidos {
  origem: string
  temas: Baralho['temas']
  cartoes: Cartao[]
}

/** Arquivo para enviar um ou mais cartões de um baralho. */
export function arquivoDosCartoes(b: Baralho, cartoes: Cartao[]): { nome: string; texto: string } {
  const usados = new Set(cartoes.map((c) => c.tema))
  const envelope: ArquivoCartoes = { app: 'tatino', tipo: 'cartoes', formato: 2, origem: { titulo: b.titulo }, temas: b.temas.filter((t) => usados.has(t.id)), cartoes }
  const c = cartoes[0]
  const resumo = nomeArquivo(('frente' in c ? c.frente : c.titulo).replace(/[$*]/g, '')).slice(0, 40)
  return { nome: `${cartoes.length === 1 ? `Cartão - ${resumo}` : `${cartoes.length} cartões - ${nomeArquivo(b.titulo)}`} (Tatino).txt`, texto: JSON.stringify(envelope) }
}

/** Lê o que chegou: um baralho inteiro ou cartões soltos. */
export function lerRecebido(texto: string): { tipo: 'baralho'; baralho: Baralho; progresso?: Progresso } | ({ tipo: 'cartoes' } & CartoesRecebidos) {
  let d: Partial<ArquivoCartoes> | undefined
  try {
    d = JSON.parse(texto)
  } catch {
    throw new Error('Este arquivo não é do tatino.')
  }
  if (d?.app === 'tatino' && d.tipo === 'cartoes') {
    if (!Array.isArray(d.cartoes) || !d.cartoes.length || !Array.isArray(d.temas)) throw new Error('Este arquivo não tem cartões.')
    const teste: Baralho = { id: 'x', titulo: 'x', versao: 1, temas: d.temas, cartoes: d.cartoes }
    const erros = validar(teste, 20)
    if (erros.length) throw new Error(`O cartão tem problema: ${erros[0]}`)
    return { tipo: 'cartoes', origem: d.origem?.titulo ?? 'Cartões recebidos', temas: d.temas, cartoes: d.cartoes }
  }
  const baralho = lerBaralho(texto)
  return { tipo: 'baralho', baralho, progresso: lerProgresso(texto, baralho.id) }
}

/** O progresso que veio junto com o baralho, se veio (só o deste baralho). */
export function lerProgresso(texto: string, baralhoId: string): Progresso | undefined {
  try {
    return filtrarProgresso((JSON.parse(texto) as Partial<ArquivoBaralho>).progresso, baralhoId)
  } catch {
    return undefined
  }
}

/**
 * Junta cartões recebidos a um baralho: temas casam pelo nome (os que faltam são criados),
 * ids repetidos ganham id novo, e todos ficam marcados como importados.
 */
export async function adicionarCartoesRecebidos(destino: Baralho, r: CartoesRecebidos): Promise<Baralho> {
  const temas = [...destino.temas]
  const mapa = new Map<string, string>()
  for (const t of r.temas) {
    const igual = temas.find((x) => x.nome.trim().toLowerCase() === t.nome.trim().toLowerCase())
    if (igual) mapa.set(t.id, igual.id)
    else {
      const novo = { id: temas.some((x) => x.id === t.id) ? novoId(t.nome) : t.id, nome: t.nome }
      temas.push(novo)
      mapa.set(t.id, novo.id)
    }
  }
  const ids = new Set(destino.cartoes.map((c) => c.id))
  const novos = r.cartoes.map((c) => ({
    ...c,
    id: ids.has(c.id) ? `${c.id}-${Math.random().toString(36).slice(2, 6)}` : c.id,
    tema: mapa.get(c.tema) ?? temas[0]?.id ?? 'geral',
    origem: 'importado' as const,
    editado: undefined,
  }))
  return salvar({ ...destino, temas, cartoes: [...destino.cartoes, ...novos] })
}

/** Lê o arquivo recebido e valida. Lança erro com mensagem em português. */
export function lerBaralho(texto: string): Baralho {
  let dados: unknown
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error('Este arquivo não é do tatino.')
  }
  const d = dados as Partial<ArquivoBaralho> & Partial<Baralho> & { estados?: unknown }
  if (d.app === 'tatino' && d.estados) throw new Error('Este arquivo é um backup. Use Backup → Restaurar.')
  const b = (d.tipo === 'baralho' ? d.baralho : d) as Baralho
  if (!b || typeof b.id !== 'string' || !Array.isArray(b.cartoes) || !Array.isArray(b.temas)) throw new Error('Este arquivo não é do tatino.')
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
  /** Progresso que veio junto (quando ela leva o baralho para outro aparelho dela). */
  progresso?: Progresso
  /** Cartões com progresso no que veio. */
  estudados: number
}

const semMeta = (c: Cartao) => {
  const { atualizadoEm: _a, editado: _e, origem: _o, ...resto } = c
  return JSON.stringify(resto)
}

export async function planejar(recebido: Baralho, progresso?: Progresso): Promise<PlanoImportacao> {
  const atual = await obter(recebido.id)
  const plano: PlanoImportacao = { recebido, atual, novos: [], atualizados: [], preservados: [], iguais: 0, soNoMeu: 0, temasNovos: [], progresso, estudados: progresso?.estados.length ?? 0 }
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

export interface OpcoesImportacao {
  /** Trazer também o progresso que veio junto. */
  comProgresso?: boolean
}

/** Atualiza o baralho dela (ou cria, se não existir), preservando o que ela editou. */
export async function aplicar(p: PlanoImportacao, o: OpcoesImportacao = {}): Promise<Baralho> {
  const b = await aplicarCartoes(p)
  if (o.comProgresso && p.progresso) await mesclarProgresso(p.progresso)
  return b
}

/** Só o progresso (ela já tem o baralho igualzinho). */
export async function aplicarSoProgresso(p: PlanoImportacao): Promise<void> {
  if (p.progresso) await mesclarProgresso(p.progresso)
}

async function aplicarCartoes(p: PlanoImportacao): Promise<Baralho> {
  if (!p.atual) return salvar({ ...p.recebido, cartoes: p.recebido.cartoes.map(marcarImportado), criadoEm: undefined })
  const trocar = new Map(p.atualizados.map((c) => [c.id, c]))
  const cartoes = [...p.atual.cartoes.map((c) => (trocar.has(c.id) ? marcarImportado(trocar.get(c.id)!) : c)), ...p.novos.map(marcarImportado)]
  // Nome, objetivo e temas que ela já tem continuam os dela; só entram os temas novos e um objetivo que ela não tenha.
  return salvar({ ...p.atual, cartoes, temas: [...p.atual.temas, ...p.temasNovos], objetivo: p.atual.objetivo ?? p.recebido.objetivo })
}

/** Importa como um baralho separado, sem tocar no que ela já tem. */
export async function importarComoCopia(recebido: Baralho, progresso?: Progresso): Promise<Baralho> {
  const titulo = `${recebido.titulo} (recebido)`
  const b = await salvar({ ...recebido, id: novoId(titulo), titulo, cartoes: recebido.cartoes.map(marcarImportado), criadoEm: undefined })
  if (progresso) await mesclarProgresso(trocarBaralho(progresso, recebido.id, b.id))
  return b
}
