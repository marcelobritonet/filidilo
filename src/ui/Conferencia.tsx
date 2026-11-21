import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { CartaoLido } from '../core/ia/resposta'
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
        {p.comErro.length > 0 && <>, {p.comErro.length} com problema</>}. Desmarque o que não quiser.
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
      <ul class="lista-revisao">
        {p.validos.map((c) => {
          const marcado = !p.desmarcados.has(c.cartao.id)
          return (
            <li class={`item ${marcado ? 'ok' : ''}`}>
              <label class="check">
                <input type="checkbox" checked={marcado} onChange={() => p.alternar(c.cartao.id)} />
                Incluir
              </label>
              <Conteudo c={c.cartao} />
            </li>
          )
        })}
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
