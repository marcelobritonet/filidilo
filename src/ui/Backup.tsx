import { useEffect, useState } from 'preact/hooks'
import { exportar, importar, textoReportes } from '../core/backup'
import { db } from '../core/db'
import { baralho } from './estado'

export function Backup({ sair }: { sair: () => void }) {
  const [msg, setMsg] = useState('')
  const [contagem, setContagem] = useState({ revisoes: 0, reportes: 0, novos: 0 })

  const contar = async () => {
    const reps = await db.reportes.toArray()
    setContagem({ revisoes: await db.revisoes.count(), reportes: reps.length, novos: reps.filter((r) => !r.enviado).length })
  }
  useEffect(() => {
    contar()
  }, [])

  const nomeArquivo = `tatino-backup-${new Date().toISOString().slice(0, 10)}.json`

  const salvar = async () => {
    const blob = await exportar()
    const arquivo = new File([blob], nomeArquivo, { type: 'application/json' })
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: 'Backup do Tatino' })
        setMsg('✔ Backup compartilhado.')
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
    setMsg('✔ Backup salvo em Downloads.')
  }

  const restaurar = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    try {
      const r = await importar(await f.text())
      setMsg(`✔ Backup restaurado: ${r.estados} cartões e ${r.revisoes} revisões atualizados.`)
      contar()
    } catch (err) {
      setMsg(`✘ ${(err as Error).message}`)
    }
  }

  const enviar = async (apenasNovos: boolean) => {
    const { texto, ids } = await textoReportes(baralho, apenasNovos)
    let ok = false
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, title: 'Reportes do Tatino' })
        ok = true
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    if (!ok) {
      await navigator.clipboard.writeText(texto)
      setMsg('✔ Texto copiado. Cole no WhatsApp ou e-mail.')
    } else setMsg('✔ Reportes enviados.')
    await db.reportes.where('id').anyOf(ids).modify({ enviado: true })
    contar()
  }

  return (
    <main class="tela backup">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={sair}>
          ←
        </button>
        <span>Backup e reportes</span>
        <span />
      </header>

      <section class="bloco">
        <h2>⚠ Reportes</h2>
        <p>
          {contagem.reportes} reportes no total, {contagem.novos} ainda não enviados.
        </p>
        <button class="btn principal" onClick={() => enviar(true)} disabled={!contagem.novos}>
          Enviar reportes novos
        </button>
        <button class="link" onClick={() => enviar(false)}>
          Enviar todos de novo (inclui as marcações da revisão)
        </button>
      </section>

      <section class="bloco">
        <h2>💾 Backup do progresso</h2>
        <p>O progresso fica guardado só neste aparelho ({contagem.revisoes} respostas até agora). Salve um backup de vez em quando, principalmente antes de trocar de celular.</p>
        <button class="btn" onClick={salvar}>
          Salvar backup
        </button>
        <label class="btn secundario arquivo">
          Restaurar de um arquivo
          <input type="file" accept="application/json,.json" onChange={restaurar} />
        </label>
      </section>

      {msg && (
        <p class="resultado" role="status">
          {msg}
        </p>
      )}
    </main>
  )
}
