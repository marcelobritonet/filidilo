// "Gemini direto": instrução (+ PDF) → resposta → validação → uma nova tentativa com os erros.
import type { Baralho } from '../types'
import { gerar, type ConfigGemini, type Mensagem } from './gemini'
import { montarCorrecao } from './instrucao'
import { extrairJson, lerResposta, type RespostaLida } from './resposta'

export interface PedidoDireto {
  instrucao: string
  /** PDF em base64 (sem o prefixo data:). */
  pdf?: { base64: string; mime: string }
  destino: Pick<Baralho, 'id' | 'titulo' | 'versao' | 'temas'>
  fontePadrao?: string
  /** Avisa a tela do andamento. */
  andamento?: (etapa: 'gerando' | 'corrigindo') => void
}

export interface ResultadoDireto extends RespostaLida {
  /** Quantos cartões vieram com problema na primeira resposta. */
  corrigidos: number
}

export async function gerarDireto(cfg: ConfigGemini, p: PedidoDireto): Promise<ResultadoDireto> {
  const partes: Mensagem['parts'] = [{ text: p.instrucao }]
  if (p.pdf) partes.push({ inline_data: { mime_type: p.pdf.mime, data: p.pdf.base64 } })
  const conversa: Mensagem[] = [{ role: 'user', parts: partes }]

  p.andamento?.('gerando')
  const texto1 = await gerar(cfg, conversa)
  const r1 = lerResposta(extrairJson(texto1), p.destino, p.fontePadrao)
  const ruins = r1.cartoes.filter((c) => c.erros.length)
  if (!ruins.length) return { ...r1, corrigidos: 0 }

  // Uma nova tentativa só para os cartões com problema, mantendo a conversa.
  p.andamento?.('corrigindo')
  try {
    const texto2 = await gerar(cfg, [
      ...conversa,
      { role: 'model', parts: [{ text: texto1 }] },
      { role: 'user', parts: [{ text: montarCorrecao(ruins.map((c) => ({ id: c.idIA, erros: c.erros }))) }] },
    ])
    const destino2 = { ...p.destino, temas: [...p.destino.temas, ...r1.temasNovos] }
    const r2 = lerResposta(extrairJson(texto2), destino2, p.fontePadrao)
    const temas = [...r1.temasNovos, ...r2.temasNovos.filter((t) => !r1.temasNovos.some((x) => x.id === t.id))]
    // Ficam: os bons da 1ª resposta, os corrigidos da 2ª e os que continuarem ruins (para ela ver o motivo).
    const corrigidosOk = r2.cartoes.filter((c) => !c.erros.length)
    const aindaRuins = corrigidosOk.length ? r2.cartoes.filter((c) => c.erros.length) : ruins
    return { temasNovos: temas, cartoes: [...r1.cartoes.filter((c) => !c.erros.length), ...corrigidosOk, ...aindaRuins], corrigidos: ruins.length }
  } catch {
    // Se a correção falhar, fica com o que já veio bom.
    return { ...r1, corrigidos: 0 }
  }
}

/** Lê um arquivo como base64 (sem o prefixo "data:…;base64,"). */
export function arquivoParaBase64(f: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result).replace(/^data:[^,]*,/, ''))
    leitor.onerror = () => falha(leitor.error)
    leitor.readAsDataURL(f)
  })
}
