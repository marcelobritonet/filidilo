import { db } from './db'
import type { Baralho } from './types'

/** Baralhos que vêm com o app e são instalados uma única vez, na primeira abertura. */
export type Semente = () => Baralho

/**
 * Instala cada baralho de fábrica uma única vez (marca "semeado:<id>"). Depois disso
 * ele é um baralho comum: a pessoa pode editar ou excluir, e o app não o recria.
 */
export async function semear(sementes: Semente[]): Promise<void> {
  await db.transaction('rw', db.baralhos, db.meta, async () => {
    for (const s of sementes) {
      const b = s()
      const marca = `semeado:${b.id}`
      if (await db.meta.get(marca)) continue
      if (!(await db.baralhos.get(b.id))) await db.baralhos.put({ ...b, criadoEm: Date.now(), atualizadoEm: Date.now() })
      await db.meta.put({ chave: marca, valor: '1' })
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
