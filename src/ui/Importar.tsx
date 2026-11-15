import { useState } from 'preact/hooks'
import { aplicar, importarComoCopia, type PlanoImportacao } from '../core/compartilhar'
import type { Navegacao } from './App'

/** Resumo do baralho recebido e as opções de importar. */
export function Importar({ plano, nav, fechar }: { plano: PlanoImportacao; nav: Navegacao; fechar: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const { recebido, atual } = plano
  const mudancas = plano.novos.length + plano.atualizados.length
  const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`

  const concluir = async (fazer: () => Promise<{ id: string; titulo: string }>, msg: string) => {
    setOcupado(true)
    const b = await fazer()
    nav.mudou()
    nav.avisar({ texto: msg.replace('{t}', b.titulo) })
    fechar()
    nav.ir({ nome: 'baralho', id: b.id })
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-importar">
        <h2 id="titulo-importar">{atual ? 'Atualizar baralho' : 'Baralho recebido'}</h2>
        <p>
          <strong>{recebido.titulo}</strong> · {recebido.cartoes.length} cartões
        </p>

        {!atual ? (
          <>
            <p class="dica">Ele vai aparecer em Meus baralhos, pronto para estudar.</p>
            <button class="btn principal" disabled={ocupado} onClick={() => concluir(() => aplicar(plano), '“{t}” adicionado.')}>
              Adicionar baralho
            </button>
          </>
        ) : (
          <>
            <p class="dica">
              Você já tem este baralho (“{atual.titulo}”). Veja o que muda se atualizar:
            </p>
            <ul class="resumo-importacao">
              <li>➕ {n(plano.novos.length, 'cartão novo', 'cartões novos')}</li>
              <li>🔄 {n(plano.atualizados.length, 'cartão corrigido', 'cartões corrigidos')}</li>
              <li>✋ {n(plano.preservados.length, 'cartão que você editou: fica como está', 'cartões que você editou: ficam como estão')}</li>
              <li>＝ {n(plano.iguais, 'igual', 'iguais')}</li>
              {plano.soNoMeu > 0 && <li>📌 {n(plano.soNoMeu, 'só seu: continua', 'só seus: continuam')} no baralho</li>}
              {plano.temasNovos.length > 0 && <li>🏷 temas novos: {plano.temasNovos.map((t) => t.nome).join(', ')}</li>}
            </ul>
            <p class="dica">Seu progresso, nome e data da prova não mudam.</p>
            <button class="btn principal" disabled={ocupado || !mudancas} onClick={() => concluir(() => aplicar(plano), '“{t}” atualizado.')}>
              {mudancas ? `Atualizar (${n(mudancas, 'mudança', 'mudanças')})` : 'Nada para atualizar'}
            </button>
            <button class="btn" disabled={ocupado} onClick={() => concluir(() => importarComoCopia(recebido), 'Importado como “{t}”.')}>
              Importar como baralho separado
            </button>
          </>
        )}
        <button class="btn secundario" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
