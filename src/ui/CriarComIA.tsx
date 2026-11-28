import { evento } from '../core/telemetria'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { adicionarCartoes } from '../core/cartoes'
import { ganharFolga, MAX_FOLGAS } from '../core/ofensiva'
import { avaliarBaralho, type Avaliacao } from '../core/desempenho'
import { EXEMPLOS, VERSAO_INSTRUCAO, montarCorrecao, montarInstrucao, montarInstrucaoFormatacao, montarMaisDoMaterial, type Mistura, type Origem } from '../core/ia/instrucao'
import { contarTipos } from '../core/ia/proporcao'
import { extrairJson, lerResposta, parecePerguntas, type RespostaLida } from '../core/ia/resposta'
import { infoNivel, normalizarNivel, type Baralho } from '../core/types'
import type { Navegacao } from './App'
import { AbrirIA } from './AbrirIA'
import { ComoAnexar } from './ComoAnexar'
import { Conferencia, useConferencia } from './Conferencia'


/** Criar cartões com IA: copia a instrução, cola na IA, cola a resposta aqui, confere e salva. */
export function CriarComIA({ baralho, assuntoInicial, temaId, nav }: { baralho: Baralho; assuntoInicial?: string; temaId?: string; nav: Navegacao }) {
  // Vindo do fim de uma sessão, já abre no tema em que houve mais dificuldade.
  // Baralho com cartões tirados de arquivo (têm página): começa em "Arquivo", na mesma conversa.
  const veioDeArquivo = !assuntoInicial && baralho.cartoes.some((c) => c.fonte?.pagina != null)
  const [origem, setOrigem] = useState<Origem>(assuntoInicial ? 'tema' : 'arquivo')
  // Mais cartões do mesmo arquivo: pedido curto para colar na conversa em que o arquivo já está.
  const [continuar, setContinuar] = useState(veioDeArquivo)
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState(assuntoInicial ? `${assuntoInicial} (${baralho.titulo})` : '')
  // Modo "formatar": a pessoa já tem perguntas e respostas, em qualquer formato, e a IA só as converte.
  const [formatar, setFormatar] = useState(false)
  const [perguntas, setPerguntas] = useState('')
  const [naoConvertidos, setNaoConvertidos] = useState<string[]>([])
  const [quantidade, setQuantidade] = useState(20)
  const [mistura, setMistura] = useState<Mistura>('misto')
  const [copiado, setCopiado] = useState('')
  const [resposta, setResposta] = useState('')
  const [lida, setLida] = useState<RespostaLida | null>(null)
  const [erroLeitura, setErroLeitura] = useState('')
  const [iaPerguntou, setIaPerguntou] = useState(false)
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const conf = useConferencia()
  // Desempenho recente: sugere subir ou descer o nível dos próximos cartões. A pessoa pode voltar atrás.
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
  const [usarSugestao, setUsarSugestao] = useState(true)

  useEffect(() => {
    let vivo = true
    avaliarBaralho(baralho.id, baralho.objetivo?.nivel).then((a) => {
      if (vivo) setAvaliacao(a)
    })
    return () => {
      vivo = false
    }
  }, [baralho.id])

  const nivelAtual = normalizarNivel(baralho.objetivo?.nivel)
  const temSugestao = !!avaliacao && avaliacao.sugestao !== 'manter' && !!avaliacao.nivel
  const nivelUsado = temSugestao && usarSugestao ? avaliacao!.nivel : nivelAtual

  const materialOk = formatar
    ? perguntas.trim().length > 20
    : origem === 'arquivo' || (origem === 'texto' ? texto.trim().length > 40 : assunto.trim().length > 3)
  const continuando = !formatar && origem === 'arquivo' && continuar
  const instrucao = useMemo(
    () =>
      formatar
        ? montarInstrucaoFormatacao({ texto: perguntas, baralho })
        : continuando
          ? montarMaisDoMaterial({ baralho, mistura })
          : montarInstrucao({
            origem,
            texto,
            assunto,
            quantidade,
            mistura,
            baralho: {
              titulo: baralho.titulo,
              temas: baralho.temas,
              objetivo: baralho.objetivo && nivelUsado ? { ...baralho.objetivo, nivel: nivelUsado } : baralho.objetivo,
              cartoes: baralho.cartoes,
            },
            temaPrioritario: temaId,
          }),
    [formatar, continuando, perguntas, origem, texto, assunto, quantidade, mistura, baralho, temaId, nivelUsado],
  )
  const fontePadrao = formatar
    ? 'Perguntas próprias'
    : origem === 'arquivo' ? 'Arquivo' : origem === 'texto' ? 'Texto colado' : 'Gerado por IA'
  const comObjetivo = !!baralho.objetivo

  const copiar = async (conteudo: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setCopiado(qual)
      evento('ia_copiado', { qual, origem, com_objetivo: comObjetivo, versao_instrucao: VERSAO_INSTRUCAO })
    } catch {
      setCopiado('erro')
    }
  }

  /** Lê uma resposta da IA (a primeira ou uma correção). Devolve o erro, se houver. */
  const lerTexto = (texto: string): string | null => {
    try {
      const dados = extrairJson(texto)
      const r = lerResposta(dados, baralho, fontePadrao)
      const exemplo = new Set(EXEMPLOS.cartoes.map((c) => ('frente' in c ? c.frente : c.titulo)))
      if (r.cartoes.every((c) => exemplo.has('frente' in c.cartao ? c.cartao.frente : c.cartao.titulo)))
        throw new Error('Você colou a instrução. Cole a resposta que a IA deu.')
      const fora = (dados as { naoConvertidos?: unknown })?.naoConvertidos
      if (Array.isArray(fora)) setNaoConvertidos((ant) => [...ant, ...fora.filter((x): x is string => typeof x === 'string')])
      // Uma resposta de correção soma-se aos cartões já lidos.
      setLida((ant) => {
        if (!ant) return r
        const temas = [...ant.temasNovos]
        for (const t of r.temasNovos) if (!temas.some((x) => x.id === t.id)) temas.push(t)
        return { temasNovos: temas, cartoes: [...ant.cartoes.filter((c) => !c.erros.length), ...r.cartoes] }
      })
      evento('ia_resposta_lida', { cartoes: r.cartoes.length, com_erro: r.cartoes.filter((c) => c.erros.length).length, versao_instrucao: VERSAO_INSTRUCAO, formatar, ...contarTipos(r.cartoes.map((c) => c.cartao)) })
      return null
    } catch (e) {
      evento('ia_resposta_invalida')
      return (e as Error).message
    }
  }

  const ler = () => {
    const erro = lerTexto(resposta)
    // Resposta sem JSON com perguntas (quantos cartões, mande o arquivo): não é erro, é a conversa seguindo.
    const perguntou = !!erro && parecePerguntas(resposta)
    if (perguntou) evento('ia_perguntas', { origem })
    setIaPerguntou(perguntou)
    setErroLeitura(perguntou ? '' : erro ?? '')
    if (erro) return
    setResposta('')
    conf.abrir()
  }

  const validos = lida?.cartoes.filter((c) => !c.erros.length) ?? []
  const comErro = lida?.cartoes.filter((c) => c.erros.length) ?? []
  const escolhidos = validos.filter((c) => !desmarcados.has(c.cartao.id))
  const alternar = (id: string) =>
    setDesmarcados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const adicionar = async () => {
    if (!lida || !escolhidos.length) return
    setSalvando(true)
    evento('ia_cartoes_salvos', { cartoes: escolhidos.length, desmarcados: validos.length - escolhidos.length, com_objetivo: comObjetivo, versao_instrucao: VERSAO_INSTRUCAO })
    const usados = new Set(escolhidos.map((c) => c.cartao.tema))
    const temasNovos = lida.temasNovos.filter((t) => usados.has(t.id) && !baralho.temas.some((x) => x.id === t.id))
    await adicionarCartoes(baralho, escolhidos.map((c) => c.cartao), temasNovos)
    // Criar cartões com IA guarda uma folga da ofensiva (uma por dia, até 2).
    const folgas = await ganharFolga('ia').catch(() => null)
    if (folgas !== null) evento('folga_ganha', { motivo: 'ia' })
    nav.mudou()
    const criados = `${escolhidos.length} ${escolhidos.length === 1 ? 'cartão criado' : 'cartões criados'}.`
    nav.avisar({ texto: folgas !== null ? `${criados} +1 folga guardada (${folgas} de ${MAX_FOLGAS}).` : criados })
    conf.fechar(nav.voltar)
  }

  return (
    <main class="tela ia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={() => (conf.conferindo ? conf.fechar() : nav.voltar())}>←</button>
        <h1 class="titulo-barra">{conf.conferindo ? 'Confira os cartões' : 'Criar com IA'}</h1>
        <span />
      </header>

      {conf.conferindo && lida ? (
        <Conferencia
          validos={validos}
          comErro={comErro}
          naoConvertidos={naoConvertidos}
          desmarcados={desmarcados}
          alternar={alternar}
          nivel={formatar ? undefined : nivelUsado}
          copiarCorrecao={() => copiar(montarCorrecao(comErro.map((c) => ({ id: c.idIA, erros: c.erros }))), 'correcao')}
          correcaoCopiada={copiado === 'correcao'}
          lerCorrecao={lerTexto}
          rotuloSalvar={`Salvar ${escolhidos.length} ${escolhidos.length === 1 ? 'cartão' : 'cartões'}`}
          podeSalvar={!!escolhidos.length && !salvando}
          salvar={adicionar}
          descartar={() => {
            evento('ia_cartoes_descartados', { onde: 'criar', cartoes: validos.length, com_erro: comErro.length })
            conf.fechar(() => { setLida(null); setNaoConvertidos([]); setDesmarcados(new Set()) })
          }}
        />
      ) : (
        <>

      {!comObjetivo && (
        <p class="dica centro">
          <button class="link" onClick={() => nav.ir({ nome: 'config', id: baralho.id })}>
            Definir objetivo
          </button>
        </p>
      )}

      {temSugestao && (
        <section class="bloco sugestao-nivel" aria-live="polite">
          <p class="sugestao-titulo">
            {avaliacao!.sugestao === 'descer'
              ? 'Vamos tentar algo mais fácil?'
              : 'Você está indo bem. Vamos nos aprofundar e subir de nível?'}
          </p>
          <p class="dica">
            Você acertou {Math.round(avaliacao!.taxaAcerto * 100)}% das últimas {avaliacao!.amostra} respostas. Os próximos cartões vão para{' '}
            <strong>{infoNivel(avaliacao!.nivel)?.nome}</strong>
            {usarSugestao ? '' : ` (em vez de ${infoNivel(nivelAtual)?.nome})`}.
          </p>
          <div class="acoes-sugestao">
            <button class="btn principal" onClick={() => setUsarSugestao(!usarSugestao)}>
              {usarSugestao
                ? `Manter ${infoNivel(nivelAtual)?.nome ?? 'o nível atual'}`
                : avaliacao!.sugestao === 'descer'
                  ? 'Sim, mais fácil'
                  : 'Sim, subir de nível'}
            </button>
          </div>
        </section>
      )}

      <section class="bloco passo">
        <h2><span class="num-passo">1</span> Material</h2>
        <div class="segmentado" role="radiogroup" aria-label="Modo">
          <button role="radio" aria-checked={!formatar} class={!formatar ? 'ativo' : ''} onClick={() => setFormatar(false)}>
            Criar do zero
          </button>
          <button role="radio" aria-checked={formatar} class={formatar ? 'ativo' : ''} onClick={() => setFormatar(true)}>
            Já tenho as perguntas
          </button>
        </div>
        {formatar ? (
          <label class="campo">
            Perguntas e respostas
            <textarea
              rows={8}
              value={perguntas}
              placeholder={'Cole aqui, em qualquer formato:\nQual a unidade de força? N\nP: O que é inércia? R: resistência à mudança de movimento'}
              onInput={(e) => setPerguntas((e.target as HTMLTextAreaElement).value)}
            />
          </label>
        ) : (
          <>
        <div class="segmentado" role="radiogroup" aria-label="Material">
          {(['arquivo', 'texto', 'tema'] as Origem[]).map((o) => (
            <button role="radio" aria-checked={origem === o} class={origem === o ? 'ativo' : ''} onClick={() => setOrigem(o)}>
              {o === 'arquivo' ? 'PDF ou Imagem' : o === 'texto' ? 'Texto' : 'Assunto'}
            </button>
          ))}
        </div>
        {origem === 'arquivo' && (
          <>
            {baralho.cartoes.length > 0 && (
              <div class="segmentado" role="radiogroup" aria-label="Conversa com a IA">
                <button role="radio" aria-checked={!continuar} class={!continuar ? 'ativo' : ''} onClick={() => setContinuar(false)}>
                  Arquivo novo
                </button>
                <button role="radio" aria-checked={continuar} class={continuar ? 'ativo' : ''} onClick={() => setContinuar(true)}>
                  Mesma conversa
                </button>
              </div>
            )}
          </>
        )}
        {origem === 'texto' && (
          <label class="campo">
            Texto
            <textarea rows={6} value={texto} placeholder="Cole aqui o resumo ou trecho" onInput={(e) => setTexto((e.target as HTMLTextAreaElement).value)} />
          </label>
        )}
        {origem === 'tema' && (
          <label class="campo">
            Assunto
            <input class="texto" value={assunto} placeholder="Leis de Newton" onInput={(e) => setAssunto((e.target as HTMLInputElement).value)} />
          </label>
        )}
        <div class="linha">
          {origem !== 'arquivo' && (
            <label class="campo">
              Cartões
              <select value={quantidade} onChange={(e) => setQuantidade(Number((e.target as HTMLSelectElement).value))}>
                {[10, 20, 40].map((n) => (
                  <option value={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          <label class="campo">
            Tipo
            <select value={mistura} onChange={(e) => setMistura((e.target as HTMLSelectElement).value as Mistura)}>
              <option value="misto">Tudo</option>
              <option value="teoria">Só teoria</option>
              <option value="calculo">Só cálculo</option>
            </select>
          </label>
        </div>
          </>
        )}
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">2</span> Peça à IA</h2>
        {origem === 'arquivo' && !formatar ? <ComoAnexar continuar={continuando} /> : <p class="dica">Copie a instrução e cole na IA.</p>}
        <button class="btn principal" disabled={!materialOk} onClick={() => copiar(instrucao, continuando ? 'mais' : 'instrucao')}>
          {copiado === (continuando ? 'mais' : 'instrucao') ? (continuando ? '✓ Pedido copiado' : '✓ Instrução copiada') : continuando ? 'Copiar pedido' : 'Copiar instrução'}
        </button>
        <AbrirIA />
        {copiado === 'erro' && (
          <>
            <p class="resultado erro" role="alert">
              Não deu para copiar. Selecione o texto abaixo e copie.
            </p>
            <textarea class="instrucao" rows={8} readOnly value={instrucao} />
          </>
        )}
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">3</span> Cole a resposta</h2>
        <textarea rows={6} value={resposta} placeholder="Cole aqui a resposta da IA" onInput={(e) => setResposta((e.target as HTMLTextAreaElement).value)} />
        <button class="btn principal" disabled={!resposta.trim()} onClick={ler}>
          Criar cartões
        </button>
        {iaPerguntou && (
          <p class="dica" role="status">
            A IA fez perguntas. Responda lá e cole aqui a resposta final.
          </p>
        )}
        {erroLeitura && (
          <p class="resultado erro" role="alert">
            ✕ {erroLeitura}
          </p>
        )}
      </section>

        {lida && (
          <button class="btn secundario" onClick={conf.abrir}>
            Ver {validos.length} {validos.length === 1 ? 'cartão lido' : 'cartões lidos'}
          </button>
        )}
        </>
      )}
    </main>
  )
}
