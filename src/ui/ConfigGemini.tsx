import { useState } from 'preact/hooks'
import { lerConfig, mascarar, removerConfig, salvarConfig, testarChave } from '../core/ia/gemini'

const LINK_CHAVE = 'https://aistudio.google.com/apikey'

/** Guarda a chave gratuita do Gemini só neste aparelho e confere se funciona (fica dentro de "Criar com IA"). */
export function ConfigGemini({ aoMudar }: { embutido?: boolean; aoMudar: () => void }) {
  const [atual, setAtual] = useState(lerConfig)
  const [chave, setChave] = useState('')
  const [testando, setTestando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const salvarETestar = async (e: Event) => {
    e.preventDefault()
    const c = chave.trim()
    if (!c) return
    setTestando(true)
    setMsg(null)
    try {
      const modelo = await testarChave(c)
      salvarConfig({ chave: c, modelo })
      setAtual({ chave: c, modelo })
      setChave('')
      setMsg({ ok: true, texto: 'Chave salva e funcionando.' })
      aoMudar()
    } catch (err) {
      setMsg({ ok: false, texto: (err as Error).message })
    } finally {
      setTestando(false)
    }
  }

  const remover = () => {
    removerConfig()
    setAtual(null)
    setMsg({ ok: true, texto: 'Chave removida deste aparelho.' })
    aoMudar()
  }

  return (
    <div class="config-gemini">
      <p class="dica">Com uma chave gratuita do Gemini, o tatino. gera os cartões com um toque, sem copiar e colar.</p>

      {atual ? (
        <section class="bloco">
          <h2>Chave configurada</h2>
          <p>
            <code>{mascarar(atual.chave)}</code> · modelo <code>{atual.modelo}</code>
          </p>
          <button class="btn principal" onClick={aoMudar}>
            Usar o Gemini direto
          </button>
          <button class="btn secundario perigo" onClick={remover}>
            Remover a chave deste aparelho
          </button>
        </section>
      ) : (
        <section class="bloco">
          <h2>Como conseguir a chave</h2>
          <ol class="instrucoes">
            <li>
              Abra o <strong>Google AI Studio</strong> e entre com sua conta Google.
            </li>
            <li>
              Toque em <strong>Criar chave de API</strong> (Create API key) e copie a chave.
            </li>
            <li>Volte aqui, cole a chave e toque em Salvar.</li>
          </ol>
          <a class="btn secundario" href={LINK_CHAVE} target="_blank" rel="noopener noreferrer">
            Abrir o Google AI Studio
          </a>
        </section>
      )}

      <form class="bloco" onSubmit={salvarETestar}>
        <label class="campo">
          {atual ? 'Trocar por outra chave' : 'Chave do Gemini'}
          <input class="texto" type="password" autoComplete="off" spellcheck={false} value={chave} placeholder="AIza…" onInput={(e) => setChave((e.target as HTMLInputElement).value)} />
        </label>
        <button class="btn principal" type="submit" disabled={!chave.trim() || testando}>
          {testando ? 'Conferindo…' : 'Salvar e testar'}
        </button>
        {msg && (
          <p class={`resultado ${msg.ok ? 'ok' : 'erro'}`} role="status" aria-live="polite">
            {msg.ok ? '✓' : '✕'} {msg.texto}
          </p>
        )}
      </form>

      <section class="bloco">
        <h2>Privacidade</h2>
        <p class="dica">
          A chave fica só neste aparelho: não vai para o backup nem para nenhum servidor do tatino. O PDF ou texto vai direto para o Google. No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos dele: use para material de aula, não para dados pessoais.
        </p>
      </section>
    </div>
  )
}
