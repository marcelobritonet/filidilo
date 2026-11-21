import { useMemo, useState } from 'preact/hooks'
import { novoId, salvar } from '../core/baralhos'
import { ganharFolga, MAX_FOLGAS } from '../core/ofensiva'
import { montarCorrecao, montarInstrucaoFormatacao } from '../core/ia/instrucao'
import { EXEMPLO_PLANO, montarPlano } from '../core/ia/plano'
import { extrairJson, lerPlano, parecePerguntas, type PlanoLido } from '../core/ia/resposta'
import { evento } from '../core/telemetria'
import { NIVEIS, type Baralho, type Cartao, type Nivel, type Objetivo } from '../core/types'
import type { Navegacao } from './App'
import { AbrirIA } from './AbrirIA'
import { Conferencia, useConferencia } from './Conferencia'

type Material = 'pdf' | 'texto'

/** Texto de partida do cartão, para reconhecer cartões copiados da instrução de exemplo. */
const textoBase = (c: Cartao) => (c.tipo === 'calculo' ? c.titulo : c.frente)
const DO_EXEMPLO = new Set(EXEMPLO_PLANO.cartoes.map(textoBase))

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const temasDe = (lista: { cartao: Cartao }[]) => new Set(lista.map((c) => c.cartao.tema))

/** Dados do baralho que a pessoa pode ajustar antes de criar. */
interface Edicao {
  titulo: string
  resumo: string
  nivel: Nivel | ''
}

/**
 * Aprender uma coisa nova hoje: a IA planeja o baralho (objetivo, nível, temas e cartões)
 * numa resposta só; o app mostra o que veio e cria o baralho.
 */
