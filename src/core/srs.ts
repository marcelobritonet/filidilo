import { createEmptyCard, fsrs, generatorParameters, type Grade } from 'ts-fsrs'
import { aparelho, db, uuid, type Estado, type Nota, type Revisao } from './db'

const agendador = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

export const chave = (baralho: string, cartao: string) => `${baralho}/${cartao}`

export async function registrar(id: string, nota: Nota, modo: Revisao['modo']): Promise<Estado> {
  const agora = new Date()
  const atual = await db.estados.get(id)
  const base = atual?.fsrs ?? createEmptyCard(agora)
  const { card } = agendador.next(base, agora, nota as Grade)
  const estado: Estado = {
    id,
    fsrs: card,
    ultimaNota: nota,
    ultimaData: agora.getTime(),
    acertos: (atual?.acertos ?? 0) + (nota >= 3 ? 1 : 0),
    erros: (atual?.erros ?? 0) + (nota === 1 ? 1 : 0),
  }
  const ap = await aparelho() // fora da transação: usa outra tabela (meta)
  await db.transaction('rw', db.estados, db.revisoes, async () => {
    await db.estados.put(estado)
    await db.revisoes.add({ id: uuid(), cartao: id, nota, data: agora.getTime(), aparelho: ap, modo })
  })
  return estado
}

export const dominado = (e?: Estado) => !!e && e.ultimaNota >= 3
export const vencido = (e: Estado | undefined, agora = Date.now()) => !e || new Date(e.fsrs.due).getTime() <= agora
