// Gera public/icon-192.png e public/icon-512.png sem dependências (PNG desenhado pixel a pixel).
// Desenho: fundo marinho, cartão branco inclinado e uma onda azul. Uso: node scripts/icones.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const crcTab = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTab[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (tipo, dados) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(dados.length)
  const td = Buffer.concat([Buffer.from(tipo), dados])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}

function desenhar(N) {
  const px = Buffer.alloc(N * (N * 4 + 1))
  const fundo = [15, 42, 61]
  const branco = [255, 255, 255]
  const azul = [74, 163, 216]
  const ang = (-8 * Math.PI) / 180
  for (let y = 0; y < N; y++) {
    px[y * (N * 4 + 1)] = 0
    for (let x = 0; x < N; x++) {
      const u = x / N
      const v = y / N
      // cartão (retângulo arredondado girado)
      const cx = u - 0.5
      const cy = v - 0.46
      const rx = cx * Math.cos(ang) - cy * Math.sin(ang)
      const ry = cx * Math.sin(ang) + cy * Math.cos(ang)
      const w = 0.27
      const h = 0.2
      const r = 0.05
      const dx = Math.max(Math.abs(rx) - (w - r), 0)
      const dy = Math.max(Math.abs(ry) - (h - r), 0)
      const noCartao = Math.hypot(dx, dy) <= r
      // onda sobre o cartão
      const onda = Math.abs(ry - 0.03 * Math.sin(rx * 26)) < 0.022 && Math.abs(rx) < w - 0.06
      // onda do mar embaixo
      const mar = v > 0.76 + 0.025 * Math.sin(u * 18)
      let cor = fundo
      if (mar) cor = azul
      if (noCartao) cor = onda ? azul : branco
      const i = y * (N * 4 + 1) + 1 + x * 4
      px[i] = cor[0]
      px[i + 1] = cor[1]
      px[i + 2] = cor[2]
      px[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(N, 0)
  ihdr.writeUInt32BE(N, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))])
}

for (const n of [192, 512]) writeFileSync(new URL(`../public/icon-${n}.png`, import.meta.url), desenhar(n))
console.log('ícones gerados')