export function Aprender({ pedido: pedidoInicial = '', nav }: { pedido?: string; nav: Navegacao }) {
  const [pedido, setPedido] = useState(pedidoInicial)
  // Modo "formatar": a pessoa já tem perguntas e respostas e a IA só as converte num baralho novo.
  const [formatar, setFormatar] = useState(false)
  const [perguntas, setPerguntas] = useState('')
  const [nome, setNome] = useState('')
  const [naoConvertidos, setNaoConvertidos] = useState<string[]>([])
  const [nivelPedido, setNivelPedido] = useState<Nivel | ''>('')
  const [materialAberto, setMaterialAberto] = useState(false)
  const [material, setMaterial] = useState<Material>('pdf')
  const [nomePdf, setNomePdf] = useState('')
  const [paginas, setPaginas] = useState('')
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState('')
  const [falha, setFalha] = useState<{ qual: string; texto: string } | null>(null)
  const [resposta, setResposta] = useState('')
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const [lido, setLido] = useState<PlanoLido | null>(null)
  const [inicial, setInicial] = useState<Edicao | null>(null)
  const [cfg, setCfg] = useState<Edicao>({ titulo: '', resumo: '', nivel: '' })
  const [editando, setEditando] = useState(false)
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)

  // O material só entra na instrução se estiver preenchido.
  const origemMaterial: Material | undefined = !materialAberto
    ? undefined
    : material === 'pdf'
      ? 'pdf'
      : texto.trim().length > 40
        ? 'texto'
        : undefined
  const instrucao = useMemo(
    () =>
      formatar
        ? montarInstrucaoFormatacao({ texto: perguntas, novo: { titulo: nome } })
        : montarPlano({ pedido, nivel: nivelPedido || undefined, origem: origemMaterial, nomePdf, paginas, texto }),
    [formatar, perguntas, nome, pedido, nivelPedido, origemMaterial, nomePdf, paginas, texto],
  )
  const modo = formatar ? 'formatar' : 'aprender'
  // Sem o nível escolhido a instrução não sai: é ele que define a dificuldade dos cartões.
  // Com perguntas prontas o nível não é pedido: a IA só converte, e ele pode ser definido em "Editar" ou depois.
  const pedidoOk = formatar ? perguntas.trim().length > 20 : pedido.trim().length >= 3 && !!nivelPedido
  const mudarModo = (f: boolean) => {
    if (f === formatar) return
    setFormatar(f)
    setCopiado('')
    evento('aprender_modo', { modo: f ? 'formatar' : 'aprender' })
  }

  const copiar = async (conteudo: string, qual: 'instrucao' | 'correcao') => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setFalha(null)
      setCopiado(qual)
      evento('ia_copiado', { qual: qual === 'instrucao' ? (formatar ? 'formatacao' : 'plano') : 'correcao', origem: formatar ? 'perguntas' : (origemMaterial ?? 'tema'), modo })
    } catch {
      setCopiado('')
      setFalha({ qual, texto: conteudo })
    }
  }

  const conf = useConferencia()

  /** Lê uma resposta da IA (a primeira ou uma correção). Devolve o aviso, se a leitura não deu certo. */
  const lerTexto = (texto: string): { texto: string; erro: boolean } | null => {
    let dados: unknown
    try {
      dados = extrairJson(texto)
    } catch (e) {
      if (parecePerguntas(texto)) {
        evento('aprender_perguntas')
        return { texto: 'A IA fez perguntas. Responda lá e cole aqui a resposta final.', erro: false }
      }
      evento('aprender_resposta_invalida')
      return { texto: (e as Error).message, erro: true }
    }
    try {
      const r = formatar ? lerPlano(dados, nome.trim() || 'Minhas perguntas', 'Perguntas próprias') : lerPlano(dados, pedido)
      if (r.cartoes.length && r.cartoes.every((c) => DO_EXEMPLO.has(textoBase(c.cartao))))
        throw new Error('Você colou a instrução. Cole a resposta que a IA deu.')
      evento('aprender_resposta_lida', {
        temas: r.temasNovos.length,
        cartoes: r.cartoes.length,
        com_erro: r.cartoes.filter((c) => c.erros.length).length,
        nivel: r.baralho.objetivo?.nivel ?? 'nenhum',
        com_baralho: !!r.baralho.objetivo,
        modo,
      })
      const fora = (dados as { naoConvertidos?: unknown })?.naoConvertidos
      if (formatar && Array.isArray(fora)) setNaoConvertidos((ant) => [...ant, ...fora.filter((x): x is string => typeof x === 'string')])
      if (!lido) {
        // O nível é o que a pessoa escolheu, não o que a IA devolveu.
        const ini: Edicao = { titulo: r.baralho.titulo, resumo: r.baralho.objetivo?.resumo ?? '', nivel: formatar ? '' : nivelPedido }
        setInicial(ini)
        setCfg(ini)
        setLido(r)
      } else {
        // Resposta de correção: soma os cartões corrigidos aos que já estavam prontos.
        const temas = [...lido.temasNovos]
        for (const t of r.temasNovos) if (!temas.some((x) => x.id === t.id)) temas.push(t)
        setLido({ ...lido, temasNovos: temas, cartoes: [...lido.cartoes.filter((c) => !c.erros.length), ...r.cartoes] })
      }
      return null
    } catch (e) {
      evento('aprender_resposta_invalida')
      return { texto: (e as Error).message, erro: true }
    }
  }

  const montar = () => {
    const a = lerTexto(resposta)
    setAviso(a)
    if (a) return
    setResposta('')
    conf.abrir()
  }

  const validos = lido?.cartoes.filter((c) => !c.erros.length) ?? []
  const comErro = lido?.cartoes.filter((c) => c.erros.length) ?? []
  const escolhidos = validos.filter((c) => !desmarcados.has(c.cartao.id))
  const alternar = (id: string) =>
    setDesmarcados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const nivelNome = NIVEIS.find((n) => n.valor === cfg.nivel)?.nome

  const criar = async () => {
    if (!lido || !escolhidos.length || !cfg.titulo.trim()) return
    setSalvando(true)
    const base = inicial ?? cfg
    const campos = [cfg.titulo.trim() !== base.titulo, cfg.resumo.trim() !== base.resumo, cfg.nivel !== base.nivel].filter(Boolean).length
    const usados = temasDe(escolhidos)
    const objetivo: Objetivo = {
      pedido: formatar ? undefined : pedido.trim() || undefined,
      resumo: cfg.resumo.trim() || undefined,
      nivel: cfg.nivel || undefined,
      foco: lido.baralho.objetivo?.foco,
      evitar: lido.baralho.objetivo?.evitar,
    }
    const b: Baralho = {
      id: novoId(cfg.titulo.trim()),
      titulo: cfg.titulo.trim(),
      versao: 1,
      objetivo: Object.values(objetivo).some((v) => v !== undefined) ? objetivo : undefined,
      temas: lido.temasNovos.filter((t) => usados.has(t.id)),
      cartoes: escolhidos.map((c) => c.cartao),
    }
    if (campos) evento('aprender_config_editada', { campos })
    evento('aprender_baralho_criado', {
      temas: b.temas.length,
      cartoes: b.cartoes.length,
      desmarcados: validos.length - escolhidos.length,
      nivel: cfg.nivel || 'nenhum',
      modo,
    })
    await salvar(b)
    // Criar baralho guarda uma folga da ofensiva (uma por dia, até 2).
    const folgas = await ganharFolga('baralho').catch(() => null)
    if (folgas !== null) {
      evento('folga_ganha', { motivo: 'baralho' })
      nav.avisar({ texto: `Baralho criado. +1 folga guardada (${folgas} de ${MAX_FOLGAS}).` })
    }
    nav.mudou()
    conf.fechar(() => nav.substituir({ nome: 'baralho', id: b.id }))
  }

  return (
    <main class="tela ia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={() => (conf.conferindo ? conf.fechar() : nav.voltar())}>←</button>
        <h1 class="titulo-barra">{conf.conferindo ? 'Confira os cartões' : 'Aprender'}</h1>
        <span />
      </header>

      {conf.conferindo && lido ? (
        <Conferencia
          topo={
            <>
              <p>
                <strong>{cfg.titulo || 'Sem título'}</strong> · {plural(temasDe(validos).size, 'tema', 'temas')}
              </p>
              <p class="dica">
                Objetivo: {cfg.resumo || '—'} · Nível: {nivelNome ?? '—'}
              </p>
              <button class="btn terciario compacto" onClick={() => setEditando(!editando)}>
                {editando ? 'Fechar edição' : 'Editar'}
              </button>
              {editando && (
                <>
                  <label class="campo">
                    Título
                    <input class="texto" maxLength={40} value={cfg.titulo} onInput={(e) => setCfg({ ...cfg, titulo: (e.target as HTMLInputElement).value })} />
                  </label>
                  <label class="campo">
                    Objetivo
                    <input class="texto" maxLength={160} value={cfg.resumo} onInput={(e) => setCfg({ ...cfg, resumo: (e.target as HTMLInputElement).value })} />
                  </label>
                  <label class="campo">
                    Quanto você já sabe
                    <select value={cfg.nivel} onChange={(e) => setCfg({ ...cfg, nivel: (e.target as HTMLSelectElement).value as Nivel | '' })}>
                      <option value="">—</option>
                      {NIVEIS.map((n) => (
                        <option value={n.valor}>{n.nome}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </>
          }
          validos={validos}
          comErro={comErro}
          naoConvertidos={naoConvertidos}
          desmarcados={desmarcados}
          alternar={alternar}
          nivel={cfg.nivel}
          copiarCorrecao={() => copiar(montarCorrecao(comErro.map((c) => ({ id: c.idIA, erros: c.erros }))), 'correcao')}
          correcaoCopiada={copiado === 'correcao'}
          falhaCorrecao={falha?.qual === 'correcao' ? falha.texto : undefined}
          lerCorrecao={(t) => lerTexto(t)?.texto ?? null}
          rotuloSalvar={`Criar baralho com ${plural(escolhidos.length, 'cartão', 'cartões')}`}
          podeSalvar={!!escolhidos.length && !!cfg.titulo.trim() && !salvando}
          salvar={criar}
        />
      ) : (
        <>

      <section class="bloco passo">
        <h2><span class="num-passo">1</span> {formatar ? 'Suas perguntas' : 'O que você quer aprender?'}</h2>
        <div class="segmentado" role="radiogroup" aria-label="Modo">
          <button role="radio" aria-checked={!formatar} class={!formatar ? 'ativo' : ''} onClick={() => mudarModo(false)}>
            Quero aprender
          </button>
          <button role="radio" aria-checked={formatar} class={formatar ? 'ativo' : ''} onClick={() => mudarModo(true)}>
            Já tenho as perguntas
          </button>
        </div>
        {formatar ? (
          <>
            <label class="campo">
              Nome do baralho (opcional)
              <input class="texto" maxLength={40} value={nome} placeholder="Ex.: Física 1 · prova 2" onInput={(e) => setNome((e.target as HTMLInputElement).value)} />
            </label>
            <label class="campo">
              Perguntas e respostas
              <textarea
                rows={8}
                value={perguntas}
                placeholder={'Cole aqui, em qualquer formato:\nQual a unidade de força? N\nP: O que é inércia? R: resistência à mudança de movimento'}
                onInput={(e) => setPerguntas((e.target as HTMLTextAreaElement).value)}
              />
            </label>
          </>
        ) : (
          <input class="texto" aria-label="O que você quer aprender" value={pedido} placeholder="Ex.: espanhol para viajar" onInput={(e) => setPedido((e.target as HTMLInputElement).value)} />
        )}
        {!formatar && (
          <>
            <p class="rotulo">Quanto você já sabe sobre isso?</p>
            <div class="opcoes-nivel" role="radiogroup" aria-label="Quanto você já sabe">
              {NIVEIS.map((n) => (
                <button
                  role="radio"
                  aria-checked={nivelPedido === n.valor}
                  class={`opcao-nivel ${nivelPedido === n.valor ? 'ativo' : ''}`}
                  onClick={() => {
                    setNivelPedido(n.valor)
                    evento('aprender_nivel', { nivel: n.valor })
                  }}
                >
                  {n.pedido}
                </button>
              ))}
            </div>
          </>
        )}
        {formatar ? null : !materialAberto ? (
          <button class="link" onClick={() => { setMaterialAberto(true); evento('aprender_material', { origem: material }) }}>
            Tenho um material (PDF ou texto)
          </button>
        ) : (
          <>
            <div class="segmentado" role="radiogroup" aria-label="Material">
              {(['pdf', 'texto'] as Material[]).map((o) => (
                <button role="radio" aria-checked={material === o} class={material === o ? 'ativo' : ''} onClick={() => { setMaterial(o); evento('aprender_material', { origem: o }) }}>
                  {o === 'pdf' ? 'PDF' : 'Texto'}
                </button>
              ))}
            </div>
            {material === 'pdf' ? (
              <div class="linha">
                <label class="campo">
                  Nome do PDF
                  <input class="texto" value={nomePdf} placeholder="Aula 4" onInput={(e) => setNomePdf((e.target as HTMLInputElement).value)} />
                </label>
                <label class="campo">
                  Páginas
                  <input class="texto" value={paginas} placeholder="todas" onInput={(e) => setPaginas((e.target as HTMLInputElement).value)} />
                </label>
              </div>
            ) : (
              <label class="campo">
                Texto
                <textarea rows={6} value={texto} placeholder="Cole aqui o resumo ou trecho" onInput={(e) => setTexto((e.target as HTMLTextAreaElement).value)} />
              </label>
            )}
          </>
        )}
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">2</span> Peça à IA</h2>
        <p class="dica">Copie a instrução e cole na IA{origemMaterial === 'pdf' && !formatar ? ', junto com o PDF' : ''}.</p>
        {!pedidoOk && (
          <p class="dica">{formatar ? 'Cole suas perguntas e respostas no passo 1.' : 'Escreva o que quer aprender e escolha quanto você já sabe, no passo 1.'}</p>
        )}
        <button class="btn principal" disabled={!pedidoOk} onClick={() => copiar(instrucao, 'instrucao')}>
          {copiado === 'instrucao' ? '✓ Instrução copiada' : 'Copiar instrução'}
        </button>
        <AbrirIA />
        {falha?.qual === 'instrucao' && (
          <>
            <p class="resultado erro" role="alert">Não deu para copiar. Selecione o texto abaixo e copie.</p>
            <textarea class="instrucao" rows={8} readOnly value={falha.texto} />
          </>
        )}
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">3</span> Cole a resposta</h2>
        <textarea rows={6} value={resposta} placeholder="Cole aqui a resposta da IA" onInput={(e) => setResposta((e.target as HTMLTextAreaElement).value)} />
        <button class="btn principal" disabled={!resposta.trim()} onClick={montar}>
          Montar baralho
        </button>
        {aviso && (
          <p class={aviso.erro ? 'resultado erro' : 'dica'} role={aviso.erro ? 'alert' : 'status'}>
            {aviso.erro ? `✕ ${aviso.texto}` : aviso.texto}
          </p>
        )}
      </section>

        {lido && (
          <button class="btn secundario" onClick={conf.abrir}>
            Ver {plural(validos.length, 'cartão lido', 'cartões lidos')}
          </button>
        )}
        </>
      )}
    </main>
  )
}
