import { useEffect, useMemo, useState } from 'preact/hooks'
import { confere, formatar, lerNumero, preencher, sortear, type Sorteio } from '../core/calc'
import { db, type Nota } from '../core/db'
import { filaEspacada, filaProva, posicaoReinsercao, type OpcoesFila } from '../core/fila'
import { chave, registrar } from '../core/srs'
import type { Cartao, CartaoCalculo } from '../core/types'
import { baralho, nomeTema } from './estado'
import { Reportar } from './Reportar'
import { Tex } from './Tex'

export type Modo = 'prova' | 'espacada' | 'calculo'

const TITULO: Record<Modo, string> = { prova: 'Modo prova', espacada: 'Revisão espaçada', calculo: 'Exercícios de cálculo' }

export function Sessao({ modo, opcoes, sair }: { modo: Modo; opcoes: OpcoesFila; sair: () => void }) {
  const [fila, setFila] = useState<Cartao[] | null>(null)
  const [pos, setPos] = useState(0)
  const [placar, setPlacar] = useState({ certos: 0, errados: 0 })
  const [reportando, setReportando] = useState(false)
  const [rodada, setRodada] = useState(0)

  useEffect(() => {
    db.estados.toArray().then((l) => {
      const m = new Map(l.map((e) => [e.id, e]))
      const f = modo === 'espacada' ? filaEspacada(baralho, m, opcoes) : filaProva(baralho, m, { ...opcoes, tamanho: modo === 'calculo' ? 10 : 20 })
      setFila(f)
      setPos(0)
      setPlacar({ certos: 0, errados: 0 })
    })
  }, [rodada])

  if (!fila) return <main class="tela"><p>Carregando…</p></main>

  const cartao = fila[pos]
  const avaliar = async (nota: Nota) => {
    try {
      await registrar(chave(baralho.id, cartao.id), nota, modo)
    } catch (e) {
      console.error('Não foi possível salvar o progresso', e) // a sessão continua mesmo assim
    }
    setPlacar((p) => (nota === 1 ? { ...p, errados: p.errados + 1 } : { ...p, certos: p.certos + 1 }))
    if (nota === 1) {
      // Errou: o cartão volta daqui a alguns cartões nesta mesma sessão.
      const nova = [...fila]
      nova.splice(posicaoReinsercao(pos, nova.length), 0, cartao)
      setFila(nova)
    }
    setPos(pos + 1)
    window.scrollTo(0, 0)
  }

  return (
    <main class="tela sessao">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Sair da sessão" onClick={sair}>
          ✕
        </button>
        <span>{TITULO[modo]}</span>
        <span class="contador">{cartao ? `${pos + 1}/${fila.length}` : ''}</span>
      </header>
      {fila.length > 0 && (
        <div class="progresso">
          <div style={{ width: `${(100 * pos) / fila.length}%` }} />
        </div>
      )}

      {!cartao ? (
        <Fim placar={placar} vazio={fila.length === 0} modo={modo} outra={() => setRodada((r) => r + 1)} sair={sair} />
      ) : (
        <>
          <div class="meta-cartao">
            <span class="tema-chip">{nomeTema(cartao.tema)}</span>
            <button class="link" onClick={() => setReportando(true)}>
              ⚠ Reportar erro
            </button>
          </div>
          <CartaoView key={`${pos}-${cartao.id}`} cartao={cartao} avaliar={avaliar} />
          {reportando && <Reportar cartao={cartao} fechar={() => setReportando(false)} />}
        </>
      )}
    </main>
  )
}

function Fim({ placar, vazio, modo, outra, sair }: { placar: { certos: number; errados: number }; vazio: boolean; modo: Modo; outra: () => void; sair: () => void }) {
  if (vazio)
    return (
      <section class="fim">
        <p class="grande">🎉</p>
        <p>{modo === 'espacada' ? 'Nada para revisar agora. Volte mais tarde ou use o modo prova.' : 'Nenhum cartão com esse filtro.'}</p>
        <button class="btn principal" onClick={sair}>Voltar ao início</button>
      </section>
    )
  const total = placar.certos + placar.errados
  return (
    <section class="fim">
      <p class="grande">{placar.errados === 0 ? '🏆' : '💪'}</p>
      <h2>Sessão concluída</h2>
      <p>
        {placar.certos} acertos e {placar.errados} erros em {total} respostas.
      </p>
      <p class="dica">Os cartões errados voltam primeiro na próxima rodada do modo prova.</p>
      <button class="btn principal" onClick={outra}>Mais uma rodada</button>
      <button class="btn secundario" onClick={sair}>Voltar ao início</button>
    </section>
  )
}

