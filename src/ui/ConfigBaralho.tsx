import { useState } from 'preact/hooks'
import { duplicar, excluir, novoId, restaurar, salvar } from '../core/baralhos'
import { NIVEIS, normalizarNivel, type Baralho, type Nivel, type Objetivo, type Tema } from '../core/types'
import type { Navegacao } from './App'
import { evento } from '../core/telemetria'
import { conteudoBaralho } from './enviar'
import { EnviarModal } from './EnviarModal'

const linhas = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** Forma comparável do objetivo: ausente e vazio contam como iguais. */
const normalizar = (o?: Objetivo) =>
  JSON.stringify({ pedido: o?.pedido ?? null, resumo: o?.resumo ?? null, nivel: o?.nivel ?? null, foco: o?.foco ?? [], evitar: o?.evitar ?? [] })

/** Cartões (criar, ver, enviar), nome, objetivo e temas de um baralho; duplicar e excluir. */
export function ConfigBaralho({ baralho, nav }: { baralho: Baralho; nav: Navegacao }) {
  const [titulo, setTitulo] = useState(baralho.titulo)
  const [resumo, setResumo] = useState(baralho.objetivo?.resumo ?? '')
  const [nivel, setNivel] = useState<Nivel | ''>(normalizarNivel(baralho.objetivo?.nivel) ?? '')
  const [foco, setFoco] = useState((baralho.objetivo?.foco ?? []).join('\n'))
  const [evitar, setEvitar] = useState((baralho.objetivo?.evitar ?? []).join('\n'))
  const [temas, setTemas] = useState<Tema[]>(baralho.temas)
  const [novoTema, setNovoTema] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  const qtd = (id: string) => baralho.cartoes.filter((c) => c.tema === id).length
  const mudarTema = (id: string, m: Partial<Tema>) => setTemas((ts) => ts.map((t) => (t.id === id ? { ...t, ...m } : t)))

  // Objetivo como fica se salvar; campos vazios saem do objeto.
  const novoObjetivo = (): Objetivo | undefined => {
    const o: Objetivo = {
      pedido: baralho.objetivo?.pedido || undefined,
      resumo: resumo.trim() || undefined,
      nivel: nivel || undefined,
      foco: linhas(foco).length ? linhas(foco) : undefined,
      evitar: linhas(evitar).length ? linhas(evitar) : undefined,
    }
    return Object.values(o).some((v) => v !== undefined) ? o : undefined
  }
  const objetivo = novoObjetivo()
  const objetivoMudou = normalizar(objetivo) !== normalizar(baralho.objetivo)

  const erroObjetivo =
    resumo.trim().length > 160
      ? 'O objetivo tem no máximo 160 caracteres.'
      : linhas(foco).length > 5 || linhas(evitar).length > 5
        ? 'Foco e Evitar aceitam até 5 linhas cada.'
        : linhas(foco).concat(linhas(evitar)).some((x) => x.length > 60)
          ? 'Cada linha de Foco e Evitar tem no máximo 60 caracteres.'
          : ''

  const alterado = titulo.trim() !== baralho.titulo || objetivoMudou || JSON.stringify(temas) !== JSON.stringify(baralho.temas)
  const valido = titulo.trim() && temas.length > 0 && temas.every((t) => t.nome.trim()) && !erroObjetivo

  const adicionarTema = (e: Event) => {
    e.preventDefault()
    const nome = novoTema.trim()
    if (!nome) return
    setTemas((ts) => [...ts, { id: novoId(nome), nome }])
    setNovoTema('')
  }

  const gravar = async () => {
    if (objetivoMudou) evento('objetivo_editado', { nivel_mudou: (baralho.objetivo?.nivel ?? '') !== (objetivo?.nivel ?? '') })
    await salvar({ ...baralho, titulo: titulo.trim(), objetivo, temas: temas.map((t) => ({ ...t, nome: t.nome.trim() })) })
    nav.mudou()
    nav.avisar({ texto: 'Baralho salvo.' })
    nav.voltar()
  }

  const fazerCopia = async () => {
    evento('baralho_duplicado')
    const c = await duplicar(baralho.id)
    nav.mudou()
    nav.avisar({ texto: `Criado “${c.titulo}”.` })
  }

  const apagar = async () => {
    evento('baralho_excluido', { cartoes: baralho.cartoes.length })
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

  const [enviando, setEnviando] = useState(false)
  const enviar = () => setEnviando(true)

  return (
    <main class="tela config">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <h1 class="titulo-barra">Configurar baralho</h1>
        <span />
      </header>

      <section class="bloco">
        <h2>Cartões</h2>
        <button class="btn secundario" onClick={() => nav.ir({ nome: 'ia', id: baralho.id })}>
          Criar com IA
        </button>
        <button class="btn secundario" onClick={() => nav.ir({ nome: 'revisar', id: baralho.id })}>
          Ver e editar ({baralho.cartoes.length})
        </button>
        <button class="btn secundario" disabled={!baralho.cartoes.length} onClick={enviar}>
          Enviar baralho
        </button>
      </section>

      <section class="bloco">
        <label class="campo">
          Nome
          <input class="texto" value={titulo} onInput={(e) => setTitulo((e.target as HTMLInputElement).value)} />
        </label>
      </section>

      <section class="bloco">
        <h2>Objetivo</h2>
        {!baralho.objetivo && <p class="dica">Ainda não definido. Defina para a IA criar cartões melhores.</p>}
        <label class="campo">
          Objetivo
          <input class="texto" maxLength={160} value={resumo} onInput={(e) => setResumo((e.target as HTMLInputElement).value)} />
        </label>
        <label class="campo">
          Quanto você já sabe
          <select value={nivel} onChange={(e) => setNivel((e.target as HTMLSelectElement).value as Nivel | '')}>
            <option value="">—</option>
            {NIVEIS.map((n) => (
              <option value={n.valor}>{n.nome}</option>
            ))}
          </select>
        </label>
        <label class="campo">
          Foco (um por linha)
          <textarea rows={3} value={foco} onInput={(e) => setFoco((e.target as HTMLTextAreaElement).value)} />
        </label>
        <label class="campo">
          Evitar (um por linha)
          <textarea rows={2} value={evitar} onInput={(e) => setEvitar((e.target as HTMLTextAreaElement).value)} />
        </label>
        {erroObjetivo && (
          <p class="resultado erro" role="alert">
            {erroObjetivo}
          </p>
        )}
      </section>

      <section class="bloco">
        <h2>Temas</h2>
        <ul class="lista-temas">
          {temas.map((t) => (
            <li>
              <input class="texto" aria-label="Nome do tema" value={t.nome} onInput={(e) => mudarTema(t.id, { nome: (e.target as HTMLInputElement).value })} />
              <div class="tema-opcoes">
                <span class="dica">{qtd(t.id)} {qtd(t.id) === 1 ? 'cartão' : 'cartões'}</span>
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
      {enviando && <EnviarModal conteudo={conteudoBaralho(baralho)} onde="configurar" avisar={(texto) => nav.avisar({ texto })} fechar={() => setEnviando(false)} />}
    </main>
  )
}
