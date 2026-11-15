import { useState } from 'preact/hooks'
import type { Navegacao } from './App'
import { lerPreferencia, salvarPreferencia, type PreferenciaTema } from './tema'

const OPCOES: { valor: PreferenciaTema; nome: string; descricao: string; cores: [string, string, string] }[] = [
  { valor: 'system', nome: 'Usar tema do aparelho', descricao: 'acompanha o modo claro ou escuro do seu dispositivo', cores: ['#FFF5DC', '#111418', '#E85A36'] },
  { valor: 'light', nome: 'Claro', descricao: 'papel claro e texto escuro', cores: ['#FFF5DC', '#FFFDF7', '#263F31'] },
  { valor: 'dark', nome: 'Escuro', descricao: 'fundo grafite e texto suave para ambientes com pouca luz', cores: ['#111418', '#20262C', '#F2EEE5'] },
]

/** Escolha de aparência: salva e aplica na hora, sem botão de confirmar. */
export function Aparencia({ nav }: { nav: Navegacao }) {
  const [pref, setPref] = useState<PreferenciaTema>(lerPreferencia)

  const escolher = (p: PreferenciaTema) => {
    setPref(p)
    salvarPreferencia(p)
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
    </main>
  )
}
