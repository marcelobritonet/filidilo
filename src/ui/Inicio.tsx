import { useMemo, useState } from 'preact/hooks'
import { desarquivar } from '../core/baralhos'
import type { Filtro } from '../core/fila'
import { chave, dominado, vencido } from '../core/srs'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { evento } from '../core/telemetria'
import { conteudoBaralho, conteudoBaralhoComProgresso } from './enviar'
import { EnviarModal } from './EnviarModal'
import { useEstados } from './estado'
import { Icone } from './Icone'
import { Marca } from './Marca'
import { MINIMO_LIVRE } from './Sessao'

/** Última escolha de como estudar, guardada por baralho. */
interface Escolha {
  por: 'acertos' | 'tempo' | 'livre'
  acertos: number
  minutos: number
  conteudo: Filtro
  /** Temas marcados. Vazio = todos (primeira vez). */
  temas: string[]
}

const PADRAO: Escolha = { por: 'acertos', acertos: 10, minutos: 10, conteudo: 'tudo', temas: [] }
const OPCOES_ACERTOS = [5, 10, 20, 30]
const OPCOES_MINUTOS = [5, 10, 15, 20]
const chaveEscolha = (id: string) => `tatino-ajuste-${id}`

function lerEscolha(id: string): Escolha {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveEscolha(id)) ?? '{}') as Partial<Escolha> & { por?: string }
    return { ...PADRAO, ...salvo, por: salvo.por === 'tempo' || salvo.por === 'livre' ? salvo.por : 'acertos' }
  } catch {
    return PADRAO
  }
}

