// Desenha a imagem de compartilhar num <canvas>, no aparelho (nada sai dele até ela compartilhar).
import qrcode from 'qrcode-generator'
import { pseudoAleatorio, quebrar, TAMANHO, type Arte, type Formato } from '../core/artes'

// Cores do kit de marca (src/ui/estilo.css).
const COR = { fundo: '#263F31', fundo2: '#1D3226', creme: '#FFF5DC', ouro: '#D7A453', laranja: '#E85A36', suave: '#B9C4B5', escuro: '#20262C' }
const SERIFA = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Símbolo do tatino. (os mesmos caminhos de src/assets/brand/simbolo.svg, em 512×512). */
function simbolo(ctx: CanvasRenderingContext2D, x: number, y: number, tam: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(tam / 512, tam / 512)
  ctx.fillStyle = '#1A2C22'
  ctx.beginPath()
  ctx.roundRect(0, 0, 512, 512, 116)
  ctx.fill()
  ctx.fillStyle = COR.ouro
  ctx.fill(new Path2D('M116 153q0-30 34-30h215v262H150q-34 0-34-34z'))
  const folha = new Path2D('M365 153q0-30-34-30H150v262h181q34 0 34-34z')
  ctx.fillStyle = COR.escuro
  ctx.fill(folha)
  ctx.strokeStyle = COR.laranja
  ctx.lineWidth = 15
  ctx.stroke(folha)
  ctx.strokeStyle = '#F2EEE5'
  ctx.lineWidth = 18
  ctx.lineCap = 'round'
  ctx.stroke(new Path2D('M189 195h122M189 243h87M189 314q41-39 85 0'))
  ctx.restore()
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
  ctx.fillStyle = '#111418'
  for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (q.isDark(l, c)) ctx.fillRect(x + margem + c * celula, y + margem + l * celula, Math.ceil(celula), Math.ceil(celula))
}

function confete(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = pseudoAleatorio(7)
  const cores = [COR.ouro, COR.laranja, COR.creme, '#7DBD99']
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
      texto(a.selo.toUpperCase(), `700 ${seloPx}px ${SANS}`, '#FFFFFF', y + 19 * e)
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
          ctx.beginPath()
          ctx.arc(x + bola / 2, y + bola / 2, bola / 2, 0, Math.PI * 2)
          ctx.fillStyle = d.estudou ? COR.ouro : 'rgba(255,245,220,.12)'
          ctx.fill()
          ctx.font = `700 ${36 * e}px ${SANS}`
          ctx.fillStyle = d.estudou ? COR.fundo2 : COR.suave
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
  ctx.font = `700 ${marcaTam * 0.62}px ${SERIFA}`
  const nomeL = ctx.measureText('tatino.').width
  const marcaL = marcaTam + 22 + nomeL
  simbolo(ctx, w / 2 - marcaL / 2, topo, marcaTam)
  ctx.fillStyle = COR.creme
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('tatino.', w / 2 - marcaL / 2 + marcaTam + 22, topo + marcaTam / 2 + 2)

  // Endereço embaixo.
  ctx.font = `500 ${quadrado ? 30 : 36}px ${SANS}`
  ctx.fillStyle = COR.suave
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('marcelobritonet.github.io/tatino', w / 2, h - base)

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
