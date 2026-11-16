import { useMemo, useRef, useState } from 'preact/hooks'
import { salvar } from '../core/baralhos'
import { EXEMPLOS, montarCorrecao, montarInstrucao, type Mistura, type Origem } from '../core/ia/instrucao'
import { extrairJson, lerResposta, type RespostaLida } from '../core/ia/resposta'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { AbrirIA } from './AbrirIA'
import { Conteudo } from './Revisar'


/** Criar cartões com IA: copia a instrução, cola na IA, cola a resposta aqui, confere e salva. */
export function CriarComIA({ baralho, assuntoInicial, nav }: { baralho: Baralho; assuntoInicial?: string; nav: Navegacao }) {
  // Vindo do fim de uma sessão, já abre no tema em que houve mais dificuldade.
  const [origem, setOrigem] = useState<Origem>(assuntoInicial ? 'tema' : 'pdf')
  const [nomePdf, setNomePdf] = useState('')
  const [paginas, setPaginas] = useState('')
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState(assuntoInicial ? `${assuntoInicial} (${baralho.titulo})` : '')
  const [quantidade, setQuantidade] = useState(20)
  const [mistura, setMistura] = useState<Mistura>('misto')
  const [copiado, setCopiado] = useState('')
  const [resposta, setResposta] = useState('')
  const [lida, setLida] = useState<RespostaLida | null>(null)
  const [erroLeitura, setErroLeitura] = useState('')
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const previa = useRef<HTMLElement>(null)

  const materialOk = origem === 'pdf' || (origem === 'texto' ? texto.trim().length > 40 : assunto.trim().length > 3)
  const instrucao = useMemo(
    () => montarInstrucao({ origem, nomePdf, paginas, texto, assunto, quantidade, mistura, baralho: { titulo: baralho.titulo, temas: baralho.temas } }),
    [origem, nomePdf, paginas, texto, assunto, quantidade, mistura, baralho],
  )
  const fontePadrao = origem === 'pdf' ? nomePdf.trim() || undefined : origem === 'texto' ? 'Texto colado' : 'Gerado por IA'

  const copiar = async (conteudo: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setCopiado(qual)
    } catch {
      setCopiado('erro')
    }
  }

  const ler = () => {
    setErroLeitura('')
    try {
      const r = lerResposta(extrairJson(resposta), baralho, fontePadrao)
      const exemplo = new Set(EXEMPLOS.cartoes.map((c) => ('frente' in c ? c.frente : c.titulo)))
      if (r.cartoes.every((c) => exemplo.has('frente' in c.cartao ? c.cartao.frente : c.cartao.titulo)))
        throw new Error('Você colou a instrução. Cole a resposta que a IA deu.')
      // Uma resposta de correção soma-se aos cartões já lidos.
      setLida((ant) => {
        if (!ant) return r
        const temas = [...ant.temasNovos]
        for (const t of r.temasNovos) if (!temas.some((x) => x.id === t.id)) temas.push(t)
        return { temasNovos: temas, cartoes: [...ant.cartoes.filter((c) => !c.erros.length), ...r.cartoes] }
      })
      setResposta('')
      setTimeout(() => previa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      setErroLeitura((e as Error).message)
    }
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
    const usados = new Set(escolhidos.map((c) => c.cartao.tema))
    const temasNovos = lida.temasNovos.filter((t) => usados.has(t.id) && !baralho.temas.some((x) => x.id === t.id))
    await salvar({ ...baralho, temas: [...baralho.temas, ...temasNovos], cartoes: [...baralho.cartoes, ...escolhidos.map((c) => c.cartao)] })
    nav.mudou()
    nav.avisar({ texto: `${escolhidos.length} ${escolhidos.length === 1 ? 'cartão criado' : 'cartões criados'}.` })
    nav.voltar()
  }

  return (
    <main class="tela ia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <h1 class="titulo-barra">Criar com IA</h1>
        <span />
      </header>

      <section class="bloco passo">
        <h2><span class="num-passo">1</span> Material</h2>
        <div class="segmentado" role="radiogroup" aria-label="Material">
          {(['pdf', 'texto', 'tema'] as Origem[]).map((o) => (
            <button role="radio" aria-checked={origem === o} class={origem === o ? 'ativo' : ''} onClick={() => setOrigem(o)}>
              {o === 'pdf' ? 'PDF' : o === 'texto' ? 'Texto' : 'Assunto'}
            </button>
          ))}
        </div>
        {origem === 'pdf' && (
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
          <label class="campo">
            Cartões
            <select value={quantidade} onChange={(e) => setQuantidade(Number((e.target as HTMLSelectElement).value))}>
              {[10, 20, 40].map((n) => (
                <option value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label class="campo">
            Tipo
            <select value={mistura} onChange={(e) => setMistura((e.target as HTMLSelectElement).value as Mistura)}>
              <option value="misto">Tudo</option>
              <option value="teoria">Só teoria</option>
              <option value="calculo">Só cálculo</option>
            </select>
          </label>
        </div>
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">2</span> Peça à IA</h2>
        <p class="dica">
          Copie a instrução e cole na IA{origem === 'pdf' ? ', junto com o PDF' : ''}.
        </p>
        <button class="btn principal" disabled={!materialOk} onClick={() => copiar(instrucao, 'instrucao')}>
          {copiado === 'instrucao' ? '✓ Instrução copiada' : 'Copiar instrução'}
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
        {erroLeitura && (
          <p class="resultado erro" role="alert">
            ✕ {erroLeitura}
          </p>
        )}
      </section>

      {lida && (
        <section class="bloco passo" aria-live="polite" ref={previa}>
          <h2><span class="num-passo">4</span> Confira</h2>
          <p>
            {validos.length} {validos.length === 1 ? 'cartão pronto' : 'cartões prontos'}
            {comErro.length > 0 && <>, {comErro.length} com problema</>}.
          </p>

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
          <button class="btn principal" disabled={!escolhidos.length || salvando} onClick={adicionar}>
            Salvar {escolhidos.length} {escolhidos.length === 1 ? 'cartão' : 'cartões'}
          </button>
          <button class="btn terciario" onClick={() => setLida(null)}>
            Descartar
          </button>
        </section>
      )}
    </main>
  )
}
