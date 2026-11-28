import { useMemo, useState } from 'preact/hooks'
import { renovarCartoes } from '../core/cartoes'
import { montarCorrecao } from '../core/ia/instrucao'
import { cartoesParaRenovar, juntarRenovacao, lerRenovacao, montarRenovacao, resumoPorTema, TAMANHO_BLOCO, type RenovacaoLida } from '../core/ia/renovar'
import { evento } from '../core/telemetria'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { AbrirIA } from './AbrirIA'
import { useConferencia } from './Conferencia'
import { Conteudo } from './Revisar'

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const textoCurto = (s: string) => s.replace(/[*$]/g, '')

/**
 * Renovar com IA os cartões que já existem (P139): por tema, em blocos de até 15, na mesma conversa.
 * A IA acrescenta as variações e o app troca cada cartão mantendo o id: o progresso continua.
 */
export function RenovarCartoes({ baralho, nav }: { baralho: Baralho; nav: Navegacao }) {
  const temas = useMemo(() => resumoPorTema(baralho).filter((t) => t.total > 0), [baralho])
  const faltamTotal = temas.reduce((s, t) => s + t.faltam, 0)
  const [temaId, setTemaId] = useState<string | null>(null)
  // Blocos já salvos nesta visita: o primeiro pedido da conversa leva o contexto; os outros, só "próximo bloco".
  const [feitos, setFeitos] = useState(0)
  const [copiado, setCopiado] = useState('')
  const [resposta, setResposta] = useState('')
  const [erroLeitura, setErroLeitura] = useState('')
  const [lida, setLida] = useState<RenovacaoLida | null>(null)
  const [correcao, setCorrecao] = useState('')
  const [erroCorrecao, setErroCorrecao] = useState('')
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const conf = useConferencia()

  const restantes = temaId ? cartoesParaRenovar(baralho, temaId) : []
  const bloco = useMemo(() => restantes.slice(0, TAMANHO_BLOCO), [temaId, baralho])
  const totalBlocos = feitos + Math.ceil(restantes.length / TAMANHO_BLOCO)
  const pedido = useMemo(
    () => (temaId && bloco.length ? montarRenovacao(baralho, temaId, bloco, { primeiro: feitos === 0, numero: feitos + 1, total: totalBlocos }) : ''),
    [temaId, bloco, feitos, totalBlocos],
  )
  const nomeTema = temas.find((t) => t.id === temaId)?.nome ?? ''

  const copiar = async (texto: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(qual)
      if (qual === 'pedido') evento('renovar_bloco_copiado', { bloco: feitos + 1, cartoes: bloco.length, primeiro: feitos === 0 })
    } catch {
      setCopiado('erro')
    }
  }

  const escolherTema = (id: string) => {
    evento('renovar_tema_escolhido', { faltam: temas.find((t) => t.id === id)?.faltam ?? 0 })
    setTemaId(id)
    setFeitos(0)
    setCopiado('')
    setResposta('')
    setErroLeitura('')
  }

  const ler = () => {
    try {
      const r = lerRenovacao(resposta, baralho, bloco)
      setLida(r)
      setDesmarcados(new Set())
      setErroLeitura('')
      setResposta('')
      evento('renovar_lido', { cartoes: r.renovados.length, novos: r.novos.length, erros: [...r.renovados, ...r.novos].filter((x) => x.erros.length).length, faltando: r.faltando.length })
      conf.abrir()
    } catch (e) {
      setErroLeitura((e as Error).message)
    }
  }

  const lerCorrecao = () => {
    try {
      setLida((ant) => (ant ? juntarRenovacao(ant, lerRenovacao(correcao, baralho, bloco)) : ant))
      setCorrecao('')
      setErroCorrecao('')
    } catch (e) {
      setErroCorrecao((e as Error).message)
    }
  }

  const validos = lida ? lida.renovados.filter((r) => !r.erros.length) : []
  const novosValidos = lida ? lida.novos.filter((n) => !n.erros.length) : []
  const comErro = lida ? [...lida.renovados.filter((r) => r.erros.length).map((r) => ({ id: r.antes.id, erros: r.erros })), ...lida.novos.filter((n) => n.erros.length).map((n) => ({ id: n.idIA, erros: n.erros }))] : []
  const escolhidos = validos.filter((r) => !desmarcados.has(r.cartao.id))
  const novosEscolhidos = novosValidos.filter((n) => !desmarcados.has(n.cartao.id))
  const alternar = (id: string) =>
    setDesmarcados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const salvar = async () => {
    if (!escolhidos.length && !novosEscolhidos.length) return
    setSalvando(true)
    await renovarCartoes(baralho, escolhidos.map((r) => r.cartao), novosEscolhidos.map((n) => n.cartao))
    evento('renovar_salvo', { cartoes: escolhidos.length, novos: novosEscolhidos.length, desmarcados: validos.length + novosValidos.length - escolhidos.length - novosEscolhidos.length, bloco: feitos + 1 })
    nav.mudou()
    nav.avisar({ texto: `${plural(escolhidos.length, 'cartão renovado', 'cartões renovados')}${novosEscolhidos.length ? ` e ${plural(novosEscolhidos.length, 'novo', 'novos')}` : ''}.` })
    conf.fechar(() => {
      setLida(null)
      setFeitos((f) => f + 1)
      setCopiado('')
      setSalvando(false)
    })
  }

  const descartar = () => {
    evento('renovar_descartado', { cartoes: lida?.renovados.length ?? 0 })
    conf.fechar(() => setLida(null))
  }

  return (
    <main class="tela ia renovar">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={() => (conf.conferindo ? conf.fechar() : temaId ? setTemaId(null) : nav.voltar())}>←</button>
        <h1 class="titulo-barra">{conf.conferindo ? 'Confira os cartões' : 'Renovar cartões'}</h1>
        <span />
      </header>

      {conf.conferindo && lida ? (
        <section class="bloco passo conferencia" aria-live="polite">
          <p>
            {plural(validos.length, 'cartão renovado', 'cartões renovados')}
            {novosValidos.length > 0 && <>, {plural(novosValidos.length, 'cartão novo', 'cartões novos')}</>}
            {comErro.length > 0 && <>, {comErro.length} com problema</>}. Desmarque o que não quiser trocar.
          </p>
          {lida.faltando.length > 0 && (
            <p class="dica">
              {plural(lida.faltando.length, 'cartão não voltou', 'cartões não voltaram')} na resposta e {lida.faltando.length === 1 ? 'fica' : 'ficam'} para o próximo bloco.
            </p>
          )}

          {comErro.length > 0 && (
            <div class="problemas-ia">
              <ul class="problemas">
                {comErro.map((c) => (
                  <li>
                    ✕ {c.id}: {c.erros.join('; ')}
                  </li>
                ))}
              </ul>
              <button class="btn secundario" onClick={() => copiar(montarCorrecao(comErro), 'correcao')}>
                {copiado === 'correcao' ? '✓ Pedido de correção copiado' : 'Copiar pedido de correção'}
              </button>
              <p class="dica">Cole na mesma conversa com a IA e cole a nova resposta aqui.</p>
              <textarea rows={4} value={correcao} placeholder="Cole aqui a nova resposta" onInput={(e) => setCorrecao((e.target as HTMLTextAreaElement).value)} />
              <button class="btn secundario" disabled={!correcao.trim()} onClick={lerCorrecao}>
                Ler correção
              </button>
              {erroCorrecao && (
                <p class="resultado erro" role="alert">
                  ✕ {erroCorrecao}
                </p>
              )}
            </div>
          )}

          <ul class="lista-revisao">
            {validos.map((r) => {
              const marcado = !desmarcados.has(r.cartao.id)
              return (
                <li class={`item ${marcado ? 'ok' : ''}`}>
                  <label class="check">
                    <input type="checkbox" checked={marcado} onChange={() => alternar(r.cartao.id)} />
                    Trocar
                  </label>
                  {r.antes.tipo !== r.cartao.tipo ? (
                    <p class="dica antes">Era uma pergunta aberta: agora tem alternativas.</p>
                  ) : 'frente' in r.antes && 'frente' in r.cartao && r.antes.frente !== r.cartao.frente ? (
                    <p class="dica antes">Antes: {textoCurto(r.antes.frente)}</p>
                  ) : null}
                  <Conteudo c={r.cartao} />
                </li>
              )
            })}
            {novosValidos.map((n) => {
              const marcado = !desmarcados.has(n.cartao.id)
              return (
                <li class={`item ${marcado ? 'ok' : ''}`}>
                  <label class="check">
                    <input type="checkbox" checked={marcado} onChange={() => alternar(n.cartao.id)} />
                    Incluir
                  </label>
                  <p class="dica antes">Novo: uma parte de outro cartão que virou cartão próprio</p>
                  <Conteudo c={n.cartao} />
                </li>
              )
            })}
          </ul>

          <div class="rodape-fixo">
            <button class="btn principal" disabled={(!escolhidos.length && !novosEscolhidos.length) || salvando} onClick={salvar}>
              Salvar {plural(escolhidos.length + novosEscolhidos.length, 'cartão', 'cartões')}
            </button>
            <button class="btn terciario" onClick={descartar}>
              Descartar
            </button>
          </div>
        </section>
      ) : !temaId ? (
        <section class="bloco passo">
          <p class="dica">
            A IA acrescenta aos cartões que você já tem outros enunciados, outras formas da resposta certa e outras alternativas, para eles não voltarem sempre iguais. O progresso de cada cartão continua.
          </p>
          {faltamTotal === 0 ? (
            <p class="resultado ok" role="status">✓ Todos os cartões deste baralho já estão renovados.</p>
          ) : (
            <>
              <h2>Escolha um tema</h2>
              <ul class="temas-renovar">
                {temas.map((t) => (
                  <li>
                    <button class="btn secundario" disabled={!t.faltam} onClick={() => escolherTema(t.id)}>
                      <span>{t.nome}</span>
                      <small>{t.faltam ? `${t.faltam} de ${t.total} para renovar` : '✓ Renovado'}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <p class="dica">Cálculos e lacunas ficam como estão.</p>
            </>
          )}
        </section>
      ) : !bloco.length ? (
        <section class="bloco passo">
          <p class="resultado ok" role="status">✓ O tema {nomeTema} está renovado.</p>
          <button class="btn principal" onClick={() => { setTemaId(null); setFeitos(0) }}>
            Escolher outro tema
          </button>
        </section>
      ) : (
        <>
          <section class="bloco passo">
            <h2>
              <span class="num-passo">1</span> Peça à IA
            </h2>
            <p class="dica">
              {nomeTema} · bloco {feitos + 1} de {totalBlocos} · {plural(bloco.length, 'cartão', 'cartões')}.{' '}
              {feitos === 0 ? 'Copie o pedido e cole numa conversa nova.' : 'Cole na mesma conversa dos blocos anteriores.'}
            </p>
            <button class="btn principal" onClick={() => copiar(pedido, 'pedido')}>
              {copiado === 'pedido' ? '✓ Pedido copiado' : 'Copiar pedido'}
            </button>
            <AbrirIA />
            {copiado === 'erro' && (
              <>
                <p class="resultado erro" role="alert">
                  Não deu para copiar. Selecione o texto abaixo e copie.
                </p>
                <textarea class="instrucao" rows={8} readOnly value={pedido} />
              </>
            )}
          </section>
          <section class="bloco passo">
            <h2>
              <span class="num-passo">2</span> Cole a resposta
            </h2>
            <textarea rows={6} value={resposta} placeholder="Cole aqui a resposta da IA" onInput={(e) => setResposta((e.target as HTMLTextAreaElement).value)} />
            <button class="btn principal" disabled={!resposta.trim()} onClick={ler}>
              Ler resposta
            </button>
            {erroLeitura && (
              <p class="resultado erro" role="alert">
                ✕ {erroLeitura}
              </p>
            )}
          </section>
          {lida && (
            <button class="btn secundario" onClick={conf.abrir}>
              Ver os cartões lidos
            </button>
          )}
        </>
      )}
    </main>
  )
}
