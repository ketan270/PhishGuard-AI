export const riskColor = (level) =>
  level === 'High' ? 'var(--danger)' : level === 'Medium' ? 'var(--warn)' : 'var(--safe)'

export const riskHex = (level) => (level === 'High' ? '#ff4d6d' : level === 'Medium' ? '#fbbf24' : '#10e0a0')

export const scoreColor = (s) => (s >= 70 ? '#ff4d6d' : s >= 40 ? '#fbbf24' : '#10e0a0')

export function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return d.toLocaleDateString()
}

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''

export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`

export const prettyTerm = (t) =>
  t.replace(/urltoken/g, '[link]').replace(/numtoken/g, '[number]').replace(/moneytoken/g, '[amount]').replace(/emailtoken/g, '[email]')
