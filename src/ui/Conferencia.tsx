import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { CartaoLido } from '../core/ia/resposta'
import type { Cartao } from '../core/types'
import { Tex } from './Tex'
import { AvisoNivelAlto, Conteudo } from './Revisar'

/**
 * Conferência como uma tela à parte: ganha uma entrada no histórico, para o "voltar"
 * do Android (e o ← da barra) levar de volta aos passos sem perder os cartões lidos.
 */
export function useConferencia() {
  const [conferindo, setConferindo] = useState(false)
  useEffect(() => {
    if (!conferindo) return
    const aoVoltar = () => setConferindo(false)
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [conferindo])
  const abrir = () => {
    if (!conferindo) history.pushState({ n: history.state?.n ?? 0 }, '')
    setConferindo(true)
    window.scrollTo(0, 0)
  }
  /** Volta aos passos. Com `depois`, roda depois de tirar a entrada da conferência do histórico. */
  const fechar = (depois?: () => void) => {
    if (!conferindo) return depois?.()
    if (depois) window.addEventListener('popstate', () => depois(), { once: true })
    history.back()
  }
  return { conferindo, abrir, fechar }
}

const ROTULO_TIPO: Record<Cartao['tipo'], string> = {
  conceito: 'Pergunta',
  vf: 'V ou F',
  associacao: 'Alternativas',
  lacunas: 'Lacunas',
  calculo: 'Cálculo',
  colunas: 'Colunas',
}

/**
 * Um cartão da conferência, fechado (P143): só o tipo e a pergunta, sem a resposta. Tocar abre o cartão inteiro.
 * A caixa fica fora da área que abre, para incluir ou tirar sem abrir.
 */
export function ItemConferencia(p: { c: Cartao; marcado: boolean; alternar: () => void; rotuloCaixa?: string; nota?: ComponentChildren; aberto?: boolean }) {
  const pergunta = 'frente' in p.c ? p.c.frente : p.c.titulo
  return (
    <li class={`item item-conf ${p.marcado ? 'ok' : 'fora'}`}>
      <input type="checkbox" class="caixa-conf" checked={p.marcado} onChange={p.alternar} aria-label={`${p.rotuloCaixa ?? 'Incluir'}: ${pergunta.replace(/[$*]/g, '')}`} />
      <details open={p.aberto}>
        <summary>
          <span class="tipo-conf">{ROTULO_TIPO[p.c.tipo] ?? p.c.tipo}</span>
          <Tex class="pergunta-conf" texto={pergunta.replace(/____/g, '______')} />
        </summary>
        <div class="corpo-conf">
          {p.nota}
          <Conteudo c={p.c} />
        </div>
      </details>
    </li>
  )
}

/** "Abrir todos / Fechar todos": troca a chave da lista para os itens nascerem abertos ou fechados. */
export function useAbrirTodos() {
  const [abertos, setAbertos] = useState(false)
  const [chave, setChave] = useState(0)
  const botao = (
    <button class="link abrir-todos" onClick={() => { setAbertos(!abertos); setChave((k) => k + 1) }}>
      {abertos ? 'Fechar todos' : 'Abrir todos'}
    </button>
  )
  return { abertos, chave, botao }
}

/** Passo 4: os cartões que a IA devolveu, para a pessoa conferir e salvar. */
export function Conferencia(p: {
  topo?: ComponentChildren
  validos: CartaoLido[]
  comErro: CartaoLido[]
  naoConvertidos: string[]
  desmarcados: Set<string>
  alternar: (id: string) => void
  nivel?: string
  copiarCorrecao: () => void
  correcaoCopiada: boolean
  falhaCorrecao?: string
  /** Lê a resposta corrigida; devolve o erro, se houver. */
  lerCorrecao: (texto: string) => string | null
  rotuloSalvar: string
  podeSalvar: boolean
  salvar: () => void
  descartar?: () => void
}) {
  const [correcao, setCorrecao] = useState('')
  const [erro, setErro] = useState('')
  const todos = useAbrirTodos()
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

  const lerCorrecao = () => {
    const e = p.lerCorrecao(correcao)
    setErro(e ?? '')
    if (!e) setCorrecao('')
  }

  return (
    <section class="bloco passo conferencia" aria-live="polite">
      {p.topo}
      <p>
        {plural(p.validos.length, 'cartão pronto', 'cartões prontos')}
        {p.comErro.length > 0 && <>, {p.comErro.length} com problema</>}. Toque num cartão para ver a resposta; desmarque o que não quiser.
      </p>

      {p.comErro.length > 0 && (
        <div class="problemas-ia">
          <ul class="problemas">
            {p.comErro.map((c) => (
              <li>
                ✕ {c.idIA}: {c.erros.join('; ')}
              </li>
            ))}
          </ul>
          <button class="btn secundario" onClick={p.copiarCorrecao}>
            {p.correcaoCopiada ? '✓ Pedido de correção copiado' : 'Copiar pedido de correção'}
          </button>
          {p.falhaCorrecao && <textarea class="instrucao" rows={6} readOnly value={p.falhaCorrecao} />}
          <p class="dica">Cole na mesma conversa com a IA e cole a nova resposta aqui.</p>
          <textarea rows={4} value={correcao} placeholder="Cole aqui a nova resposta" onInput={(e) => setCorrecao((e.target as HTMLTextAreaElement).value)} />
          <button class="btn secundario" disabled={!correcao.trim()} onClick={lerCorrecao}>
            Ler correção
          </button>
          {erro && (
            <p class="resultado erro" role="alert">
              ✕ {erro}
            </p>
          )}
        </div>
      )}

      {p.naoConvertidos.length > 0 && (
        <div class="problemas-ia">
          <p>{plural(p.naoConvertidos.length, 'item ficou de fora', 'itens ficaram de fora')}:</p>
          <ul class="problemas">
            {p.naoConvertidos.map((t) => (
              <li>✕ {t}</li>
            ))}
          </ul>
        </div>
      )}

      <AvisoNivelAlto nivel={p.nivel} />
      {p.validos.length > 0 && <p class="linha-abrir-todos">{todos.botao}</p>}
      <ul class="lista-revisao lista-conf" key={todos.chave}>
        {p.validos.map((c) => (
          <ItemConferencia c={c.cartao} marcado={!p.desmarcados.has(c.cartao.id)} alternar={() => p.alternar(c.cartao.id)} aberto={todos.abertos} />
        ))}
      </ul>

      <div class="rodape-fixo">
        <button class="btn principal" disabled={!p.podeSalvar} onClick={p.salvar}>
          {p.rotuloSalvar}
        </button>
        {p.descartar && (
          <button class="btn terciario" onClick={p.descartar}>
            Descartar
          </button>
        )}
      </div>
    </section>
  )
}
