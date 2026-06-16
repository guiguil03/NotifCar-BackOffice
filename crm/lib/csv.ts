export function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ''
  const cols = columns ?? Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const str = String(v)
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const header = cols.map(escape).join(',')
  const lines = rows.map((row) => cols.map((c) => escape(row[c])).join(','))
  return '﻿' + [header, ...lines].join('\n')
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
