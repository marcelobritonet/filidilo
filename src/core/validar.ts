import { preencher, sortear } from './calc'
import { compilar } from './expr'
import { contarLacunas } from './lacunas'
import { normalizarNivel, type Baralho, type Objetivo } from './types'

/** Lista os problemas do objetivo (opcional). Vazio = válido ou ausente. */
export function validarObjetivo(o: unknown): string[] {
  if (o === undefined) return []
  if (!o || typeof o !== 'object' || Array.isArray(o)) return ['objetivo deve ser um objeto']
  const d = o as Objetivo
  const erros: string[] = []
  if (d.pedido !== undefined && typeof d.pedido !== 'string') erros.push('objetivo: pedido deve ser texto')
  if (d.resumo !== undefined && (typeof d.resumo !== 'string' || d.resumo.length > 160)) erros.push('objetivo: resumo deve ser texto de até 160 caracteres')
  if (d.nivel !== undefined && !normalizarNivel(d.nivel)) erros.push('objetivo: nível inválido')
  for (const campo of ['foco', 'evitar'] as const) {
    const lista = d[campo]
    if (lista === undefined) continue
    if (!Array.isArray(lista) || lista.length > 5) erros.push(`objetivo: ${campo} deve ser uma lista de até 5 itens`)
    else if (lista.some((x) => typeof x !== 'string' || x.length > 60)) erros.push(`objetivo: itens de ${campo} devem ser texto de até 60 caracteres`)
  }
  return erros
}

/** Lista os problemas de um baralho. Vazio = válido. */
export function validar(b: Baralho, sorteios = 60): string[] {
  const erros: string[] = []
  const temas = new Set(b.temas.map((t) => t.id))
  const ids = new Set<string>()
  if (!b.id || !b.titulo) erros.push('Baralho sem id ou título')
  erros.push(...validarObjetivo(b.objetivo))
  for (const t of b.temas) {
    if (t.descricao !== undefined && (typeof t.descricao !== 'string' || t.descricao.length > 120)) erros.push(`tema "${t.id}": descrição de até 120 caracteres`)
  }
  for (const c of b.cartoes) {
    const e = (m: string) => erros.push(`${c.id}: ${m}`)
    if (ids.has(c.id)) e('id repetido')
    ids.add(c.id)
    if (!temas.has(c.tema)) e(`tema desconhecido "${c.tema}"`)
    switch (c.tipo) {
      case 'conceito':
        if (!c.frente?.trim() || !c.verso?.trim()) e('frente ou verso vazio')
        break
      case 'vf':
        if (!c.frente?.trim()) e('frente vazia')
        if (typeof c.resposta !== 'boolean') e('resposta deve ser true ou false')
        if (!c.resposta && !c.explicacao?.trim()) e('V/F falso precisa de explicação (por que é falso)')
        break
      case 'associacao':
        if (!c.frente?.trim()) e('frente vazia')
        if (!Array.isArray(c.opcoes) || c.opcoes.length < 2) e('precisa de 2 ou mais opções')
        else if (!Number.isInteger(c.correta) || c.correta < 0 || c.correta >= c.opcoes.length) e('índice "correta" fora das opções')
        else if (new Set(c.opcoes).size !== c.opcoes.length) e('opções repetidas')
        else if (c.opcoes.length > 10) e('no máximo 10 opções')
        if (c.outrasFormas !== undefined) {
          if (!Array.isArray(c.outrasFormas) || c.outrasFormas.some((f) => typeof f !== 'string' || !f.trim())) e('outra forma da correta vazia ou inválida ("outrasFormas" deve ser uma lista de textos)')
          else if (c.outrasFormas.some((f) => c.opcoes?.includes(f))) e('a outra forma da correta repete uma das alternativas ("outrasFormas")')
        }
        break
      case 'lacunas': {
        const n = contarLacunas(c.frente ?? '')
        if (!c.frente?.trim()) e('frente vazia')
        else if (n === 0) e('sem lacuna: use ____ no texto')
        else if (!Array.isArray(c.respostas) || c.respostas.length !== n) e(`${n} lacuna(s) pedem ${n} resposta(s)`)
        else if (c.respostas.some((r) => typeof r !== 'string' || !r.trim())) e('resposta de lacuna vazia')
        break
      }
      case 'calculo': {
        if (!c.etapas?.length) {
          e('cálculo sem etapas')
          break
        }
        try {
          for (const ex of Object.values(c.derivados ?? {})) compilar(ex)
          for (const et of c.etapas) compilar(et.expr)
          if (c.condicao) compilar(c.condicao)
          for (let i = 0; i < sorteios; i++) {
            const s = sortear(c)
            s.respostas.forEach((r, k) => {
              const et = c.etapas[k]
              if (!Number.isFinite(r)) e(`etapa ${k + 1} deu ${r} com ${JSON.stringify(s.vars)}`)
              if (et.opcoes && (!Number.isInteger(r) || r < 0 || r >= et.opcoes.length)) e(`etapa ${k + 1}: índice de opção inválido (${r})`)
            })
            const textos = [c.enunciado, ...c.etapas.flatMap((et) => [et.pergunta, ...et.resolucao])]
            for (const t of textos) {
              const sobra = /\{[A-Za-z_][A-Za-z0-9_]*(:\d)?\}/.exec(preencher(t, s))
              if (sobra) {
                e(`marcador sem valor ${sobra[0]}`)
                break
              }
            }
            if (erros.length > 50) return erros
          }
        } catch (err) {
          e(String((err as Error).message))
        }
        break
      }
      default:
        e(`tipo desconhecido "${(c as { tipo: string }).tipo}"`)
    }
  }
  return [...new Set(erros)]
}
