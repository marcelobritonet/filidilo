import { useState } from 'preact/hooks'
import { evento, ligarTelemetria, telemetriaDisponivel, telemetriaLigada } from '../core/telemetria'
import type { Navegacao } from './App'
import { InstalarBloco } from './InstalarCard'
import { pecaConvite } from '../core/artes'
import { CompartilharImagem, urlApp } from './CompartilharImagem'
import { lerPreferencia, salvarPreferencia, type PreferenciaTema } from './tema'

const OPCOES: { valor: PreferenciaTema; nome: string; descricao: string; cores: [string, string, string] }[] = [
  { valor: 'system', nome: 'Usar tema do aparelho', descricao: 'acompanha o modo claro ou escuro do seu dispositivo', cores: ['#F7F9FF', '#0B1E3F', '#13A3A0'] },
  { valor: 'light', nome: 'Claro', descricao: 'papel claro e texto escuro', cores: ['#F7F9FF', '#FFFFFF', '#3A5BD9'] },
  { valor: 'dark', nome: 'Escuro', descricao: 'fundo grafite e texto suave para ambientes com pouca luz', cores: ['#0B1E3F', '#12295A', '#EEF3FB'] },
]

/** Escolha de aparência: salva e aplica na hora, sem botão de confirmar. */
export function Aparencia({ nav }: { nav: Navegacao }) {
  const [pref, setPref] = useState<PreferenciaTema>(lerPreferencia)
  const [estatisticas, setEstatisticas] = useState(telemetriaLigada)
  const [convidando, setConvidando] = useState(false)

  const escolher = (p: PreferenciaTema) => {
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
        <h1 class="titulo-barra">Aparência</h1>
        <span />
      </header>
      <fieldset class="opcoes-tema">
        <legend class="dica">Escolha como o tatino. aparece. A escolha fica salva neste aparelho.</legend>
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
            <small>Anônimas: só quais funções são usadas, nunca o texto dos cartões. Ajudam a melhorar o tatino.</small>
          </span>
        </label>
      )}
      <section class="bloco">
        <strong>Indicar o tatino.</strong>
        <p class="dica">Mande para quem também estuda: uma imagem com o link e o QR code do app.</p>
        <button class="btn secundario" onClick={() => { evento('convite_aberto', { onde: 'aparencia' }); setConvidando(true) }}>
          Indicar o tatino.
        </button>
      </section>
      {convidando && <CompartilharImagem opcoes={[{ rotulo: 'Convite', peca: () => pecaConvite({ urlApp: urlApp() }) }]} onde="convite" avisar={(texto) => nav.avisar({ texto })} fechar={() => setConvidando(false)} />}
    </main>
  )
}
