/** Versão do app (package.json), injetada pelo Vite. */
declare const __VERSAO__: string

interface ImportMetaEnv {
  /** Chave pública do projeto no PostHog. */
  readonly VITE_POSTHOG_KEY?: string
  /** Endereço do worker de links temporários (worker/). */
  readonly VITE_LINKS_URL?: string
}
