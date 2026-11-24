import { useState } from 'preact/hooks'
import { evento, ligarTelemetria, telemetriaDisponivel, telemetriaLigada } from '../core/telemetria'
import type { Navegacao } from './App'
import { InstalarBloco } from './InstalarCard'
import { pecaConvite } from '../core/artes'
import { CompartilharImagem, urlApp } from './CompartilharImagem'
import { lerPreferencia, salvarPreferencia, type Tema } from './tema'

// Amostras: fundo, cartão e a cor viva de cada tema.
const OPCOES: { valor: Tema; nome: string; descricao: string; cores: [string, string, string] }[] = [
  { valor: 'areia', nome: 'Areia', descricao: 'claro e quente, papel creme com tinta noite', cores: ['#F6F2EA', '#FFFDF9', '#0B1E3F'] },
  { valor: 'lagoa', nome: 'Lagoa', descricao: 'claro, com turquesa', cores: ['#EBF4F4', '#FCFDFD', '#0D7776'] },
  { valor: 'dark', nome: 'Noite', descricao: 'escuro, com turquesa', cores: ['#0B1E3F', '#1A2E51', '#13A3A0'] },
  { valor: 'cobalto', nome: 'Cobalto', descricao: 'escuro azul-marinho, com cobalto', cores: ['#131C30', '#1C2740', '#1F4FD1'] },
  { valor: 'pavao', nome: 'Pavão', descricao: 'escuro verde-pavão, com turquesa clara', cores: ['#092525', '#0D3635', '#56D2D0'] },
]

/** Escolha de aparência: salva e aplica na hora, sem botão de confirmar. */
export function Aparencia({ nav }: { nav: Navegacao }) {
  const [pref, setPref] = useState<Tema>(lerPreferencia)
  const [estatisticas, setEstatisticas] = useState(telemetriaLigada)
  const [convidando, setConvidando] = useState(false)

  const escolher = (p: Tema) => {
    setPref(p)
    salvarPreferencia(p)
    evento('tema_escolhido', { tema: p })
  }

  const alternarEstatisticas = (ligar: boolean) => {
    if (!ligar) evento('estatisticas_desligadas')
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
        {OPCOES.map((o) => (
          <label class={`opcao-tema ${pref === o.valor ? 'selecionada' : ''}`}>
            <input type="radio" name="tema" value={o.valor} checked={pref === o.valor} onChange={() => escolher(o.valor)} />
            <span class="amostra" aria-hidden="true">
              {o.cores.map((c) => (
                <span style={{ background: c }} />
              ))}
            </span>
            <span class="textos">
              <strong>{o.nome}</strong>
              <small>{o.descricao}</small>
            </span>
          </label>
        ))}
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
      {convidando && <CompartilharImagem opcoes={[{ rotulo: 'Convite', peca: () => pecaConvite({ urlApp: urlApp() }) }]} onde="convite" avisar={(texto) => nav.avisar({ texto })} fechar={() => setConvidando(false)} />}
    </main>
  )
}
