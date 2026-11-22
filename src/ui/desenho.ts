// Desenha a imagem de compartilhar num <canvas>, no aparelho (nada sai dele até ela compartilhar).
import qrcode from 'qrcode-generator'
import { pseudoAleatorio, quebrar, TAMANHO, type Arte, type Formato } from '../core/artes'

import { GOTA, MARCA, NOME } from './marcaFormas'

// Paleta Noite do Filidilo: a imagem de compartilhar usa sempre a Noite, com o app em qualquer tema.
const COR = { fundo: MARCA.noite, fundo2: '#081631', creme: MARCA.nevoa, ouro: MARCA.bronze, laranja: MARCA.turquesa, sobreLaranja: '#06142B', suave: '#A9B8D9' }
const SERIFA = 'Sora, system-ui, -apple-system, "Segoe UI", sans-serif'
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Ícone do Filidilo (quadrado noite com a pena), com lado `tam`. */
function simbolo(ctx: CanvasRenderingContext2D, x: number, y: number, tam: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(tam / 100, tam / 100)
  ctx.fillStyle = '#12295A'
  ctx.beginPath()
  ctx.roundRect(0, 0, 100, 100, 22.6)
  ctx.fill()
  ctx.translate(14, 13)
  ctx.scale(0.72, 0.72)
  ctx.fillStyle = MARCA.turquesa
  ctx.fill(new Path2D(GOTA))
  const elipse = (cy: number, rx: number, ry: number, cor: string) => {
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.ellipse(50, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  elipse(62, 16, 18, MARCA.bronze)
  elipse(63, 10.5, 12, MARCA.cobalto)
  elipse(64, 4.5, 4.5, MARCA.nevoa)
  ctx.restore()
}

/** Ocelo de quatro anéis com centro em (cx, cy). */
function ocelo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (const [f, cor] of [[1, MARCA.turquesa], [0.6, MARCA.bronze], [0.4, MARCA.cobalto], [0.16, MARCA.noite]] as const) {
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.arc(cx, cy, r * f, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Nome "filidilo" em curvas, com a linha de base em `y` e a altura das letras altas `alt`. Devolve a largura. */
function nome(ctx: CanvasRenderingContext2D, x: number, y: number, alt: number, medir = false): number {
  const [, topo, larg] = NOME.caixa
  const k = alt / -topo
  if (medir) return larg * k
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.fillStyle = COR.creme
  ctx.fill(new Path2D(NOME.letras))
  ctx.restore()
  ocelo(ctx, x + NOME.ocelo.cx * k, y + NOME.ocelo.cy * k, NOME.ocelo.r * k)
  return larg * k
}

function qr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, tam: number) {
  const q = qrcode(0, 'M')
  q.addData(url)
  q.make()
  const n = q.getModuleCount()
  const margem = tam * 0.07
  const celula = (tam - 2 * margem) / n
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(x, y, tam, tam, tam * 0.06)
  ctx.fill()
  ctx.fillStyle = MARCA.noite
  for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (q.isDark(l, c)) ctx.fillRect(x + margem + c * celula, y + margem + l * celula, Math.ceil(celula), Math.ceil(celula))
}

function confete(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = pseudoAleatorio(7)
  const cores = [MARCA.turquesa, MARCA.bronze, MARCA.cobalto, COR.creme]
  for (let i = 0; i < 70; i++) {
    // Mais confete nas bordas de cima, longe do centro onde vai o texto.
    const x = r() * w
    const y = r() < 0.7 ? r() * h * 0.28 : h * 0.72 + r() * h * 0.2
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(r() * Math.PI)
    ctx.globalAlpha = 0.55 + r() * 0.4
    ctx.fillStyle = cores[i % cores.length]
    const t = 10 + r() * 16
    if (i % 3 === 0) {
      ctx.beginPath()
      ctx.arc(0, 0, t / 2.4, 0, Math.PI * 2)
      ctx.fill()
    } else ctx.fillRect(-t / 2, -t / 5, t, t / 2.5)
    ctx.restore()
  }
}

interface Bloco {
  altura: number
  desenhar: (y: number) => void
}

/** Monta os blocos de cima para baixo numa escala; quem chama reduz a escala até caber. */
function blocos(ctx: CanvasRenderingContext2D, a: Arte, w: number, e: number, quadrado: boolean): Bloco[] {
  const larg = w - 2 * 110
  const cx = w / 2
  const l: Bloco[] = []
  const texto = (s: string, fonte: string, cor: string, y: number) => {
    ctx.font = fonte
    ctx.fillStyle = cor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(s, cx, y)
  }
  const paragrafo = (s: string, px: number, fonte: (px: number) => string, cor: string, maxLinhas: number, entre = 1.3) => {
    ctx.font = fonte(px)
    const linhas = quebrar(s, larg, (t) => ctx.measureText(t).width, maxLinhas)
    l.push({ altura: linhas.length * px * entre, desenhar: (y) => linhas.forEach((ln, i) => texto(ln, fonte(px), cor, y + i * px * entre)) })
  }
  const espaco = (px: number) => l.push({ altura: px * e, desenhar: () => undefined })

  // Selo
  const seloPx = 38 * e
  ctx.font = `700 ${seloPx}px ${SANS}`
  const seloL = ctx.measureText(a.selo.toUpperCase()).width + 64 * e
  l.push({
    altura: seloPx + 36 * e,
    desenhar: (y) => {
      ctx.fillStyle = COR.laranja
      ctx.beginPath()
      ctx.roundRect(cx - seloL / 2, y, seloL, seloPx + 36 * e, (seloPx + 36 * e) / 2)
      ctx.fill()
      texto(a.selo.toUpperCase(), `700 ${seloPx}px ${SANS}`, COR.sobreLaranja, y + 19 * e)
    },
  })

  if (a.titulo) {
    espaco(44)
    paragrafo(a.titulo, 62 * e, (px) => `700 ${px}px ${SERIFA}`, COR.creme, 3, 1.18)
  }
  if (a.destaque) {
    espaco(a.titulo ? 36 : 60)
    const px = (a.destaque.length > 5 ? 170 : 250) * e
    l.push({ altura: px * 1.02, desenhar: (y) => texto(a.destaque!, `700 ${px}px ${SERIFA}`, COR.ouro, y) })
  }
  if (a.legenda) {
    espaco(8)
    paragrafo(a.legenda, 52 * e, (px) => `600 ${px}px ${SANS}`, COR.creme, 2)
  }
  if (a.texto) {
    espaco(48)
    const px = (a.texto.length > 160 ? 48 : a.texto.length > 80 ? 56 : 66) * e
    paragrafo(a.texto, px, (p) => `700 ${p}px ${SERIFA}`, COR.creme, quadrado ? 6 : 9, 1.28)
  }
  if (a.dias) {
    espaco(48)
    const bola = 96 * e
    const gap = 22 * e
    const total = a.dias.length * bola + (a.dias.length - 1) * gap
    l.push({
      altura: bola,
      desenhar: (y) => {
        a.dias!.forEach((d, i) => {
          const x = cx - total / 2 + i * (bola + gap)
          if (d.estudou) ocelo(ctx, x + bola / 2, y + bola / 2, bola / 2)
          else {
            ctx.beginPath()
            ctx.arc(x + bola / 2, y + bola / 2, bola / 2, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(238,243,251,.12)'
            ctx.fill()
          }
          ctx.font = `700 ${36 * e}px ${SANS}`
          ctx.fillStyle = d.estudou ? COR.creme : COR.suave
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(d.rotulo, x + bola / 2, y + bola / 2 + 2 * e)
        })
      },
    })
  }
  if (a.linhas?.length) {
    espaco(44)
    a.linhas.forEach((ln, i) => {
      if (i) espaco(14)
      paragrafo(ln, 46 * e, (px) => `500 ${px}px ${SANS}`, COR.suave, 2)
    })
  }
  if (a.qr) {
    espaco(56)
    const tam = (quadrado ? 250 : 340) * e
    l.push({ altura: tam, desenhar: (y) => qr(ctx, a.qr!, cx - tam / 2, y, tam) })
  }
  if (a.chamada) {
    espaco(a.qr ? 36 : 60)
    paragrafo(a.chamada, 48 * e, (px) => `700 ${px}px ${SANS}`, COR.creme, 2)
  }
  return l
}

/** Desenha a arte inteira no canvas (que fica do tamanho do formato). */
export function desenhar(canvas: HTMLCanvasElement, a: Arte, formato: Formato): void {
  const { w, h } = TAMANHO[formato]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const quadrado = formato === 'quadrado'

  const fundo = ctx.createLinearGradient(0, 0, 0, h)
  fundo.addColorStop(0, COR.fundo)
  fundo.addColorStop(1, COR.fundo2)
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, w, h)
  if (a.confete) confete(ctx, w, h)

  // Story: o Instagram cobre ~250 px em cima e embaixo; o conteúdo fica no meio.
  const topo = quadrado ? 70 : 230
  const base = quadrado ? 70 : 250
  const marcaTam = quadrado ? 72 : 96

  // Marca no topo.
  const altNome = marcaTam * 0.62
  const nomeL = nome(ctx, 0, 0, altNome, true)
  const marcaL = marcaTam + 24 + nomeL
  simbolo(ctx, w / 2 - marcaL / 2, topo, marcaTam)
  nome(ctx, w / 2 - marcaL / 2 + marcaTam + 24, topo + marcaTam / 2 + altNome / 2, altNome)

  // Endereço embaixo.
  ctx.font = `500 ${quadrado ? 30 : 36}px ${SANS}`
  ctx.fillStyle = COR.suave
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('marcelobritonet.github.io/filidilo', w / 2, h - base)

  // Miolo: diminui a escala até caber entre a marca e o endereço.
  const ini = topo + marcaTam + (quadrado ? 50 : 90)
  const fim = h - base - (quadrado ? 70 : 110)
  // Começa grande (story com pouco conteúdo fica vazio) e diminui até caber.
  let e = quadrado ? 1 : 1.3
  let l = blocos(ctx, a, w, e, quadrado)
  const altura = (b: Bloco[]) => b.reduce((s, x) => s + x.altura, 0)
  while (altura(l) > fim - ini && e > 0.45) {
    e -= 0.05
    l = blocos(ctx, a, w, e, quadrado)
  }
  let y = ini + Math.max(0, (fim - ini - altura(l)) / 2)
  for (const b of l) {
    b.desenhar(y)
    y += b.altura
  }
}

/** A imagem como arquivo PNG. */
export async function imagemPng(a: Arte, formato: Formato, nome: string): Promise<File> {
  const canvas = document.createElement('canvas')
  desenhar(canvas, a, formato)
  const blob = await new Promise<Blob>((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não consegui gerar a imagem.'))), 'image/png'))
  return new File([blob], nome, { type: 'image/png' })
}
