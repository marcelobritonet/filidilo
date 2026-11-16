import { useMemo, useState } from 'preact/hooks'
import { novoId, salvar } from '../core/baralhos'
import { montarCorrecao } from '../core/ia/instrucao'
import { EXEMPLO_PLANO, montarPlano } from '../core/ia/plano'
import { extrairJson, lerPlano, parecePerguntas, type PlanoLido } from '../core/ia/resposta'
import { evento } from '../core/telemetria'
import { NIVEIS, type Baralho, type Cartao, type Nivel, type Objetivo } from '../core/types'
import type { Navegacao } from './App'
import { AbrirIA } from './AbrirIA'
import { Conteudo } from './Revisar'

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
    () => montarPlano({ pedido, origem: origemMaterial, nomePdf, paginas, texto }),
    [pedido, origemMaterial, nomePdf, paginas, texto],
  )
  const pedidoOk = pedido.trim().length >= 3

  const copiar = async (conteudo: string, qual: 'instrucao' | 'correcao') => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setFalha(null)
      setCopiado(qual)
      evento('ia_copiado', { qual: qual === 'instrucao' ? 'plano' : 'correcao', origem: origemMaterial ?? 'tema' })
    } catch {
      setCopiado('')
      setFalha({ qual, texto: conteudo })
    }
  }

  const montar = () => {
    setAviso(null)
    let dados: unknown
    try {
      dados = extrairJson(resposta)
    } catch (e) {
      if (parecePerguntas(resposta)) {
        evento('aprender_perguntas')
        setAviso({ texto: 'A IA fez perguntas. Responda lá e cole aqui a resposta final.', erro: false })
      } else {
        evento('aprender_resposta_invalida')
        setAviso({ texto: (e as Error).message, erro: true })
      }
      return
    }
    try {
      const r = lerPlano(dados, pedido)
      if (r.cartoes.length && r.cartoes.every((c) => DO_EXEMPLO.has(textoBase(c.cartao))))
        throw new Error('Você colou a instrução. Cole a resposta que a IA deu.')
      evento('aprender_resposta_lida', {
        temas: r.temasNovos.length,
        cartoes: r.cartoes.length,
        com_erro: r.cartoes.filter((c) => c.erros.length).length,
        nivel: r.baralho.objetivo?.nivel ?? 'nenhum',
        com_baralho: !!r.baralho.objetivo,
      })
      if (!lido) {
        const ini: Edicao = { titulo: r.baralho.titulo, resumo: r.baralho.objetivo?.resumo ?? '', nivel: r.baralho.objetivo?.nivel ?? '' }
        setInicial(ini)
        setCfg(ini)
        setLido(r)
      } else {
        // Resposta de correção: soma os cartões corrigidos aos que já estavam prontos.
        const temas = [...lido.temasNovos]
        for (const t of r.temasNovos) if (!temas.some((x) => x.id === t.id)) temas.push(t)
        setLido({ ...lido, temasNovos: temas, cartoes: [...lido.cartoes.filter((c) => !c.erros.length), ...r.cartoes] })
      }
      setResposta('')
    } catch (e) {
      evento('aprender_resposta_invalida')
      setAviso({ texto: (e as Error).message, erro: true })
    }
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
      pedido: pedido.trim() || undefined,
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
    })
    await salvar(b)
    nav.mudou()
    nav.substituir({ nome: 'baralho', id: b.id })
  }

  return (
    <main class="tela ia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <h1 class="titulo-barra">Aprender</h1>
        <span />
      </header>

      <section class="bloco passo">
        <h2><span class="num-passo">1</span> O que você quer aprender?</h2>
        <input class="texto" aria-label="O que você quer aprender" value={pedido} placeholder="Ex.: espanhol para viajar" onInput={(e) => setPedido((e.target as HTMLInputElement).value)} />
        {!materialAberto ? (
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
        <p class="dica">Copie a instrução e cole na IA{origemMaterial === 'pdf' ? ', junto com o PDF' : ''}.</p>
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
        <section class="bloco passo" aria-live="polite">
          <h2><span class="num-passo">4</span> Confira</h2>
          <p>
            <strong>{cfg.titulo || 'Sem título'}</strong> · {plural(temasDe(validos).size, 'tema', 'temas')} · {plural(validos.length, 'cartão pronto', 'cartões prontos')}
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
                Nível
                <select value={cfg.nivel} onChange={(e) => setCfg({ ...cfg, nivel: (e.target as HTMLSelectElement).value as Nivel | '' })}>
                  <option value="">—</option>
                  {NIVEIS.map((n) => (
                    <option value={n.valor}>{n.nome}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {comErro.length > 0 && (
            <div class="problemas-ia">
              <ul class="problemas">
                {comErro.map((c) => (
                  <li>
                    ✕ {c.idIA}: {c.erros.join('; ')}
                  </li>
                ))}
              </ul>
              <button class="btn secundario" onClick={() => copiar(montarCorrecao(comErro.map((c) => ({ id: c.idIA, erros: c.erros }))), 'correcao')}>
                {copiado === 'correcao' ? '✓ Pedido de correção copiado' : 'Copiar pedido de correção'}
              </button>
              {falha?.qual === 'correcao' && <textarea class="instrucao" rows={6} readOnly value={falha.texto} />}
              <p class="dica">Cole na mesma conversa com a IA e cole a nova resposta no passo 3.</p>
            </div>
          )}

          <ul class="lista-revisao">
            {validos.map((c) => {
              const marcado = !desmarcados.has(c.cartao.id)
              return (
                <li class={`item ${marcado ? 'ok' : ''}`}>
                  <label class="check">
                    <input type="checkbox" checked={marcado} onChange={() => alternar(c.cartao.id)} />
                    Incluir
                  </label>
                  <Conteudo c={c.cartao} />
                </li>
              )
            })}
          </ul>

          <button class="btn principal" disabled={!escolhidos.length || !cfg.titulo.trim() || salvando} onClick={criar}>
            Criar baralho com {plural(escolhidos.length, 'cartão', 'cartões')}
          </button>
        </section>
      )}
    </main>
  )
}
