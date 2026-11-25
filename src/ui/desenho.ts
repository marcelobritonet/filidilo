// Desenha a imagem de compartilhar num <canvas>, no aparelho (nada sai dele até ela compartilhar).
import qrcode from 'qrcode-generator'
import { ENDERECO_VISIVEL } from '../core/link'
import { pseudoAleatorio, quebrar, TAMANHO, type Arte, type FimSessao, type Formato } from '../core/artes'
import { PENAS, quadroComemoracao, DURACAO_COMEMORACAO } from './danca'

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
function nome(ctx: CanvasRenderingContext2D, x: number, y: number, alt: number, medir = false, cor: string = COR.creme): number {
  const [, topo, larg] = NOME.caixa
  const k = alt / -topo
  if (medir) return larg * k
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.fillStyle = cor
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
  const trilho = (x: number, y: number, largura: number, alt: number, f: number, cor: string) => {
    ctx.fillStyle = 'rgba(238,243,251,.12)'
    ctx.beginPath()
    ctx.roundRect(x, y, largura, alt, alt / 2)
    ctx.fill()
    if (f <= 0) return
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.roundRect(x, y, Math.max(alt, largura * Math.min(1, f)), alt, alt / 2)
    ctx.fill()
  }
  if (a.fracao !== undefined) {
    espaco(40)
    const alt = 34 * e
    l.push({
      altura: alt,
      desenhar: (y) => trilho(cx - larg / 2, y, larg, alt, a.fracao!, MARCA.turquesa),
    })
  }
  if (a.barras?.length) {
    espaco(56)
    const alt = (quadrado ? 220 : 300) * e
    const rotuloPx = 32 * e
    const gap = (a.barras.length > 8 ? 14 : 24) * e
    const col = Math.min(110 * e, (larg - (a.barras.length - 1) * gap) / a.barras.length)
    const total = a.barras.length * col + (a.barras.length - 1) * gap
    const max = Math.max(1, ...a.barras.map((b) => b.valor))
    l.push({
      altura: alt + rotuloPx + 18 * e,
      desenhar: (y) => {
        a.barras!.forEach((b, i) => {
          const x = cx - total / 2 + i * (col + gap)
          ctx.fillStyle = 'rgba(238,243,251,.08)'
          ctx.beginPath()
          ctx.roundRect(x, y, col, alt, 14 * e)
          ctx.fill()
          if (b.valor) {
            const h = Math.max(14 * e, (alt * b.valor) / max)
            ctx.fillStyle = b.atual ? MARCA.bronze : MARCA.turquesa
            ctx.beginPath()
            ctx.roundRect(x, y + alt - h, col, h, 14 * e)
            ctx.fill()
          }
          ctx.font = `${b.atual ? 700 : 500} ${rotuloPx}px ${SANS}`
          ctx.fillStyle = b.atual ? COR.creme : COR.suave
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText(b.rotulo, x + col / 2, y + alt + 18 * e)
        })
      },
    })
  }
  if (a.itens?.length) {
    espaco(56)
    const px = 44 * e
    const alt = 16 * e
    a.itens.forEach((it, i) => {
      if (i) espaco(34)
      l.push({
        altura: px * 1.2 + 14 * e + alt,
        desenhar: (y) => {
          ctx.textBaseline = 'top'
          ctx.font = `600 ${px}px ${SANS}`
          ctx.textAlign = 'right'
          ctx.fillStyle = COR.suave
          ctx.fillText(it.valor, cx + larg / 2, y)
          const valorL = ctx.measureText(it.valor).width
          ctx.font = `700 ${px}px ${SANS}`
          ctx.fillStyle = COR.creme
          ctx.textAlign = 'left'
          const [nomeCabe] = quebrar(it.nome, larg - valorL - 30 * e, (t) => ctx.measureText(t).width, 1)
          ctx.fillText(nomeCabe ?? '', cx - larg / 2, y)
          trilho(cx - larg / 2, y + px * 1.2 + 14 * e, larg, alt, it.fracao, MARCA.turquesa)
        },
      })
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
  if (a.fim) return desenharFim(ctx, a, a.fim, w, h, quadrado)

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
  ctx.fillText(ENDERECO_VISIVEL, w / 2, h - base)

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

// ——— Fim de sessão: o visual claro da tela (Areia), em três layouts ———

const CLARO = { fundo: '#F6F2EA', cartao: '#FFFDF9', borda: '#E3DBCC', tinta: MARCA.noite, suave: '#4A566C', ouro: MARCA.bronze }

// Ordem das penas: as de fora atrás, a do meio por último (como em Leque.tsx).
const ORDEM_PENAS = (() => {
  const c = (PENAS - 1) / 2
  const o: number[] = []
  for (let d = c; d >= 0; d--) {
    o.push(c - d)
    if (d) o.push(c + d)
  }
  return o
})()

/** O leque aberto do fim da sessão (o último quadro da comemoração), com `largura` e topo em `y`. */
function leque(ctx: CanvasRenderingContext2D, cx: number, y: number, largura: number) {
  const q = quadroComemoracao(DURACAO_COMEMORACAO)
  const k = largura / 250 // a caixa do Pavao: viewBox -75 -2 250 130
  const emVolta = (graus: number, escala: number) => {
    ctx.translate(50, 126)
    ctx.rotate((graus * Math.PI) / 180)
    ctx.scale(escala, escala)
    ctx.translate(-50, -126)
  }
  ctx.save()
  ctx.translate(cx - largura / 2 + 75 * k, y + 2 * k)
  ctx.scale(k, k)
  ctx.translate(0, q.subida)
  emVolta(q.anguloFeixe, q.escalaFeixe)
  const gota = new Path2D(GOTA)
  for (const i of ORDEM_PENAS) {
    const p = q.penas[i]
    ctx.save()
    emVolta(p.angulo, p.escala)
    ctx.fillStyle = MARCA.turquesa
    ctx.fill(gota)
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
  ctx.restore()
}
/** Confete só nas faixas dos lados e acima do conteúdo, para não cair em cima do texto. */
function confeteNasBordas(ctx: CanvasRenderingContext2D, w: number, h: number, lado: number, topo: number) {
  const r = pseudoAleatorio(7)
  const cores = [MARCA.turquesa, MARCA.bronze, MARCA.cobalto]
  for (let i = 0; i < 64; i++) {
    const emCima = r() < 0.4
    const x = emCima ? r() * w : r() < 0.5 ? r() * lado : w - r() * lado
    const y = emCima ? r() * topo : r() * h
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
const alturaLeque = (largura: number) => (largura * 130) / 250

const somar = (b: Bloco[]) => b.reduce((s, x) => s + x.altura, 0)

/** Monta com a maior escala que cabe entre `ini` e `fim` e desenha no meio. */
function encaixar(montar: (e: number) => Bloco[], ini: number, fim: number, e0: number) {
  let e = e0
  let l = montar(e)
  while (somar(l) > fim - ini && e > 0.4) {
    e -= 0.05
    l = montar(e)
  }
  let y = ini + Math.max(0, (fim - ini - somar(l)) / 2)
  for (const b of l) {
    b.desenhar(y)
    y += b.altura
  }
}

/** Fonte que cabe na largura: diminui `px` até `s` caber. */
function caber(ctx: CanvasRenderingContext2D, s: string, px: number, fonte: (px: number) => string, largura: number): number {
  ctx.font = fonte(px)
  const m = ctx.measureText(s).width
  return m > largura ? Math.floor((px * largura) / m) : px
}

function cartao(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, borda: string, espessura: number) {
  ctx.fillStyle = CLARO.cartao
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  ctx.strokeStyle = borda
  ctx.lineWidth = espessura
  ctx.beginPath()
  ctx.roundRect(x + espessura / 2, y + espessura / 2, w - espessura, h - espessura, r)
  ctx.stroke()
}

function espacado(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(px * 0.08).toFixed(1)}px`
}
function semEspaco(ctx: CanvasRenderingContext2D) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
}

function desenharFim(ctx: CanvasRenderingContext2D, a: Arte, f: FimSessao, w: number, h: number, quadrado: boolean) {
  ctx.fillStyle = CLARO.fundo
  ctx.fillRect(0, 0, w, h)
  const topo = quadrado ? 70 : 230
  const base = quadrado ? 70 : 250
  const margem = quadrado ? 90 : 110
  if (a.confete) confeteNasBordas(ctx, w, h, margem - 14, topo - 10)
  const larg = w - 2 * margem
  const cx = w / 2
  const fonteT = (peso: number) => (px: number) => `${peso} ${px}px ${SERIFA}`
  const fonteS = (peso: number) => (px: number) => `${peso} ${px}px ${SANS}`

  const texto = (s: string, fonte: string, cor: string, x: number, y: number, alinhar: CanvasTextAlign = 'center') => {
    ctx.font = fonte
    ctx.fillStyle = cor
    ctx.textAlign = alinhar
    ctx.textBaseline = 'top'
    ctx.fillText(s, x, y)
  }
  const espaco = (l: Bloco[], px: number) => l.push({ altura: px, desenhar: () => undefined })
  const paragrafo = (l: Bloco[], s: string, px: number, fonte: (px: number) => string, cor: string, maxLinhas: number, x = cx, alinhar: CanvasTextAlign = 'center', entre = 1.25) => {
    ctx.font = fonte(px)
    const linhas = quebrar(s, larg, (t) => ctx.measureText(t).width, maxLinhas)
    l.push({ altura: linhas.length * px * entre, desenhar: (y) => linhas.forEach((ln, i) => texto(ln, fonte(px), cor, x, y + i * px * entre, alinhar)) })
  }
  /** Ocelo + "N dias", centrado em `x`. */
  const ofensiva = (y: number, px: number, x: number) => {
    const rotulo = `${f.dias} ${f.dias === 1 ? 'dia' : 'dias'}`
    ctx.font = `700 ${px}px ${SERIFA}`
    const r = px * 0.55
    const tl = ctx.measureText(rotulo).width
    const total = 2 * r + px * 0.3 + tl
    ocelo(ctx, x - total / 2 + r, y + px * 0.55, r)
    texto(rotulo, `700 ${px}px ${SERIFA}`, CLARO.tinta, x - total / 2 + 2 * r + px * 0.3, y, 'left')
  }
  const fraseOfensiva = f.dias === 1 ? 'Ofensiva começada' : 'dias seguidos estudando'

  /** Cartão de conquista (borda bronze): etiqueta, número grande e legenda. */
  const blocoConquista = (l: Bloco[], e: number, etiqueta: string, destaque: string, legenda: string, grande: boolean) => {
    const etqPx = (grande ? 36 : 30) * e
    let numPx = (grande ? 230 : 130) * e
    const legPx = (grande ? 52 : 42) * e
    const maxL = grande ? larg * 0.86 : larg * 0.7
    numPx = caber(ctx, destaque, numPx, fonteT(700), maxL - 80 * e)
    ctx.font = fonteS(500)(legPx)
    const legLinhas = quebrar(legenda, maxL - 80 * e, (t) => ctx.measureText(t).width, 2)
    const larguraConteudo = Math.max(...legLinhas.map((t) => ctx.measureText(t).width), (ctx.font = fonteT(700)(numPx), ctx.measureText(destaque).width))
    const cw = grande ? maxL : Math.min(maxL, larguraConteudo + 140 * e)
    const pad = (grande ? 56 : 36) * e
    const ch = pad + etqPx * 1.2 + 10 * e + numPx * 1.05 + legLinhas.length * legPx * 1.25 + pad
    l.push({
      altura: ch,
      desenhar: (y) => {
        cartao(ctx, cx - cw / 2, y, cw, ch, (grande ? 48 : 36) * e, CLARO.ouro, (grande ? 7 : 5) * e)
        espacado(ctx, etqPx)
        texto(etiqueta.toUpperCase(), fonteS(700)(etqPx), CLARO.tinta, cx, y + pad)
        semEspaco(ctx)
        const yNum = y + pad + etqPx * 1.2 + 10 * e
        texto(destaque, fonteT(700)(numPx), CLARO.tinta, cx, yNum)
        legLinhas.forEach((t, i) => texto(t, fonteS(500)(legPx), CLARO.tinta, cx, yNum + numPx * 1.05 + i * legPx * 1.25))
      },
    })
  }

  /** Logotipo "filidilo" centrado com a linha de base em `y`, e o endereço embaixo. */
  const rodape = (alinhar: 'center' | 'left') => {
    const alt = quadrado ? 40 : 52
    const ender = ENDERECO_VISIVEL
    const enderPx = quadrado ? 28 : 34
    const yEnder = h - base
    ctx.font = `500 ${enderPx}px ${SANS}`
    ctx.fillStyle = CLARO.suave
    ctx.textAlign = alinhar
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(ender, alinhar === 'center' ? cx : margem, yEnder)
    if (alinhar === 'center') {
      const nl = nome(ctx, 0, 0, alt, true)
      nome(ctx, cx - nl / 2, yEnder - enderPx - 26, alt, false, CLARO.tinta)
    }
  }
  const alturaRodape = (quadrado ? 40 : 52) + (quadrado ? 28 : 34) + 26

  if (f.layout === 'tela') {
    rodape('center')
    encaixar(
      (e) => {
        const l: Bloco[] = []
        const lw = 340 * e
        l.push({ altura: alturaLeque(lw), desenhar: (y) => leque(ctx, cx, y, lw) })
        espaco(l, 24 * e)
        paragrafo(l, f.titulo, 78 * e, fonteT(700), CLARO.tinta, 2, cx, 'center', 1.15)
        if (f.baralho) {
          espaco(l, 14 * e)
          paragrafo(l, f.baralho, 44 * e, fonteS(600), CLARO.tinta, 2)
        }
        espaco(l, 18 * e)
        paragrafo(l, f.tempo ? `${f.placar}, ${f.tempo}.` : `${f.placar}.`, 40 * e, fonteS(500), CLARO.suave, 2)
        espaco(l, 40 * e)
        const pctTxt = `${f.pct}% de acerto`
        const pctPx = caber(ctx, pctTxt, 112 * e, fonteT(700), larg)
        l.push({ altura: pctPx * 1.1, desenhar: (y) => texto(pctTxt, fonteT(700)(pctPx), CLARO.tinta, cx, y) })
        if (f.dias > 0) {
          espaco(l, 48 * e)
          const px = 60 * e
          l.push({ altura: px * 1.15, desenhar: (y) => ofensiva(y, px, cx) })
          espaco(l, 8 * e)
          paragrafo(l, fraseOfensiva, 40 * e, fonteS(500), CLARO.suave, 1)
        }
        if (f.conquista) {
          espaco(l, 50 * e)
          blocoConquista(l, e, 'Conquista!', f.conquista.destaque, f.conquista.legenda, false)
        }
        return l
      },
      topo,
      h - base - alturaRodape - (quadrado ? 30 : 70),
      quadrado ? 1 : 1.35,
    )
    return
  }

  if (f.layout === 'conquista') {
    rodape('center')
    encaixar(
      (e) => {
        const l: Bloco[] = []
        const lw = 520 * e
        l.push({ altura: alturaLeque(lw), desenhar: (y) => leque(ctx, cx, y, lw) })
        espaco(l, 36 * e)
        if (f.conquista) blocoConquista(l, e, 'Conquista!', f.conquista.destaque, f.conquista.legenda, true)
        else blocoConquista(l, e, f.titulo, `${f.pct}%`, 'de acerto', true)
        if (f.baralho) {
          espaco(l, 34 * e)
          paragrafo(l, f.baralho, 46 * e, fonteS(600), CLARO.tinta, 2)
        }
        // Pílulas: % de acerto (se o cartão é da conquista) e a ofensiva.
        const pilulas: { txt: string; ocelo: boolean }[] = []
        if (f.conquista) pilulas.push({ txt: `${f.pct}% de acerto`, ocelo: false })
        if (f.dias > 0) pilulas.push({ txt: `${f.dias} ${f.dias === 1 ? 'dia' : 'dias'}`, ocelo: true })
        if (pilulas.length) {
          espaco(l, 44 * e)
          const px = 42 * e
          const ph = px * 2.1
          const gap = 24 * e
          ctx.font = fonteS(700)(px)
          const larguras = pilulas.map((p) => ctx.measureText(p.txt).width + 2 * px * 0.9 + (p.ocelo ? px * 1.3 : 0))
          const total = larguras.reduce((s, x) => s + x, 0) + gap * (pilulas.length - 1)
          l.push({
            altura: ph,
            desenhar: (y) => {
              let x = cx - total / 2
              pilulas.forEach((p, i) => {
                cartao(ctx, x, y, larguras[i], ph, ph / 2, CLARO.borda, 3 * e)
                let tx = x + px * 0.9
                if (p.ocelo) {
                  ocelo(ctx, tx + px * 0.5, y + ph / 2, px * 0.5)
                  tx += px * 1.3
                }
                ctx.font = fonteS(700)(px)
                ctx.fillStyle = CLARO.tinta
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.fillText(p.txt, tx, y + ph / 2 + 2 * e)
                x += larguras[i] + gap
              })
            },
          })
        }
        espaco(l, 24 * e)
        paragrafo(l, `${f.certos} de ${f.total} ${f.total === 1 ? 'cartão' : 'cartões'} certos nesta sessão${f.tempo ? `, ${f.tempo}` : ''}`, 38 * e, fonteS(500), CLARO.suave, 2)
        return l
      },
      topo,
      h - base - alturaRodape - (quadrado ? 30 : 70),
      quadrado ? 1 : 1.3,
    )
    return
  }

  // Painel: logotipo no topo, título à esquerda e uma grade de números.
  const marcaAlt = quadrado ? 44 : 56
  const lw = marcaAlt * 2.6
  leque(ctx, margem + lw / 2, topo, lw)
  const nomeAlt = marcaAlt * 0.9
  nome(ctx, margem + lw + 22, topo + alturaLeque(lw) * 0.72, nomeAlt, false, CLARO.tinta)
  rodape('left')
  type Celula = { numero: string; legenda: string; ouro?: boolean; ocelo?: boolean }
  const celulas: Celula[] = [{ numero: `${f.pct}%`, legenda: 'de acerto' }]
  if (f.conquista) celulas.push({ numero: f.conquista.destaque, legenda: f.conquista.legenda, ouro: true })
  celulas.push({ numero: `${f.certos}/${f.total}`, legenda: f.total === 1 ? 'resposta certa' : 'respostas certas' })
  if (f.dias > 0) celulas.push({ numero: String(f.dias), legenda: f.dias === 1 ? 'dia seguido' : 'dias seguidos', ocelo: true })
  encaixar(
    (e) => {
      const l: Bloco[] = []
      paragrafo(l, f.titulo, 104 * e, fonteT(700), CLARO.tinta, 3, margem, 'left', 1.1)
      espaco(l, 18 * e)
      paragrafo(l, f.baralho ?? f.placar, 42 * e, fonteS(f.baralho ? 600 : 500), f.baralho ? CLARO.tinta : CLARO.suave, 2, margem, 'left')
      if (f.tempo) {
        espaco(l, 8 * e)
        paragrafo(l, `Terminou ${f.tempo}`, 38 * e, fonteS(500), CLARO.suave, 1, margem, 'left')
      }
      espaco(l, 64 * e)
      const gap = 32 * e
      const cw = (larg - gap) / 2
      const ch = (quadrado ? 250 : 300) * e
      const linhas = Math.ceil(celulas.length / 2)
      l.push({
        altura: linhas * ch + (linhas - 1) * gap,
        desenhar: (y0) => {
          celulas.forEach((c, i) => {
            const sozinha = i === celulas.length - 1 && celulas.length % 2 === 1
            const col = i % 2
            const lin = Math.floor(i / 2)
            const x = margem + col * (cw + gap)
            const y = y0 + lin * (ch + gap)
            const largura = sozinha ? larg : cw
            cartao(ctx, x, y, largura, ch, 36 * e, c.ouro ? CLARO.ouro : CLARO.borda, (c.ouro ? 6 : 3) * e)
            const pad = 40 * e
            const legPx = 38 * e
            ctx.font = fonteS(500)(legPx)
            const legLinhas = quebrar(c.legenda, largura - 2 * pad, (t) => ctx.measureText(t).width, 2)
            const r = c.ocelo ? 46 * e : 0
            const numPx = caber(ctx, c.numero, 116 * e, fonteT(700), largura - 2 * pad - (r ? 2 * r + 20 * e : 0))
            const yNum = y + pad
            if (c.ocelo) ocelo(ctx, x + pad + r, yNum + numPx * 0.55, r)
            texto(c.numero, fonteT(700)(numPx), CLARO.tinta, x + pad + (r ? 2 * r + 20 * e : 0), yNum, 'left')
            legLinhas.forEach((t, k) => texto(t, fonteS(500)(legPx), CLARO.suave, x + pad, y + ch - pad - (legLinhas.length - k) * legPx * 1.2, 'left'))
          })
        },
      })
      return l
    },
    topo + alturaLeque(lw) + (quadrado ? 40 : 80),
    h - base - (quadrado ? 34 : 34) - (quadrado ? 40 : 80),
    quadrado ? 1 : 1.3,
  )
}
