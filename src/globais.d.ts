/** Versão do app (package.json), injetada pelo Vite. */
declare const __VERSAO__: string

interface ImportMetaEnv {
  /** Chave pública do projeto no PostHog. */
  readonly VITE_POSTHOG_KEY?: string
}
