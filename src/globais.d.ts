/** Versão do app (package.json), injetada pelo Vite. */
declare const __VERSAO__: string

interface ImportMetaEnv {
  /** Chave pública do projeto no PostHog. */
  readonly VITE_POSTHOG_KEY?: string
  /** Endereço do worker de links (worker/, filidilo-links). */
  readonly VITE_LINKS_URL?: string
  /** Endereço da página pública dos links (worker "filidilo"), que vai para a conversa. */
  readonly VITE_LINK_PUBLICO?: string
}

/** P134: zoom do aparelho que o index.html desfaz (1 = nenhum). */
interface Window {
  __fatorZoom?: number
}