function Fonte({ c }: { c: Cartao }) {
  if (!c.fonte) return null
  return (
    <p class="fonte">
      📄 {c.fonte.apostila}
      {c.fonte.pagina !== undefined && `, p. ${c.fonte.pagina}`}
    </p>
  )
}

function BotoesNota({ avaliar, acertou }: { avaliar: (n: Nota) => void; acertou?: boolean }) {
  if (acertou === false)
    return (
      <div class="notas">
        <button class="btn nota n1 largo" onClick={() => avaliar(1)}>
          Continuar
          <small>este cartão volta daqui a pouco</small>
        </button>
      </div>
    )
  return (
    <div class={`notas ${acertou ? 'tres' : ''}`}>
      {acertou === undefined && (
        <button class="btn nota n1" onClick={() => avaliar(1)}>
          Errei
        </button>
      )}
      <button class="btn nota n2" onClick={() => avaliar(2)}>
        {acertou ? 'Chutei' : 'Difícil'}
      </button>
      <button class="btn nota n3" onClick={() => avaliar(3)}>
        Acertei
      </button>
      <button class="btn nota n4" onClick={() => avaliar(4)}>
        Fácil
      </button>
    </div>
  )
}

function CartaoView({ cartao, avaliar }: { cartao: Cartao; avaliar: (n: Nota) => void }) {
  switch (cartao.tipo) {
    case 'conceito':
      return <Conceito c={cartao} avaliar={avaliar} />
    case 'vf':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={['Verdadeiro', 'Falso']} correta={cartao.resposta ? 0 : 1} avaliar={avaliar} rotulo="Verdadeiro ou falso?" />
    case 'associacao':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={cartao.opcoes} correta={cartao.correta} avaliar={avaliar} embaralhar />
    case 'calculo':
      return <Calculo c={cartao} avaliar={avaliar} />
  }
}

function Conceito({ c, avaliar }: { c: Extract<Cartao, { tipo: 'conceito' }>; avaliar: (n: Nota) => void }) {
  const [virado, setVirado] = useState(false)
  return (
    <article class="cartao">
      <p class="rotulo">Pergunta</p>
      <Tex class="frente" texto={c.frente} />
      {!virado ? (
        <button class="btn principal virar" onClick={() => setVirado(true)}>
          Mostrar resposta
        </button>
      ) : (
        <>
          <hr />
          <p class="rotulo">Resposta</p>
          <Tex class="verso" texto={c.verso} />
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
          <Fonte c={c} />
          <p class="dica centro">Como foi?</p>
          <BotoesNota avaliar={avaliar} />
        </>
      )}
    </article>
  )
}

function Escolha(props: { c: Cartao; pergunta: string; opcoes: string[]; correta: number; avaliar: (n: Nota) => void; embaralhar?: boolean; rotulo?: string }) {
  const { c, pergunta, opcoes, correta, avaliar } = props
  const ordem = useMemo(() => {
    const idx = opcoes.map((_, i) => i)
    if (props.embaralhar) idx.sort(() => Math.random() - 0.5)
    return idx
  }, [c.id])
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const respondeu = escolhida !== null
  const acertou = escolhida === correta
  return (
    <article class="cartao">
      <p class="rotulo">{props.rotulo ?? 'Escolha a alternativa correta'}</p>
      <Tex class="frente" texto={pergunta} />
      <div class={`opcoes ${opcoes.length === 2 ? 'duas' : ''}`}>
        {ordem.map((i) => {
          let cls = 'opcao'
          if (respondeu && i === correta) cls += ' certa'
          else if (respondeu && i === escolhida) cls += ' errada'
          return (
            <button class={cls} disabled={respondeu} aria-label={opcoes[i].replace(/[*$]/g, '')} onClick={() => setEscolhida(i)}>
              <Tex texto={opcoes[i]} />
            </button>
          )
        })}
      </div>
      {respondeu && (
        <>
          <p class={`resultado ${acertou ? 'ok' : 'erro'}`}>{acertou ? '✔ Certo!' : `✘ Resposta certa: ${opcoes[correta]}`}</p>
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
          <Fonte c={c} />
          <BotoesNota avaliar={avaliar} acertou={acertou} />
        </>
      )}
    </article>
  )
}

