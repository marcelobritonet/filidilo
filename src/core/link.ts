// Envio por link: o conteúdo (o mesmo JSON do arquivo) fica 2 horas no worker do Cloudflare (worker/)
// e quem abre o link do app (…/filidilo/?b=<codigo>) baixa e vê o resumo de importação.

/**
 * Endereço do worker de links, vindo da variável VITE_LINKS_URL no build
 * (no GitHub: Settings → Secrets and variables → Actions → Variables). Sem ela, o envio por link
 * fica desligado e só aparece "Enviar como arquivo"; abrir um link avisa que não dá.
 */
export const URL_LINKS: string = (import.meta.env.VITE_LINKS_URL ?? '').replace(/\/+$/, '')

export const linkLigado = () => !!URL_LINKS

export const RE_CODIGO = /^[0-9A-Za-z]{10}$/

export interface LinkCriado {
  url: string
  codigo: string
  expiraEm: Date
}

/** Endereço do app que abre o código. */
export function urlDoApp(codigo: string, origem = location.origin, base = import.meta.env.BASE_URL): string {
  return `${origem}${base}?b=${codigo}`
}

/** Quanto o link vale: 2 horas (enviar) ou 7 dias (desafio, que vai para story e grupo). */
export type Validade = '2h' | '7d'

/** Sobe o conteúdo e devolve o link do app. Lança erro com mensagem em português. */
export async function criarLink(texto: string, f: typeof fetch = fetch, validade: Validade = '2h'): Promise<LinkCriado> {
  if (!URL_LINKS) throw new Error('O envio por link não está disponível.')
  let r: Response
  try {
    r = await f(`${URL_LINKS}/l${validade === '2h' ? '' : `?validade=${validade}`}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: texto })
  } catch {
    throw new Error('Sem internet para gerar o link.')
  }
  if (r.status === 413) throw new Error('O baralho é grande demais para enviar por link. Envie como arquivo.')
  if (r.status === 429) throw new Error('Muitos links em pouco tempo. Espere um minuto.')
  if (!r.ok) throw new Error('Não consegui gerar o link agora.')
  const d = (await r.json()) as { codigo: string; expiraEm: string }
  return { codigo: d.codigo, url: urlDoApp(d.codigo), expiraEm: new Date(d.expiraEm) }
}

/** Por que o link não abriu: decide o título e o texto do aviso. */
export type MotivoLink = 'expirou' | 'internet' | 'outro'

export class ErroLink extends Error {
  constructor(
    mensagem: string,
    readonly motivo: MotivoLink,
  ) {
    super(mensagem)
  }
}

/** Baixa o conteúdo de um código. Lança ErroLink com mensagem em português. */
export async function abrirLink(codigo: string, f: typeof fetch = fetch): Promise<string> {
  if (!RE_CODIGO.test(codigo)) throw new ErroLink('Este link não é do Filidilo.', 'outro')
  if (!URL_LINKS) throw new ErroLink('Esta versão do app não abre links.', 'outro')
  let r: Response
  try {
    r = await f(`${URL_LINKS}/l/${codigo}`)
  } catch {
    throw new ErroLink('Sem internet para abrir o link.', 'internet')
  }
  if (r.status === 404) throw new ErroLink('Este link expirou. Peça um novo a quem enviou.', 'expirou')
  if (!r.ok) throw new ErroLink('Não consegui abrir o link agora. Tente de novo.', 'outro')
  return r.text()
}
