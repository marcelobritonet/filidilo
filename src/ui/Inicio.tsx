import { useMemo, useState } from 'preact/hooks'
import { chave, dominado, vencido } from '../core/srs'
import type { Filtro } from '../core/fila'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { textoContagem, useEstados } from './estado'
import { Icone } from './Icone'
import { Marca } from './Marca'

/** Tela de um baralho: modos de estudo, temas e progresso. */
export function Inicio({ baralho, nav, versao }: { baralho: Baralho; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const [temas, setTemas] = useState<string[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const id = baralho.id

  const porTema = useMemo(() => {
    const m = new Map<string, { total: number; dominados: number; vistos: number }>()
    for (const t of baralho.temas) m.set(t.id, { total: 0, dominados: 0, vistos: 0 })
    for (const c of baralho.cartoes) {
      const r = m.get(c.tema)!
      const e = estados?.get(chave(baralho.id, c.id))
      r.total++
      if (e) r.vistos++
      if (dominado(e)) r.dominados++
    }
    return m
  }, [estados, baralho])

  const paraHoje = useMemo(
    () => (estados ? baralho.cartoes.filter((c) => estados.has(chave(baralho.id, c.id)) && vencido(estados.get(chave(baralho.id, c.id)))).length : 0),
    [estados, baralho],
  )
  const temCalculo = baralho.cartoes.some((c) => c.tipo === 'calculo')
  const total = baralho.cartoes.length
  const dominadosTotal = [...porTema.values()].reduce((s, r) => s + r.dominados, 0)
  const contagem = textoContagem(baralho.prova)
  const alternar = (id: string) => setTemas((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]))
  const opcoes = { temas, filtro }

  const continuar = paraHoje > 0
  return (
    <main class="tela inicio">
      <header class="cabecalho">
        <div class="cabecalho-linha">
          <button class="voltar" aria-label="Voltar para Meus baralhos" onClick={nav.voltar}>
            ←
          </button>
          <Marca />
          <button class="btn terciario compacto" onClick={() => nav.ir({ nome: 'config', id })}>
            Configurar
          </button>
        </div>
        <h1>{baralho.titulo}</h1>
        {contagem && <p class="selo">{contagem}</p>}
      </header>

      {total === 0 ? (
        <section class="bloco">
          <p>Este baralho ainda não tem cartões.</p>
          <button class="btn principal" onClick={() => nav.ir({ nome: 'cartao', id })}>
            Criar um cartão
          </button>
          <button class="btn secundario" onClick={() => nav.ir({ nome: 'colar', id })}>
            Colar uma lista
          </button>
          <button class="btn secundario" onClick={() => nav.ir({ nome: 'ia', id })}>
            Criar com IA (Gemini)
          </button>
        </section>
      ) : (
        <>
          <section class="cartao-resumo">
            <p>
              <strong>{dominadosTotal}</strong> de {total} cartões dominados
            </p>
            <div class="barra" aria-hidden="true">
              <div style={{ width: `${(100 * dominadosTotal) / Math.max(total, 1)}%` }} />
            </div>
          </section>

          <button class="btn principal grande" onClick={() => nav.ir({ nome: 'sessao', id, modo: continuar ? 'espacada' : 'prova', opcoes })}>
            {continuar ? 'Continuar estudando' : 'Começar uma sessão'}
            <small>{continuar ? `${paraHoje} ${paraHoje === 1 ? 'cartão para revisar' : 'cartões para revisar'} hoje` : '20 cartões, começando pelo que você mais precisa'}</small>
          </button>

          <ul class="lista-acoes" aria-label="Modos de estudo">
            <li>
              <button class="cartao-acao" onClick={() => nav.ir({ nome: 'sessao', id, modo: 'prova', opcoes })}>
                <Icone nome="avancar" />
                <span>
                  <strong>Modo prova</strong>
                  <small>20 cartões, começando pelo que você mais precisa</small>
                </span>
              </button>
            </li>
            <li>
              <button class="cartao-acao" onClick={() => nav.ir({ nome: 'sessao', id, modo: 'espacada', opcoes })}>
                <Icone nome="revisar" />
                <span>
                  <strong>Revisão espaçada</strong>
                  <small>{paraHoje ? `${paraHoje} para revisar hoje, mais cartões novos` : 'Cartões novos'}</small>
                </span>
              </button>
            </li>
            {temCalculo && (
              <li>
                <button class="cartao-acao" onClick={() => nav.ir({ nome: 'sessao', id, modo: 'calculo', opcoes: { temas, filtro: 'calculo' } })}>
                  <Icone nome="praticar" />
                  <span>
                    <strong>Exercícios de cálculo</strong>
                    <small>Números novos a cada vez, com resolução passo a passo</small>
                  </span>
                </button>
              </li>
            )}
          </ul>

          <section>
            <h2>
              Temas
              {temas.length > 0 && (
                <button class="btn terciario compacto" onClick={() => setTemas([])}>
                  Limpar seleção
                </button>
              )}
            </h2>
            <p class="dica">Toque nos temas para estudar só eles. Sem seleção, entram todos.</p>
            {temCalculo && (
              <div class="segmentado" role="radiogroup" aria-label="Tipo de cartão">
                {(['tudo', 'teoria', 'calculo'] as Filtro[]).map((f) => (
                  <button role="radio" aria-checked={filtro === f} class={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
                    {f === 'tudo' ? 'Tudo' : f === 'teoria' ? 'Só teoria' : 'Só cálculo'}
                  </button>
                ))}
              </div>
            )}
            <ul class="temas">
              {baralho.temas.map((t) => {
                const r = porTema.get(t.id)!
                if (!r.total) return null
                const sel = temas.includes(t.id)
                return (
                  <li>
                    <button class={`tema ${sel ? 'sel' : ''}`} aria-pressed={sel} onClick={() => alternar(t.id)}>
                      <span class="nome">
                        <span class="marcador" aria-hidden="true">{sel ? '✓' : ''}</span>
                        {t.nome} {t.prioritario && <span class="selo">cai na prova</span>}
                      </span>
                      <span class="barra" aria-hidden="true">
                        <span style={{ width: `${(100 * r.dominados) / r.total}%` }} />
                      </span>
                      <span class="num">
                        {r.dominados} de {r.total}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <nav class="rodape" aria-label="Mais opções">
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'revisar', id })}>
          Cartões: ver, editar e revisar
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'backup' })}>
          Backup e reportes
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Aparência
        </button>
      </nav>
    </main>
  )
}
