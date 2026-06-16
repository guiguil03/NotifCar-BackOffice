'use client'
import { toCSV, downloadCSV } from '@/lib/csv'

interface Props {
  rows: Record<string, unknown>[]
  filename: string
  label?: string
}

export default function ExportButton({ rows, filename, label = 'Exporter CSV' }: Props) {
  const handleExport = () => {
    if (rows.length === 0) {
      alert('Aucune donnée à exporter')
      return
    }
    downloadCSV(filename, toCSV(rows))
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={handleExport}>
      {label}
    </button>
  )
}
