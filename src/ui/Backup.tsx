import { evento } from '../core/telemetria'
import { useEffect, useState } from 'preact/hooks'
import { exportar, importar } from '../core/backup'
import { db } from '../core/db'

export function Backup({ sair }: { sair: () => void }) {
  const [msg, setMsg] = useState('')
  const [respostas, setRespostas] = useState(0)

  const contar = async () => setRespostas(await db.revisoes.count())
  useEffect(() => {
    contar()
  }, [])

  const nomeArquivo = `tatino-backup-${new Date().toISOString().slice(0, 10)}.json`

  const salvar = async () => {
    evento('backup_salvo')
    const blob = await exportar()
    const arquivo = new File([blob], nomeArquivo, { type: 'application/json' })
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: 'Backup do Tatino' })
        setMsg('✓ Backup compartilhado.')
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
    setMsg('✓ Backup salvo em Downloads.')
  }

  const restaurar = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    try {
      const r = await importar(await f.text())
      evento('backup_restaurado')
      setMsg(`✓ Backup restaurado: ${r.baralhos} baralhos, ${r.estados} cartões e ${r.revisoes} revisões atualizados.`)
      contar()
    } catch (err) {
      setMsg(`✕ ${(err as Error).message}`)
    }
  }

  return (
    <main class="tela backup">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={sair}>
          ←
        </button>
        <h1 class="titulo-barra">Backup</h1>
        <span />
      </header>

      <section class="bloco">
        <p>Seus baralhos e o progresso ficam só neste aparelho ({respostas} respostas). Salve um backup antes de trocar de celular.</p>
        <button class="btn principal" onClick={salvar}>
          Salvar backup
        </button>
        <label class="btn secundario arquivo">
          Restaurar de um arquivo
          <input type="file" accept="application/json,.json" onChange={restaurar} />
        </label>
      </section>

      {msg && (
        <p class="resultado" role="status" aria-live="polite">
          {msg}
        </p>
      )}
    </main>
  )
}
