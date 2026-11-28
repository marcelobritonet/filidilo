import { evento } from '../core/telemetria'
import { useState } from 'preact/hooks'
import { arquivarCartao, desarquivarCartao, excluirCartao, gravarCartao, novoIdCartao, problemasDoCartao, reinserirCartao } from '../core/cartoes'
import { contarLacunas, MARCADOR } from '../core/lacunas'
import type { Baralho, Cartao } from '../core/types'
import type { Navegacao } from './App'
import { CorrigirCartao } from './CorrigirCartao'
import { Tex } from './Tex'

type TipoEditavel = 'conceito' | 'vf' | 'associacao' | 'lacunas'

const TIPOS: { tipo: TipoEditavel; nome: string }[] = [
  { tipo: 'conceito', nome: 'Pergunta e resposta' },
  { tipo: 'vf', nome: 'Verdadeiro ou falso' },
  { tipo: 'associacao', nome: 'Alternativas' },
  { tipo: 'lacunas', nome: 'Lacunas' },
]

/** Corrigir à mão no meio do estudo: a sessão continua aberta por baixo. */
export interface EdicaoNaSessao {
  aoSalvar: (c: Cartao, b: Baralho) => void
  fechar: () => void
}

/**
 * Criar ou editar um cartão de conceito, V/F ou alternativas. Cálculo: só tema e exclusão.
 * Com `naSessao`, é a correção manual durante o estudo: sem excluir e sem navegar.
 */
