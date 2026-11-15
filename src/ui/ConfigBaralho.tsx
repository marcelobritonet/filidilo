import { useState } from 'preact/hooks'
import { duplicar, excluir, novoId, restaurar, salvar } from '../core/baralhos'
import type { Baralho, Tema } from '../core/types'
import type { Navegacao } from './App'

/** Nome, data da prova e temas de um baralho; duplicar e excluir. */
export function ConfigBaralho({ baralho, nav }: { baralho: Baralho; nav: Navegacao }) {
  const [titulo, setTitulo] = useState(baralho.titulo)
  const [prova, setProva] = useState(baralho.prova ?? '')
  const [temas, setTemas] = useState<Tema[]>(baralho.temas)
  const [novoTema, setNovoTema] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  const qtd = (id: string) => baralho.cartoes.filter((c) => c.tema === id).length
  const mudarTema = (id: string, m: Partial<Tema>) => setTemas((ts) => ts.map((t) => (t.id === id ? { ...t, ...m } : t)))
  const alterado =
    titulo.trim() !== baralho.titulo || prova !== (baralho.prova ?? '') || JSON.stringify(temas) !== JSON.stringify(baralho.temas)
  const valido = titulo.trim() && temas.length > 0 && temas.every((t) => t.nome.trim())

  const adicionarTema = (e: Event) => {
    e.preventDefault()
    const nome = novoTema.trim()
    if (!nome) return
    setTemas((ts) => [...ts, { id: novoId(nome), nome }])
    setNovoTema('')
  }

  const gravar = async () => {
    await salvar({ ...baralho, titulo: titulo.trim(), prova: prova || undefined, temas: temas.map((t) => ({ ...t, nome: t.nome.trim() })) })
    nav.mudou()
    nav.avisar({ texto: 'Baralho salvo.' })
    nav.voltar()
  }

  const fazerCopia = async () => {
    const c = await duplicar(baralho.id)
    nav.mudou()
    nav.avisar({ texto: `Criado “${c.titulo}”.` })
  }

  const apagar = async () => {
    const removido = await excluir(baralho.id)
    nav.mudou()
    nav.avisar({
      texto: `“${baralho.titulo}” foi excluído.`,
      desfazer: async () => {
        if (removido) await restaurar(removido)
        nav.mudou()
      },
    })
    history.go(-2) // sai da configuração e da tela do baralho excluído
  }

  return (
    <main class="tela config">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <span>Configurar baralho</span>
        <span />
      </header>

      <section class="bloco">
        <label class="campo">
          Nome
          <input class="texto" value={titulo} onInput={(e) => setTitulo((e.target as HTMLInputElement).value)} />
        </label>
        <label class="campo">
          Data da prova (opcional)
          <input class="texto" type="date" value={prova} onInput={(e) => setProva((e.target as HTMLInputElement).value)} />
        </label>
        {prova && (
          <button class="link" onClick={() => setProva('')}>
            Remover data da prova
          </button>
        )}
      </section>

      <section class="bloco">
        <h2>Temas</h2>
        <p class="dica">Marque “cai na prova” nos temas mais importantes: o modo prova começa por eles.</p>
        <ul class="lista-temas">
          {temas.map((t) => (
            <li>
              <input class="texto" aria-label="Nome do tema" value={t.nome} onInput={(e) => mudarTema(t.id, { nome: (e.target as HTMLInputElement).value })} />
              <div class="tema-opcoes">
                <label class="check">
                  <input type="checkbox" checked={!!t.prioritario} onChange={(e) => mudarTema(t.id, { prioritario: (e.target as HTMLInputElement).checked })} />
                  cai na prova
                </label>
                <span class="dica">{qtd(t.id)} cartões</span>
                {qtd(t.id) === 0 && temas.length > 1 && (
                  <button class="link" onClick={() => setTemas((ts) => ts.filter((x) => x.id !== t.id))}>
                    remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <form class="entrada" onSubmit={adicionarTema}>
          <input class="texto" placeholder="Novo tema" value={novoTema} onInput={(e) => setNovoTema((e.target as HTMLInputElement).value)} />
          <button class="btn" type="submit" disabled={!novoTema.trim()}>
            Adicionar
          </button>
        </form>
      </section>

      <button class="btn principal" disabled={!alterado || !valido} onClick={gravar}>
        Salvar alterações
      </button>

      <section class="bloco">
        <button class="btn secundario" onClick={fazerCopia}>
          Duplicar baralho
        </button>
        {!confirmarExclusao ? (
          <button class="btn secundario perigo" onClick={() => setConfirmarExclusao(true)}>
            Excluir baralho
          </button>
        ) : (
          <div class="confirmar">
            <p>
              Excluir “{baralho.titulo}” e seus {baralho.cartoes.length} cartões?
            </p>
            <div class="linha">
              <button class="btn secundario" onClick={() => setConfirmarExclusao(false)}>
                Cancelar
              </button>
              <button class="btn perigo-forte" onClick={apagar}>
                Excluir
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
