import { db } from './db'
import type { Baralho } from './types'

/** Baralho que vem com o app, com os ids de cartões que versões anteriores tinham e ele não tem mais. */
export type Semente = () => { baralho: Baralho; retirados?: string[] }

/**
 * Instala cada baralho de fábrica uma única vez (marca "semeado:<id>" com a versão). Depois disso
 * ele é um baralho comum: a pessoa pode editar ou excluir, e o app não o recria.
 * Quando a versão de fábrica sobe, o baralho instalado perde os cartões retirados, ganha os novos
 * e recebe o conteúdo novo dos que continuam (menos os que a pessoa editou).
 * Os cartões que a pessoa criou e o progresso ficam.
 */
export async function semear(sementes: Semente[]): Promise<void> {
  await db.transaction('rw', db.baralhos, db.meta, async () => {
    for (const s of sementes) {
      const { baralho: b, retirados = [] } = s()
      const marca = `semeado:${b.id}`
      const semeado = await db.meta.get(marca)
      if (semeado && Number(semeado.valor) >= b.versao) continue
      const atual = await db.baralhos.get(b.id)
      if (!semeado && !atual) await db.baralhos.put({ ...b, criadoEm: Date.now(), atualizadoEm: Date.now() })
      else if (semeado && atual) {
        const fora = new Set(retirados)
        const deFabrica = new Map(b.cartoes.map((c) => [c.id, c]))
        const mantidos = atual.cartoes.filter((c) => !fora.has(c.id)).map((c) => (deFabrica.has(c.id) && !c.editado ? deFabrica.get(c.id)! : c))
        const tem = new Set(mantidos.map((c) => c.id))
        const temas = [...atual.temas, ...b.temas.filter((t) => !atual.temas.some((x) => x.id === t.id))]
        await db.baralhos.put({ ...atual, versao: b.versao, temas, cartoes: [...mantidos, ...b.cartoes.filter((c) => !tem.has(c.id))], atualizadoEm: Date.now() })
      }
      await db.meta.put({ chave: marca, valor: String(b.versao) })
    }
  })
}

export const listar = async () => (await db.baralhos.toArray()).sort((a, z) => a.titulo.localeCompare(z.titulo, 'pt-BR'))

export const obter = (id: string) => db.baralhos.get(id)

export async function salvar(b: Baralho): Promise<Baralho> {
  const novo = { ...b, atualizadoEm: Date.now(), criadoEm: b.criadoEm ?? Date.now() }
  await db.baralhos.put(novo)
  return novo
}

/** Id legível e único: "fisica-1-k3x9". */
export function novoId(titulo: string): string {
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  return `${slug || 'baralho'}-${Math.random().toString(36).slice(2, 6)}`
}

export async function criar(titulo: string): Promise<Baralho> {
  const t = titulo.trim() || 'Novo baralho'
  return salvar({ id: novoId(t), titulo: t, versao: 1, temas: [{ id: 'geral', nome: 'Geral' }], cartoes: [] })
}

/** Copia temas e cartões, sem o progresso. */
export async function duplicar(id: string): Promise<Baralho> {
  const b = await obter(id)
  if (!b) throw new Error('Baralho não encontrado')
  const titulo = `Cópia de ${b.titulo}`
  return salvar({ ...structuredClone(b), id: novoId(titulo), titulo, criadoEm: undefined })
}

/** Exclui o baralho e devolve o objeto, para permitir desfazer. O progresso fica guardado. */
export async function excluir(id: string): Promise<Baralho | undefined> {
  const b = await obter(id)
  await db.baralhos.delete(id)
  return b
}

export async function restaurar(b: Baralho): Promise<void> {
  await db.baralhos.put(b)
}
