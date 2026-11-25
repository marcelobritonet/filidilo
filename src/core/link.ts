// Envio por link: o conteúdo (o mesmo JSON do arquivo) fica 30 dias no worker do Cloudflare (worker/).
// O link que vai para a conversa é o da página pública (VITE_LINK_PUBLICO/<codigo>, o worker "filidilo"), que mostra
// a prévia com o nome do baralho e leva ao app (…/filidilo/?b=<codigo>), que baixa e mostra o resumo de importação.
// Quem gerencia um link por baralho (reaproveitar, atualizar, renovar) é linksGuardados.ts.

/**
 * Endereço do worker de links, vindo da variável VITE_LINKS_URL no build
 * (no GitHub: Settings → Secrets and variables → Actions → Variables). Sem ela, o envio por link
 * fica desligado e só aparece "Enviar como arquivo"; abrir um link avisa que não dá.
 */
export const URL_LINKS: string = (import.meta.env.VITE_LINKS_URL ?? '').replace(/\/+$/, '')

export const linkLigado = () => !!URL_LINKS

/**
 * Endereço da página pública do link (o worker "filidilo", https://filidilo.britin.workers.dev), vindo de
 * VITE_LINK_PUBLICO no build. Sem ela (localhost), o link é o do próprio app com ?b=.
 */
export const URL_PUBLICA: string = (import.meta.env.VITE_LINK_PUBLICO ?? '').replace(/\/+$/, '')

/** Endereço escrito nas imagens de compartilhar (sem https://). Fora do build publicado, o do ar. */
export const ENDERECO_VISIVEL: string = (URL_PUBLICA || 'https://filidilo.britin.workers.dev').replace(/^https?:\/\//, '')

/**
 * Endereço do app para convites e imagens: a raiz da página pública, que leva ao app com os parâmetros.
 * A marca `?de=` diz às estatísticas por onde a pessoa chegou; o app a tira do endereço.
 */
export function urlPublicaDoApp(de: 'convite' | 'imagem', origem = location.origin, base = import.meta.env.BASE_URL, publica = URL_PUBLICA): string {
  return publica ? `${publica}/?de=${de}` : `${origem}${base}?de=${de}`
}

export const RE_CODIGO = /^[0-9A-Za-z]{10}$/

export interface LinkCriado {
  url: string
  codigo: string
  /** Segredo de quem criou: permite atualizar e apagar o link. Não vai para ninguém. */
  chave: string
  expiraEm: Date
}

/** Endereço que vai para a conversa: a página pública, ou o app com ?b= quando ela não existe. */
export function urlDoApp(codigo: string, origem = location.origin, base = import.meta.env.BASE_URL, publica = URL_PUBLICA): string {
  return publica ? `${publica}/${codigo}` : `${origem}${base}?b=${codigo}`
}

/** Quanto o link vale. Desde a v3.31.0, 30 dias (envio e desafio); o 2h fica para os apps antigos. */
export type Validade = '2h' | '7d' | '30d'

function erroDeEnvio(r: Response): Error {
  if (r.status === 413) return new Error('O baralho é grande demais para enviar por link. Envie como arquivo.')
  if (r.status === 429) return new Error('Muitos links em pouco tempo. Espere um minuto.')
  return new Error('Não consegui gerar o link agora.')
}

/** Sobe o conteúdo e devolve o link. Lança erro com mensagem em português. */
export async function criarLink(texto: string, f: typeof fetch = fetch, validade: Validade = '30d'): Promise<LinkCriado> {
  if (!URL_LINKS) throw new Error('O envio por link não está disponível.')
  let r: Response
  try {
    r = await f(`${URL_LINKS}/l${validade === '2h' ? '' : `?validade=${validade}`}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: texto })
  } catch {
    throw new Error('Sem internet para gerar o link.')
  }
  if (!r.ok) throw erroDeEnvio(r)
  const d = (await r.json()) as { codigo: string; chave: string; expiraEm: string }
  return { codigo: d.codigo, chave: d.chave, url: urlDoApp(d.codigo), expiraEm: new Date(d.expiraEm) }
}

/**
 * Troca o conteúdo de um link (ou, sem texto, só renova o prazo). Devolve a nova data de vencimento,
 * ou null quando o link não existe mais ou não é deste aparelho (aí o certo é criar outro).
 */
export async function atualizarLink(codigo: string, chave: string, texto = '', f: typeof fetch = fetch, validade: Validade = '30d'): Promise<Date | null> {
  if (!URL_LINKS) throw new Error('O envio por link não está disponível.')
  let r: Response
  try {
    r = await f(`${URL_LINKS}/l/${codigo}?validade=${validade}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-chave': chave }, body: texto })
  } catch {
    throw new Error('Sem internet para gerar o link.')
  }
  if (r.status === 404 || r.status === 403) return null
  if (!r.ok) throw erroDeEnvio(r)
  return new Date(((await r.json()) as { expiraEm: string }).expiraEm)
}

/** Apaga um link no worker. Sem erro: se falhar, ele vence sozinho. */
export async function apagarLink(codigo: string, chave: string, f: typeof fetch = fetch): Promise<void> {
  if (!URL_LINKS) return
  try {
    await f(`${URL_LINKS}/l/${codigo}`, { method: 'DELETE', headers: { 'x-chave': chave } })
  } catch {
    /* vence sozinho */
  }
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
