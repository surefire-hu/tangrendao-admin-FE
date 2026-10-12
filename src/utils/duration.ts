/** 75 → "1 分 15 秒", 3720 → "1 小时 2 分", 8 → "8 秒". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const s = Math.round(seconds)
  if (s < 60) return `${s} 秒`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return m ? `${h} 小时 ${m} 分` : `${h} 小时`
  const r = s % 60
  return r ? `${m} 分 ${r} 秒` : `${m} 分`
}