type Resp = { texto: string; ok: boolean | null; desistiu?: boolean }

function Calculo({ c, avaliar }: { c: CartaoCalculo; avaliar: (n: Nota) => void }) {
  const [s, setS] = useState<Sorteio>(() => sortear(c))
  const [etapa, setEtapa] = useState(0)
  const [resps, setResps] = useState<Resp[]>([])
  const [texto, setTexto] = useState('')
  const terminou = resps.length === c.etapas.length
  const acertouTudo = terminou && resps.every((r) => r.ok)

  const responder = (valor: string | number, desistiu = false) => {
    const et = c.etapas[etapa]
    const certo = s.respostas[etapa]
    let ok: boolean
    let txt: string
    if (et.opcoes) {
      ok = !desistiu && valor === certo
      txt = desistiu ? '—' : et.opcoes[valor as number]
    } else {
      const n = lerNumero(String(valor))
      if (n === null && !desistiu) return
      ok = !desistiu && n !== null && confere(n, certo, et.casas ?? 2, c.tolerancia ?? 0.02)
      txt = desistiu ? '—' : String(valor)
    }
    setResps([...resps, { texto: txt, ok, desistiu }])
    setTexto('')
  }

  const novoSorteio = () => {
    setS(sortear(c))
    setEtapa(0)
    setResps([])
    setTexto('')
  }

  return (
    <article class="cartao calculo">
      <p class="rotulo">🧮 {c.titulo}</p>
      <Tex class="frente" texto={preencher(c.enunciado, s)} />
      <ol class="etapas">
        {c.etapas.map((et, i) => {
          if (i > etapa) return null
          const r = resps[i]
          return (
            <li class={r ? (r.ok ? 'ok' : 'erro') : 'atual'}>
              <Tex class="pergunta" texto={preencher(et.pergunta, s)} />
              {!r ? (
                et.opcoes ? (
                  <div class="opcoes duas">
                    {et.opcoes.map((o, k) => (
                      <button class="opcao" onClick={() => responder(k)}>
                        {o}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    class="entrada"
                    onSubmit={(e) => {
                      e.preventDefault()
                      responder(texto)
                    }}
                  >
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      enterKeyHint="done"
                      placeholder="sua resposta"
                      value={texto}
                      onInput={(e) => setTexto((e.target as HTMLInputElement).value)}
                      aria-label={`Resposta em ${et.unidade ?? ''}`}
                    />
                    {et.unidade && <span class="unidade">{et.unidade}</span>}
                    <button class="btn principal" type="submit" disabled={lerNumero(texto) === null}>
                      Conferir
                    </button>
                  </form>
                )
              ) : (
                <>
                  <p class={`resultado ${r.ok ? 'ok' : 'erro'}`}>
                    {r.ok ? '✔ Certo: ' : r.desistiu ? 'Resposta: ' : `✘ Você: ${r.texto} · certo: `}
                    <strong>
                      {et.opcoes ? et.opcoes[s.respostas[i]] : `${formatar(s.respostas[i], et.casas ?? 2)}${et.unidade ? ` ${et.unidade}` : ''}`}
                    </strong>
                  </p>
                  <div class="resolucao">
                    {et.resolucao.map((linha) => (
                      <Tex texto={preencher(linha, s)} />
                    ))}
                  </div>
                </>
              )}
              {!r && (
                <button class="link" onClick={() => responder('', true)}>
                  Não sei — ver a resolução
                </button>
              )}
              {r && i === etapa && i < c.etapas.length - 1 && (
                <button class="btn principal" onClick={() => setEtapa(etapa + 1)}>
                  Próxima etapa →
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {terminou && (
        <>
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
          <Fonte c={c} />
          <button class="link" onClick={novoSorteio}>
            🎲 Treinar de novo com outros números (não conta)
          </button>
          <BotoesNota avaliar={avaliar} acertou={acertouTudo} />
        </>
      )}
    </article>
  )
}