/** Tela do baralho: progresso e Estudar (pergunta o modo e os temas). Cartões ficam em Configurar baralho. */
export function Inicio({ baralho, nav, versao }: { baralho: Baralho; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const id = baralho.id
  const [escolha, setEscolha] = useState<Escolha>(() => lerEscolha(id))
  const [perguntando, setPerguntando] = useState(false)

  const porTema = useMemo(() => {
    const m = new Map<string, { total: number; dominados: number }>()
    for (const t of baralho.temas) m.set(t.id, { total: 0, dominados: 0 })
    for (const c of baralho.cartoes) {
      const r = m.get(c.tema)
      if (!r) continue
      r.total++
      if (dominado(estados?.get(chave(id, c.id)))) r.dominados++
    }
    return m
  }, [estados, baralho])

  const temasComCartoes = baralho.temas.filter((t) => porTema.get(t.id)?.total)
  const total = baralho.cartoes.length
  const dominadosTotal = estados ? baralho.cartoes.filter((c) => dominado(estados.get(chave(id, c.id)))).length : 0
  const paraHoje = estados ? baralho.cartoes.filter((c) => estados.has(chave(id, c.id)) && vencido(estados.get(chave(id, c.id)))).length : 0
  const temCalculo = baralho.cartoes.some((c) => c.tipo === 'calculo')
  // Quase tudo dominado (80% ou mais, com pelo menos 10 cartões): sugere cartões de um nível acima.
  const subirNivel = total >= 10 && dominadosTotal >= 0.8 * total

  // Temas marcados na pergunta: os da última vez que ainda existem; senão, todos.
  const marcadosSalvos = escolha.temas.filter((t) => temasComCartoes.some((x) => x.id === t))
  const marcados = marcadosSalvos.length ? marcadosSalvos : temasComCartoes.map((t) => t.id)

  const abrirPergunta = () => {
    setEscolha({ ...escolha, temas: marcados })
    setPerguntando(true)
  }

  const alternarTema = (t: string) => setEscolha({ ...escolha, temas: escolha.temas.includes(t) ? escolha.temas.filter((x) => x !== t) : [...escolha.temas, t] })
  const todosMarcados = temasComCartoes.every((t) => escolha.temas.includes(t.id))

  const [enviando, setEnviando] = useState(false)
  const enviar = () => setEnviando(true)

  const comecar = () => {
    try {
      localStorage.setItem(chaveEscolha(id), JSON.stringify(escolha))
    } catch {
      /* sem armazenamento: vale só agora */
    }
    setPerguntando(false)
    const todos = escolha.temas.length === temasComCartoes.length
    evento('sessao_iniciada', { por: escolha.por, meta: escolha.por === 'tempo' ? escolha.minutos : escolha.por === 'livre' ? 0 : escolha.acertos, temas: escolha.temas.length, temas_total: temasComCartoes.length, cartoes: total })
    nav.ir({
      nome: 'sessao',
      id,
      modo: 'prova',
      opcoes: { temas: todos ? [] : escolha.temas, filtro: temCalculo ? escolha.conteudo : 'tudo' },
      limite: escolha.por === 'tempo' ? { tipo: 'tempo', minutos: escolha.minutos } : escolha.por === 'livre' ? { tipo: 'livre' } : { tipo: 'acertos', n: escolha.acertos },
    })
  }

  const desarquivarAqui = async () => {
    evento('baralho_desarquivado', { cartoes: total })
    await desarquivar(baralho)
    nav.mudou()
    nav.avisar({ texto: `“${baralho.titulo}” voltou para Meus baralhos.` })
  }

  return (
    <main class="tela inicio">
      <header class="cabecalho">
        <div class="cabecalho-linha">
          <button class="voltar" aria-label="Voltar para Meus baralhos" onClick={nav.voltar}>
            ←
          </button>
          <Marca />
          <button class="btn terciario compacto" onClick={() => nav.ir({ nome: 'config', id })}>
            Configurar baralho
          </button>
        </div>
        <div class="titulo-acoes">
          <h1>{baralho.titulo}</h1>
          {total > 0 && (
            <button class="icone-btn" aria-label="Enviar baralho" title="Enviar baralho" onClick={enviar}>
              <Icone nome="enviar" />
            </button>
          )}
        </div>
        {baralho.arquivadoEm && (
          <p class="dica arquivado-aviso">
            Baralho arquivado ·{' '}
            <button class="link" onClick={desarquivarAqui}>
              Desarquivar
            </button>
          </p>
        )}
      </header>

      {total === 0 ? (
        <section class="bloco">
          <p>Ainda não há cartões.</p>
          <button class="btn principal" onClick={() => nav.ir({ nome: 'ia', id })}>
            Criar com IA
          </button>
          <button class="btn secundario" onClick={() => nav.ir({ nome: 'cartao', id })}>
            Escrever um cartão
          </button>
          <button class="btn secundario" onClick={() => nav.ir({ nome: 'colar', id })}>
            Colar uma lista
          </button>
        </section>
      ) : (
        <>
          <section class="cartao-resumo">
            <p>
              <strong>{dominadosTotal}</strong> de {total} {total === 1 ? 'cartão dominado' : 'cartões dominados'}
            </p>
            <div class="barra" aria-hidden="true">
              <div style={{ width: `${(100 * dominadosTotal) / Math.max(total, 1)}%` }} />
            </div>
          </section>

          <button class="btn principal grande" onClick={abrirPergunta}>
            Estudar
            {paraHoje > 0 && <small>{paraHoje} para revisar hoje</small>}
          </button>

          {subirNivel && (
            <section class="incentivo-ia">
              <Icone nome="entender" />
              <div>
                <p>Você já domina quase tudo. Quer subir de nível?</p>
                <button
                  class="btn secundario"
                  onClick={() => {
                    evento('sugestao_subir_nivel')
                    nav.ir({ nome: 'ia', id, assunto: 'Cartões um nível acima do atual' })
                  }}
                >
                  Criar cartões um nível acima
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <nav class="rodape" aria-label="Mais opções">
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'backup' })}>
          Backup
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Aparência
        </button>
      </nav>

      {perguntando && (
        <>
          <div class="folha-fundo" aria-hidden="true" onClick={() => setPerguntando(false)} />
          <div class="folha" role="dialog" aria-modal="true" aria-labelledby="titulo-estudar">
            <span class="folha-alca" aria-hidden="true">
              <span />
            </span>
            <h2 id="titulo-estudar" class="folha-titulo">
              Como estudar?
            </h2>
            <div class="folha-corpo">
              <div class="campo">
                Modo
                <div class="segmentado" role="radiogroup" aria-label="Modo">
                  {(['acertos', 'tempo', 'livre'] as const).map((m) => (
                    <button role="radio" aria-checked={escolha.por === m} class={escolha.por === m ? 'ativo' : ''} onClick={() => setEscolha({ ...escolha, por: m })}>
                      {m === 'acertos' ? 'Até acertar' : m === 'tempo' ? 'Por tempo' : 'Livre'}
                    </button>
                  ))}
                </div>
                {escolha.por === 'livre' ? (
                  <p class="dica">Estude quanto quiser e toque em Terminar. Com {MINIMO_LIVRE} respostas ou mais, vale o dia.</p>
                ) : (
                <div class="chips" role="radiogroup" aria-label={escolha.por === 'tempo' ? 'Minutos' : 'Acertos'}>
                  {escolha.por === 'tempo'
                    ? OPCOES_MINUTOS.map((m) => (
                        <button role="radio" aria-checked={escolha.minutos === m} class={`chip ${escolha.minutos === m ? 'ativo' : ''}`} onClick={() => setEscolha({ ...escolha, minutos: m })}>
                          {m} min
                        </button>
                      ))
                    : OPCOES_ACERTOS.map((n) => (
                        <button role="radio" aria-checked={escolha.acertos === n} class={`chip ${escolha.acertos === n ? 'ativo' : ''}`} onClick={() => setEscolha({ ...escolha, acertos: n })}>
                          {n} acertos
                        </button>
                      ))}
                </div>
                )}
              </div>

              {temCalculo && (
                <div class="campo">
                  Conteúdo
                  <div class="segmentado" role="radiogroup" aria-label="Conteúdo">
                    {(['tudo', 'teoria', 'calculo'] as Filtro[]).map((f) => (
                      <button role="radio" aria-checked={escolha.conteudo === f} class={escolha.conteudo === f ? 'ativo' : ''} onClick={() => setEscolha({ ...escolha, conteudo: f })}>
                        {f === 'tudo' ? 'Tudo' : f === 'teoria' ? 'Teoria' : 'Cálculo'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div class="campo">
                <span class="campo-titulo">
                  Temas
                  {temasComCartoes.length > 1 && (
                    <button class="btn terciario compacto" onClick={() => setEscolha({ ...escolha, temas: todosMarcados ? [] : temasComCartoes.map((t) => t.id) })}>
                      {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  )}
                </span>
                <ul class="temas">
                  {temasComCartoes.map((t) => {
                    const r = porTema.get(t.id)!
                    const sel = escolha.temas.includes(t.id)
                    return (
                      <li>
                        <button class={`tema ${sel ? 'sel' : ''}`} role="checkbox" aria-checked={sel} onClick={() => alternarTema(t.id)}>
                          <span class="nome">
                            <span class="marcador" aria-hidden="true">{sel ? '✓' : ''}</span>
                            {t.nome}
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
              </div>
            </div>
            <div class="folha-acoes">
              {!escolha.temas.length && (
                <p class="resultado erro" role="alert">
                  Marque pelo menos um tema.
                </p>
              )}
              <button class="btn principal" disabled={!escolha.temas.length} onClick={comecar}>
                Começar
              </button>
            </div>
          </div>
        </>
      )}
      {enviando && <EnviarModal conteudo={conteudoBaralho(baralho)} comProgresso={() => conteudoBaralhoComProgresso(baralho)} onde="baralho" avisar={(texto) => nav.avisar({ texto })} fechar={() => setEnviando(false)} />}
    </main>
  )
}
