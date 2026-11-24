import { useState } from 'preact/hooks'
import { evento, ligarTelemetria, telemetriaDisponivel, telemetriaLigada } from '../core/telemetria'
import type { Navegacao } from './App'
import { InstalarBloco } from './InstalarCard'
import { pecaConvite } from '../core/artes'
import { CompartilharImagem, urlApp } from './CompartilharImagem'
import { lerEstilo, especiaisLiberados, lerPreferencia, salvarEstilo, salvarPreferencia, suaveLiberado, type Estilo, type Tema } from './tema'

// Amostras: fundo, cartão e a cor viva de cada tema.
type OpcaoTema = { valor: Tema; nome: string; descricao: string; cores: [string, string, string] }
const OPCOES: OpcaoTema[] = [
  { valor: 'areia', nome: 'Areia', descricao: 'claro e quente, papel creme com tinta noite', cores: ['#F6F2EA', '#FFFDF9', '#0B1E3F'] },
  { valor: 'lagoa', nome: 'Lagoa', descricao: 'claro, com turquesa', cores: ['#EBF4F4', '#FCFDFD', '#0D7776'] },
  { valor: 'dark', nome: 'Noite', descricao: 'escuro, com turquesa', cores: ['#0B1E3F', '#1A2E51', '#13A3A0'] },
  { valor: 'cobalto', nome: 'Cobalto', descricao: 'escuro azul-marinho, com cobalto', cores: ['#131C30', '#1C2740', '#1F4FD1'] },
  { valor: 'pavao', nome: 'Pavão', descricao: 'escuro verde-pavão, com turquesa clara', cores: ['#092525', '#0D3635', '#56D2D0'] },
]

// Temas especiais (P127): terceiro grupo, além dos claros e dos escuros. Bloqueados por enquanto.
const ESPECIAIS: OpcaoTema[] = [
  { valor: 'plumagem', nome: 'Plumagem', descricao: 'claro, cartões do coral ao azul do pavão de leque aberto', cores: ['#F5F0EC', '#B04A50', '#0457A8'] },
  { valor: 'ocelo', nome: 'Ocelo', descricao: 'rosa, cartões no verde, turquesa e azul do olho da pena', cores: ['#E3A6A3', '#0A7470', '#0457A8'] },
]

const ESTILOS: { valor: Estilo; nome: string; descricao: string }[] = [
  { valor: 'suave', nome: 'Suave', descricao: 'cantos redondos, cores da logo em degradê, botões arredondados' },
  { valor: 'classico', nome: 'Clássico', descricao: 'cartões com borda e cores chapadas' },
]

/** Escolha de aparência: salva e aplica na hora, sem botão de confirmar. */
export function Aparencia({ nav }: { nav: Navegacao }) {
  const [pref, setPref] = useState<Tema>(lerPreferencia)
  const [estilo, setEstilo] = useState<Estilo>(lerEstilo)
  const liberado = suaveLiberado()
  const especiais = especiaisLiberados()
  const [estatisticas, setEstatisticas] = useState(telemetriaLigada)
  const [convidando, setConvidando] = useState(false)

  const escolher = (p: Tema) => {
    setPref(p)
    salvarPreferencia(p)
    evento('tema_escolhido', { tema: p })
  }

  const escolherEstilo = (e: Estilo) => {
    setEstilo(e)
    salvarEstilo(e)
    evento('estilo_escolhido', { estilo: e })
  }

  const alternarEstatisticas = (ligar: boolean) => {
    ligarTelemetria(ligar)
    setEstatisticas(ligar)
  }

  return (
    <main class="tela aparencia">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <h1 class="titulo-barra">Preferências</h1>
        <span />
      </header>
      <fieldset class="opcoes-tema">
        <legend>
          <strong class="secao-titulo">Temas</strong>
          <span class="dica">Escolha o tema do Filidilo. A escolha fica salva neste aparelho.</span>
        </legend>
        {OPCOES.map((o) => opcaoTema(o, pref, escolher))}
      </fieldset>
      <fieldset class="opcoes-tema">
        <legend>
          <strong class="secao-titulo">Temas especiais</strong>
          <span class="dica">{especiais ? 'Liberados neste aparelho para teste.' : 'Aparecem em ocasiões especiais. Em breve.'}</span>
        </legend>
        {ESPECIAIS.map((o) => opcaoTema(o, pref, escolher, !especiais))}
      </fieldset>
      <fieldset class="opcoes-tema">
        <legend>
          <strong class="secao-titulo">Estilo</strong>
          <span class="dica">{liberado ? 'Muda o jeito de todas as telas; vale com qualquer tema.' : 'O estilo Suave chega em breve.'}</span>
        </legend>
        {ESTILOS.map((o) => {
          const breve = o.valor === 'suave' && !liberado
          return (
            <label class={`opcao-tema ${estilo === o.valor ? 'selecionada' : ''} ${breve ? 'desativada' : ''}`}>
              <input type="radio" name="estilo" value={o.valor} checked={estilo === o.valor} disabled={breve} onChange={() => escolherEstilo(o.valor)} />
              <span class="textos">
                <strong>
                  {o.nome} {breve && <span class="tema-chip">Em breve</span>}
                </strong>
                <small>{o.descricao}</small>
              </span>
            </label>
          )
        })}
      </fieldset>
      <InstalarBloco />
      {telemetriaDisponivel() && (
        <label class="opcao-estatisticas">
          <input type="checkbox" checked={estatisticas} onChange={(e) => alternarEstatisticas((e.target as HTMLInputElement).checked)} />
          <span class="textos">
            <strong>Enviar estatísticas de uso</strong>
            <small>Anônimas: só quais funções são usadas, nunca o texto dos cartões. Ajudam a melhorar o Filidilo.</small>
          </span>
        </label>
      )}
      <section class="bloco">
        <strong>Indicar o Filidilo</strong>
        <p class="dica">Mande para quem também estuda: uma imagem com o link e o QR code do app.</p>
        <button class="btn secundario" onClick={() => { evento('convite_aberto', { onde: 'aparencia' }); setConvidando(true) }}>
          Indicar o Filidilo
        </button>
      </section>
      {convidando && <CompartilharImagem opcoes={[{ rotulo: 'Convite', peca: () => pecaConvite({ urlApp: urlApp('convite') }) }]} onde="convite" avisar={(texto) => nav.avisar({ texto })} fechar={() => setConvidando(false)} />}
    </main>
  )
}

function opcaoTema(o: OpcaoTema, pref: Tema, escolher: (t: Tema) => void, bloqueado = false) {
  return (
    <label class={`opcao-tema ${pref === o.valor ? 'selecionada' : ''} ${bloqueado ? 'desativada' : ''}`}>
      <input type="radio" name="tema" value={o.valor} checked={pref === o.valor} disabled={bloqueado} onChange={() => escolher(o.valor)} />
      <span class="amostra" aria-hidden="true">
        {o.cores.map((c) => (
          <span style={{ background: c }} />
        ))}
      </span>
      <span class="textos">
        <strong>
          {o.nome} {bloqueado && <span class="tema-chip">Bloqueado</span>}
        </strong>
        <small>{o.descricao}</small>
      </span>
    </label>
  )
}