export function EditarCartao({ baralho, cartaoId, temaInicial, nav, naSessao }: { baralho: Baralho; cartaoId?: string; temaInicial?: string; nav?: Navegacao; naSessao?: EdicaoNaSessao }) {
  const original = cartaoId ? baralho.cartoes.find((c) => c.id === cartaoId) : undefined
  // Cálculo e ligar colunas ainda não se editam aqui: só o tema e a exclusão.
  const ehCalculo = original?.tipo === 'calculo' || original?.tipo === 'colunas'
  const temaPadrao = temaInicial ?? original?.tema ?? baralho.temas[0]?.id ?? 'geral'

  const [tipo, setTipo] = useState<TipoEditavel>(original && original.tipo !== 'calculo' && original.tipo !== 'colunas' ? original.tipo : 'conceito')
  const [tema, setTema] = useState(temaPadrao)
  const [frente, setFrente] = useState(original && 'frente' in original ? original.frente : '')
  const [verso, setVerso] = useState(original?.tipo === 'conceito' ? original.verso : '')
  const [resposta, setResposta] = useState<boolean | null>(original?.tipo === 'vf' ? original.resposta : null)
  const [opcoes, setOpcoes] = useState<string[]>(original?.tipo === 'associacao' ? original.opcoes : ['', '', ''])
  const [correta, setCorreta] = useState(original?.tipo === 'associacao' ? original.correta : 0)
  const [outraForma, setOutraForma] = useState(original?.tipo === 'associacao' ? (original.outrasFormas?.[0] ?? '') : '')
  const [respostasLacunas, setRespostasLacunas] = useState<string[]>(original?.tipo === 'lacunas' ? original.respostas : [])
  const [explicacao, setExplicacao] = useState(original?.explicacao ?? '')
  const [fonte, setFonte] = useState(original?.fonte ? `${original.fonte.apostila}${original.fonte.pagina !== undefined ? `, p. ${original.fonte.pagina}` : ''}` : '')
  const [problemas, setProblemas] = useState<string[]>([])
  const [confirmar, setConfirmar] = useState(false)
  const [corrigindo, setCorrigindo] = useState(false)

  const montar = (): Cartao => {
    const id = original?.id ?? novoIdCartao()
    const extra = {
      explicacao: explicacao.trim() || undefined,
      fonte: lerFonte(fonte),
      origem: original?.origem,
    }
    if (ehCalculo) return { ...original!, tema }
    // Os outros enunciados e as variantes do V/F ainda não se editam aqui: ficam como estavam.
    const outrasFrentes = original && (original.tipo === 'conceito' || original.tipo === 'associacao') ? original.outrasFrentes : undefined
    const variantes = original?.tipo === 'vf' ? original.variantes : undefined
    if (tipo === 'conceito') return { id, tipo, tema, frente: frente.trim(), verso: verso.trim(), outrasFrentes, ...extra }
    if (tipo === 'vf') return { id, tipo, tema, frente: frente.trim(), resposta: resposta as boolean, variantes, ...extra }
    if (tipo === 'lacunas') {
      const n = contarLacunas(frente)
      return { id, tipo, tema, frente: frente.trim(), respostas: Array.from({ length: n }, (_, i) => (respostasLacunas[i] ?? '').trim()), ...extra }
    }
    const ops = opcoes.map((o) => o.trim())
    // Opções vazias saem; o índice da correta acompanha.
    const corretaTexto = ops[correta]
    const limpas = ops.filter(Boolean)
    // Edita a primeira outra forma; se a IA tiver mandado mais, as demais ficam.
    const formas = [outraForma.trim(), ...(original?.tipo === 'associacao' ? (original.outrasFormas ?? []).slice(1) : [])].filter(Boolean)
    return { id, tipo, tema, frente: frente.trim(), opcoes: limpas, correta: Math.max(0, limpas.indexOf(corretaTexto)), outrasFormas: formas.length ? formas : undefined, outrasFrentes, ...extra }
  }

  const verificar = (c: Cartao): string[] => {
    const p: string[] = []
    if (c.tipo === 'vf' && resposta === null) p.push('Escolha se a afirmação é verdadeira ou falsa.')
    if (c.tipo === 'associacao' && !opcoes[correta]?.trim()) p.push('Marque qual alternativa é a correta.')
    if (c.tipo === 'lacunas' && contarLacunas(frente) === 0) p.push(`Escreva ${MARCADOR} no lugar da palavra que falta.`)
    return [...p, ...problemasDoCartao(baralho, c).filter((m) => !m.startsWith('resposta deve ser') && !m.startsWith('V/F falso'))]
  }

  const gravar = async (eOutro: boolean) => {
    const c = montar()
    const p = verificar(c)
    setProblemas(p)
    if (p.length) return
    evento('cartao_salvo', { tipo: c.tipo, novo: !original, onde: naSessao ? 'estudo' : 'editor' })
    const b = await gravarCartao(baralho, c)
    if (naSessao) return naSessao.aoSalvar(c, b)
    if (!nav) return
    nav.mudou()
    if (eOutro) {
      nav.avisar({ texto: 'Cartão salvo. Pode escrever o próximo.' })
      setFrente('')
      setVerso('')
      setResposta(null)
      setOpcoes(['', '', ''])
      setRespostasLacunas([])
      setCorreta(0)
      setExplicacao('')
      window.scrollTo(0, 0)
    } else {
      nav.avisar({ texto: original ? 'Cartão atualizado.' : 'Cartão criado.' })
      nav.voltar()
    }
  }

  const alternarArquivo = async () => {
    if (!nav || !original) return
    if (original.arquivadoEm) {
      evento('cartao_desarquivado', { onde: 'editar' })
      await desarquivarCartao(baralho, original.id)
      nav.mudou()
      nav.avisar({ texto: 'Cartão de volta ao estudo.' })
    } else {
      evento('cartao_arquivado', { onde: 'editar', tipo: original.tipo })
      const b = await arquivarCartao(baralho, original.id)
      nav.mudou()
      nav.avisar({
        texto: 'Cartão arquivado. Ele não volta mais no estudo.',
        desfazer: async () => {
          await desarquivarCartao(b, original.id)
          nav.mudou()
        },
      })
    }
    nav.voltar()
  }

  const apagar = async () => {
    if (!nav) return
    const r = await excluirCartao(baralho, original!.id)
    nav.mudou()
    nav.avisar({
      texto: 'Cartão excluído.',
      desfazer: async () => {
        if (r.cartao) await reinserirCartao(r.baralho, r.cartao, r.pos)
        nav.mudou()
      },
    })
    nav.voltar()
  }

  return (
    <main class="tela editar">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar sem salvar" onClick={naSessao ? naSessao.fechar : nav?.voltar}>←</button>
        <h1 class="titulo-barra">{naSessao ? 'Corrigir cartão' : original ? 'Editar cartão' : 'Novo cartão'}</h1>
        <span />
      </header>

      {ehCalculo ? (
        <section class="bloco">
          <p>
            <strong>{original.tipo === 'calculo' ? original.titulo : original.frente}</strong>
          </p>
          <p class="dica">{original.tipo === 'calculo' ? 'Cálculos' : 'Cartões de ligar colunas'} são criados com IA. Aqui dá para mudar o tema ou excluir.</p>
        </section>
      ) : (
        <div class="segmentado" role="radiogroup" aria-label="Tipo de cartão">
          {TIPOS.map((t) => (
            <button role="radio" aria-checked={tipo === t.tipo} class={tipo === t.tipo ? 'ativo' : ''} onClick={() => setTipo(t.tipo)}>
              {t.nome}
            </button>
          ))}
        </div>
      )}

      <section class="bloco">
        <label class="campo">
          Tema
          <select value={tema} onChange={(e) => setTema((e.target as HTMLSelectElement).value)}>
            {baralho.temas.map((t) => (
              <option value={t.id}>{t.nome}</option>
            ))}
          </select>
        </label>

        {!ehCalculo && (
          <>
            <label class="campo">
              {tipo === 'vf' ? 'Afirmação' : 'Pergunta'}
              <textarea rows={3} value={frente} onInput={(e) => setFrente((e.target as HTMLTextAreaElement).value)} placeholder={tipo === 'vf' ? 'Ex.: A água ferve a 100 °C ao nível do mar.' : 'Ex.: O que é fotossíntese?'} />
            </label>

            {tipo === 'conceito' && (
              <label class="campo">
                Resposta
                <textarea rows={4} value={verso} onInput={(e) => setVerso((e.target as HTMLTextAreaElement).value)} />
              </label>
            )}

            {tipo === 'lacunas' && (
              <div class="campo">
                <p class="dica">Escreva {MARCADOR} no lugar de cada palavra a completar. Ex.: A Terra gira em torno do {MARCADOR}.</p>
                {Array.from({ length: contarLacunas(frente) }, (_, i) => (
                  <label class="campo">
                    Resposta da lacuna {i + 1} (use / para sinônimos)
                    <input class="texto" value={respostasLacunas[i] ?? ''} onInput={(e) => { const v = (e.target as HTMLInputElement).value; setRespostasLacunas((prev) => { const a = [...prev]; while (a.length <= i) a.push(''); a[i] = v; return a }) }} />
                  </label>
                ))}
              </div>
            )}

            {tipo === 'vf' && (
              <div class="campo">
                A afirmação é…
                <div class="opcoes duas">
                  <button class={`opcao ${resposta === true ? 'certa' : ''}`} aria-pressed={resposta === true} onClick={() => setResposta(true)}>
                    Verdadeira
                  </button>
                  <button class={`opcao ${resposta === false ? 'errada' : ''}`} aria-pressed={resposta === false} onClick={() => setResposta(false)}>
                    Falsa
                  </button>
                </div>
              </div>
            )}

            {tipo === 'associacao' && (
              <div class="campo">
                Alternativas (toque no círculo da correta)
                <ul class="alternativas-edit">
                  {opcoes.map((o, i) => (
                    <li>
                      <input type="radio" name="correta" aria-label={`Alternativa ${i + 1} é a correta`} checked={correta === i} onChange={() => setCorreta(i)} />
                      <input class="texto" value={o} placeholder={`Alternativa ${i + 1}`} onInput={(e) => {
                          const v = (e.target as HTMLInputElement).value
                          setOpcoes((ops) => ops.map((x, k) => (k === i ? v : x)))
                        }} />
                      {opcoes.length > 2 && (
                        <button
                          class="icone-pequeno"
                          aria-label={`Remover alternativa ${i + 1}`}
                          onClick={() => {
                            setOpcoes((ops) => ops.filter((_, k) => k !== i))
                            setCorreta((c) => (c === i ? 0 : c > i ? c - 1 : c))
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {opcoes.length < 8 && (
                  <button class="link" onClick={() => setOpcoes((ops) => [...ops, ''])}>
                    + alternativa
                  </button>
                )}
                <p class="dica">Com mais de 4, cada vez aparecem 3 erradas diferentes.</p>
              </div>
            )}

            {tipo === 'associacao' && (
              <label class="campo">
                Outra forma de dizer a correta (opcional)
                <input class="texto" value={outraForma} onInput={(e) => setOutraForma((e.target as HTMLInputElement).value)} placeholder="Mesma resposta, com outras palavras" />
              </label>
            )}

            <label class="campo">
              Explicação (opcional)
              <textarea rows={2} value={explicacao} onInput={(e) => setExplicacao((e.target as HTMLTextAreaElement).value)} placeholder="Aparece depois da resposta" />
            </label>
            <label class="campo">
              Fonte (opcional)
              <input class="texto" value={fonte} onInput={(e) => setFonte((e.target as HTMLInputElement).value)} placeholder="Ex.: Aula 4, p. 7" />
            </label>
            <p class="dica">Dica: fórmulas podem ir entre $…$, como $V^2/R$, e **negrito** entre asteriscos.</p>
          </>
        )}
      </section>

      {!ehCalculo && frente.trim() && (
        <section class="bloco previa">
          <p class="rotulo">Prévia</p>
          <Tex class="frente" texto={frente} />
          {tipo === 'conceito' && verso.trim() && <Tex class="verso" texto={verso} />}
          {tipo === 'lacunas' && respostasLacunas.some((r) => r.trim()) && <Tex class="verso" texto={respostasLacunas.filter((r) => r.trim()).join(', ')} />}
        </section>
      )}

      {problemas.length > 0 && (
        <ul class="problemas" role="alert">
          {problemas.map((p) => (
            <li>⚠ {p}</li>
          ))}
        </ul>
      )}

      <div class="acoes">
        <button class="btn principal" onClick={() => gravar(false)}>
          {naSessao ? 'Salvar e voltar ao estudo' : 'Salvar'}
        </button>
        {naSessao && (
          <button class="btn terciario" onClick={naSessao.fechar}>
            Cancelar
          </button>
        )}
        {!original && !naSessao && (
          <button class="btn secundario" onClick={() => gravar(true)}>
            Salvar e criar outro
          </button>
        )}
      </div>

      {original && (
        <button class="btn secundario" onClick={() => setCorrigindo(true)}>
          Corrigir com IA
        </button>
      )}
      {original && corrigindo && (
        <CorrigirCartao
          baralho={baralho}
          cartao={original}
          fechar={() => setCorrigindo(false)}
          aoSalvar={(c, b) => {
            if (naSessao) return naSessao.aoSalvar(c, b)
            nav?.mudou()
            nav?.avisar({ texto: 'Cartão corrigido.' })
            nav?.voltar()
          }}
        />
      )}
      {original && !naSessao && (
        <section class="bloco">
          <button class="btn secundario" onClick={alternarArquivo}>
            {original.arquivadoEm ? 'Desarquivar cartão' : 'Arquivar cartão'}
          </button>
          <p class="dica">
            {original.arquivadoEm ? 'Este cartão está arquivado: não aparece no estudo.' : 'Arquivar tira o cartão do estudo sem apagar. Dá para desarquivar na lista de cartões.'}
          </p>
          {!confirmar ? (
            <button class="btn secundario perigo" onClick={() => setConfirmar(true)}>
              Excluir cartão
            </button>
          ) : (
            <div class="confirmar">
              <p>Excluir este cartão?</p>
              {!original.arquivadoEm && <p class="dica">Se só não quer mais vê-lo no estudo, arquive: o cartão fica guardado.</p>}
              <div class="linha">
                <button class="btn secundario" onClick={() => setConfirmar(false)}>
                  Cancelar
                </button>
                <button class="btn perigo-forte" onClick={apagar}>
                  Excluir
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

/** "Aula 4, p. 7" → { apostila: "Aula 4", pagina: 7 } */
function lerFonte(txt: string) {
  const t = txt.trim()
  if (!t) return undefined
  const m = /^(.*?)[,;]?\s*p(?:ág(?:ina)?)?\.?\s*([\d–\-, ]+)$/i.exec(t)
  if (m && m[1].trim()) return { apostila: m[1].trim(), pagina: /^\d+$/.test(m[2].trim()) ? Number(m[2].trim()) : m[2].trim() }
  return { apostila: t }
}
