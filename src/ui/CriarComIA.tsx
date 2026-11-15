import { useMemo, useState } from 'preact/hooks'
import { criar, salvar } from '../core/baralhos'
import { EXEMPLOS, montarCorrecao, montarInstrucao, type Mistura, type Origem } from '../core/ia/instrucao'
import { extrairJson, lerResposta, type RespostaLida } from '../core/ia/resposta'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { Conteudo } from './Revisar'

const LINK_GEMINI = 'https://gemini.google.com/app'
const NOVO = '__novo__'

/** "Criar com IA": monta a instrução, recebe a resposta do Gemini, mostra a prévia e salva. */
export function CriarComIA({ baralhos, baralhoId, nav }: { baralhos: Baralho[]; baralhoId?: string; nav: Navegacao }) {
  const [origem, setOrigem] = useState<Origem>('pdf')
  const [nomePdf, setNomePdf] = useState('')
  const [paginas, setPaginas] = useState('')
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState('')
  const [quantidade, setQuantidade] = useState(20)
  const [mistura, setMistura] = useState<Mistura>('misto')
  const [destinoId, setDestinoId] = useState(baralhoId ?? NOVO)
  const [nomeNovo, setNomeNovo] = useState('')
  const [copiado, setCopiado] = useState('')
  const [resposta, setResposta] = useState('')
  const [lida, setLida] = useState<RespostaLida | null>(null)
  const [erroLeitura, setErroLeitura] = useState('')
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)

  const destino = baralhos.find((b) => b.id === destinoId)
  const destinoBase = destino ?? { id: 'novo', titulo: nomeNovo || 'Novo baralho', versao: 1, temas: [] }
  const materialOk = origem === 'pdf' || (origem === 'texto' ? texto.trim().length > 40 : assunto.trim().length > 3)

  const instrucao = useMemo(
    () => montarInstrucao({ origem, nomePdf, paginas, texto, assunto, quantidade, mistura, baralho: destino ? { titulo: destino.titulo, temas: destino.temas } : undefined }),
    [origem, nomePdf, paginas, texto, assunto, quantidade, mistura, destino],
  )

  const copiar = async (conteudo: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setCopiado(qual)
    } catch {
      setCopiado('erro')
    }
  }

  const fontePadrao = origem === 'pdf' ? nomePdf.trim() || undefined : origem === 'texto' ? 'Texto colado' : 'Gerado pelo Gemini'

  const ler = () => {
    setErroLeitura('')
    try {
      const dados = extrairJson(resposta)
      const r = lerResposta(dados, destinoBase, fontePadrao)
      const frentesExemplo = new Set(EXEMPLOS.cartoes.map((c) => ('frente' in c ? c.frente : c.titulo)))
      if (r.cartoes.every((c) => frentesExemplo.has('frente' in c.cartao ? c.cartao.frente : c.cartao.titulo)))
        throw new Error('Parece que você colou a instrução, não a resposta. Cole no Gemini, espere a resposta e copie a resposta.')
      // Uma segunda resposta (ex.: correções) soma-se aos cartões válidos já lidos.
      setLida((ant) => {
        if (!ant) return r
        const temas = [...ant.temasNovos]
        for (const t of r.temasNovos) if (!temas.some((x) => x.id === t.id)) temas.push(t)
        return { temasNovos: temas, cartoes: [...ant.cartoes.filter((c) => !c.erros.length), ...r.cartoes] }
      })
      setResposta('')
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
    const temasNovos = lida.temasNovos.filter((t) => usados.has(t.id))
    let alvo = destino
    if (!alvo) {
      const nome = nomeNovo.trim() || nomePdf.replace(/\.pdf$/i, '').trim() || assunto.trim() || 'Novo baralho'
      alvo = await criar(nome)
      alvo = { ...alvo, temas: [] } // o tema "Geral" padrão só fica se for usado
      if (usados.has('geral')) alvo.temas = [{ id: 'geral', nome: 'Geral' }]
    }
    const b = await salvar({ ...alvo, temas: [...alvo.temas, ...temasNovos.filter((t) => !alvo!.temas.some((x) => x.id === t.id))], cartoes: [...alvo.cartoes, ...escolhidos.map((c) => c.cartao)] })
    nav.mudou()
    nav.avisar({ texto: `${escolhidos.length} cartões adicionados a “${b.titulo}”.` })
    if (destino) nav.voltar()
    else nav.substituir({ nome: 'baralho', id: b.id })
  }

  return (
    <main class="tela ia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <h1 class="titulo-barra">Criar com IA</h1>
        <span />
      </header>
      <p class="dica">O Gemini cria os cartões a partir do seu material. Você confere tudo antes de salvar.</p>

      <section class="bloco passo">
        <h2><span class="num-passo">1</span> De onde vêm os cartões?</h2>
        <div class="segmentado" role="radiogroup" aria-label="Origem do material">
          {(['pdf', 'texto', 'tema'] as Origem[]).map((o) => (
            <button role="radio" aria-checked={origem === o} class={origem === o ? 'ativo' : ''} onClick={() => setOrigem(o)}>
              {o === 'pdf' ? 'PDF da aula' : o === 'texto' ? 'Texto' : 'Um assunto'}
            </button>
          ))}
        </div>
        {origem === 'pdf' && (
          <>
            <p class="dica">Você vai anexar o PDF lá no Gemini. Aqui é só para a fonte dos cartões.</p>
            <label class="campo">
              Nome do PDF (opcional)
              <input class="texto" value={nomePdf} placeholder="Ex.: Aula 4 - Termodinâmica" onInput={(e) => setNomePdf((e.target as HTMLInputElement).value)} />
            </label>
            <label class="campo">
              Páginas (opcional)
              <input class="texto" value={paginas} placeholder="Ex.: 3-10 (vazio = todas)" onInput={(e) => setPaginas((e.target as HTMLInputElement).value)} />
            </label>
          </>
        )}
        {origem === 'texto' && (
          <label class="campo">
            Cole o texto
            <textarea rows={6} value={texto} placeholder="Resumo, anotações, trecho do livro…" onInput={(e) => setTexto((e.target as HTMLTextAreaElement).value)} />
          </label>
        )}
        {origem === 'tema' && (
          <label class="campo">
            Sobre o que?
            <input class="texto" value={assunto} placeholder="Ex.: Leis de Newton, ensino médio" onInput={(e) => setAssunto((e.target as HTMLInputElement).value)} />
          </label>
        )}
        <div class="linha">
          <label class="campo">
            Quantos cartões
            <select value={quantidade} onChange={(e) => setQuantidade(Number((e.target as HTMLSelectElement).value))}>
              {[10, 20, 40].map((n) => (
                <option value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label class="campo">
            Tipos
            <select value={mistura} onChange={(e) => setMistura((e.target as HTMLSelectElement).value as Mistura)}>
              <option value="misto">Misturados</option>
              <option value="teoria">Só teoria</option>
              <option value="calculo">Só cálculo</option>
            </select>
          </label>
        </div>
        {!baralhoId && (
          <label class="campo">
            Guardar em
            <select value={destinoId} onChange={(e) => setDestinoId((e.target as HTMLSelectElement).value)}>
              <option value={NOVO}>Um baralho novo</option>
              {baralhos.map((b) => (
                <option value={b.id}>{b.titulo}</option>
              ))}
            </select>
          </label>
        )}
        {destinoId === NOVO && (
          <label class="campo">
            Nome do baralho novo
            <input class="texto" value={nomeNovo} placeholder={nomePdf || assunto || 'Ex.: Física 1'} onInput={(e) => setNomeNovo((e.target as HTMLInputElement).value)} />
          </label>
        )}
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">2</span> Peça ao Gemini</h2>
        <ol class="instrucoes">
          <li>Toque em <strong>Copiar instrução</strong>.</li>
          <li>Abra o Gemini{origem === 'pdf' ? ', anexe o PDF (botão +)' : ''} e cole a instrução.</li>
          <li>Quando ele responder, copie a resposta inteira (o ícone de copiar embaixo da resposta).</li>
        </ol>
        <button class="btn principal" disabled={!materialOk} onClick={() => copiar(instrucao, 'instrucao')}>
          {copiado === 'instrucao' ? '✓ Instrução copiada' : 'Copiar instrução'}
        </button>
        <a class="btn secundario" href={LINK_GEMINI} target="_blank" rel="noopener noreferrer">
          Abrir o Gemini
        </a>
        {copiado === 'erro' && (
          <p class="resultado erro" role="alert">
            Não consegui copiar. Toque e segure no texto abaixo para copiar.
          </p>
        )}
        <details>
          <summary>Ver a instrução</summary>
          <textarea class="instrucao" rows={8} readOnly value={instrucao} />
        </details>
      </section>

      <section class="bloco passo">
        <h2><span class="num-passo">3</span> Cole a resposta</h2>
        <textarea rows={6} value={resposta} placeholder="Cole aqui a resposta do Gemini…" onInput={(e) => setResposta((e.target as HTMLTextAreaElement).value)} />
        <button class="btn principal" disabled={!resposta.trim()} onClick={ler}>
          Ler cartões
        </button>
        {erroLeitura && (
          <p class="resultado erro" role="alert">
            ✕ {erroLeitura}
          </p>
        )}
      </section>

      {lida && (
        <section class="bloco passo" aria-live="polite">
          <h2><span class="num-passo">4</span> Confira e salve</h2>
          <p>
            <strong>{validos.length}</strong> cartões prontos
            {comErro.length > 0 && <>, {comErro.length} com problema</>}. Desmarque os que não quiser.
          </p>
          {lida.temasNovos.length > 0 && <p class="dica">Temas novos: {lida.temasNovos.map((t) => t.nome).join(', ')}</p>}

          {comErro.length > 0 && (
            <div class="problemas-ia">
              <p>
                <strong>Com problema (não serão salvos):</strong>
              </p>
              <ul class="problemas">
                {comErro.map((c) => (
                  <li>
                    ✕ “{c.idIA}”: {c.erros.join('; ')}
                  </li>
                ))}
              </ul>
              <button class="btn secundario" onClick={() => copiar(montarCorrecao(comErro.map((c) => ({ id: c.idIA, erros: c.erros }))), 'correcao')}>
                {copiado === 'correcao' ? '✓ Pedido de correção copiado' : 'Copiar pedido de correção para o Gemini'}
              </button>
              <p class="dica">Cole no Gemini, copie a nova resposta e cole no passo 3: os cartões corrigidos entram na prévia.</p>
            </div>
          )}

          <ul class="lista-revisao">
            {validos.map((c) => {
              const marcado = !desmarcados.has(c.cartao.id)
              return (
                <li class={`item ${marcado ? 'ok' : ''}`}>
                  <label class="check">
                    <input type="checkbox" checked={marcado} onChange={() => alternar(c.cartao.id)} />
                    {marcado ? 'Incluir' : 'Não incluir'}
                  </label>
                  <Conteudo c={c.cartao} />
                </li>
              )
            })}
          </ul>
          <button class="btn terciario" onClick={() => setLida(null)}>
            Descartar e começar de novo
          </button>
          <button class="btn principal" disabled={!escolhidos.length || salvando} onClick={adicionar}>
            Adicionar {escolhidos.length} {escolhidos.length === 1 ? 'cartão' : 'cartões'}
          </button>
        </section>
      )}
    </main>
  )
}
