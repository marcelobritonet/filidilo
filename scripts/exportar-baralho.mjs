// Gera o arquivo de baralho (mesmo formato do botão "Compartilhar") a partir de src/decks/<id>/.
// Serve para mandar correções: ela abre em "Abrir baralho recebido" → "Atualizar".
// Uso: npm run exportar-baralho -- one-piece
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const id = process.argv[2] ?? 'one-piece'
const pasta = join('src/decks', id)
const meta = JSON.parse(readFileSync(join(pasta, 'baralho.json'), 'utf8'))
const partes = readdirSync(join(pasta, 'partes')).filter((f) => f.endsWith('.json')).sort()
const cartoes = partes.flatMap((f) => JSON.parse(readFileSync(join(pasta, 'partes', f), 'utf8')).cartoes)
const baralho = { ...meta, cartoes }
const titulo = baralho.titulo.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
mkdirSync('dist-baralhos', { recursive: true })
const saida = join('dist-baralhos', `${titulo} (Tatino).txt`)
writeFileSync(saida, JSON.stringify({ app: 'tatino', tipo: 'baralho', formato: 2, baralho }))
console.log(`${saida}: ${cartoes.length} cartões`)
