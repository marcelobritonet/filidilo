const IAS = [
  { nome: 'Gemini', url: 'https://gemini.google.com/app' },
  { nome: 'ChatGPT', url: 'https://chatgpt.com/' },
  { nome: 'Claude', url: 'https://claude.ai/new' },
  { nome: 'Copilot', url: 'https://copilot.microsoft.com/' },
]

/** Atalhos para abrir a IA escolhida numa aba nova, todos visíveis na tela. */
export function AbrirIA() {
  return (
    <div class="abrir-ia" role="group" aria-label="Abrir uma IA">
      <span class="dica">Abrir:</span>
      <div class="abrir-ia-opcoes">
        {IAS.map((ia) => (
          <a class="btn secundario compacto" href={ia.url} target="_blank" rel="noopener noreferrer">
            {ia.nome}
          </a>
        ))}
      </div>
    </div>
  )
}
