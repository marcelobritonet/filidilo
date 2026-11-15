import { preencher, sortear } from './calc'
import { compilar } from './expr'
import type { Baralho } from './types'

/** Lista os problemas de um baralho. Vazio = válido. */
export function validar(b: Baralho, sorteios = 60): string[] {
  const erros: string[] = []
  const temas = new Set(b.temas.map((t) => t.id))
  const ids = new Set<string>()
  if (!b.id || !b.titulo) erros.push('Baralho sem id ou título')
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
        break
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
