import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Globe, History as HistoryIcon, Mail, ScanLine, Search, Trash2, AlertCircle } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { gsap, useGSAP } from '../lib/gsap'
import { fmtDate, scoreColor, timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'

const PAGE = 25

export default function History() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [risk, setRisk] = useState('')
  const root = useRef(null)
  const navigate = useNavigate()
  const toast = useToast()

  const load = useCallback(async (skip = 0) => {
    setLoading(true); setErr('')
    try {
      const params = { limit: PAGE, skip }
      if (q) params.q = q
      if (type) params.type = type
      if (risk) params.risk = risk
      const { data } = await api.get('/analysis/history', { params })
      setTotal(data.total)
      setItems((prev) => (skip ? [...prev, ...data.history] : data.history))
    } catch (e) { setErr(errorMessage(e)) } finally { setLoading(false) }
  }, [q, type, risk])

  useEffect(() => { const t = setTimeout(() => load(0), q ? 300 : 0); return () => clearTimeout(t) }, [load, q])

  useGSAP(() => { gsap.from('.hist-head > *, .toolbar', { y: 24, opacity: 0, stagger: 0.08 }) }, { scope: root })
  useGSAP(() => {
    if (!items.length) return
    gsap.fromTo('tbody tr:not(.shown)', { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.03, duration: 0.5, onComplete() { this.targets().forEach((t) => t.classList.add('shown')) } })
  }, { scope: root, dependencies: [items] })

  const remove = async (e, id) => {
    e.stopPropagation()
    try {
      await api.delete(`/analysis/history/${id}`)
      const row = root.current.querySelector(`[data-id="${id}"]`)
      gsap.to(row, { opacity: 0, x: 40, duration: 0.35, onComplete: () => { setItems((xs) => xs.filter((x) => x._id !== id)); setTotal((t) => t - 1) } })
    } catch (err2) { toast(errorMessage(err2), 'error') }
  }

  const clearAll = async () => {
    if (!confirm('Delete your entire analysis history? This cannot be undone.')) return
    try { const { data } = await api.delete('/analysis/history'); toast(`Deleted ${data.deleted} analyses`, 'success'); load(0) }
    catch (e) { toast(errorMessage(e), 'error') }
  }

  const exportCsv = () => {
    const rows = [['timestamp', 'type', 'input', 'prediction', 'risk_level', 'risk_score', 'confidence']]
    items.forEach((i) => rows.push([i.timestamp, i.analysis_type, i.input, i.prediction, i.risk_level, i.risk_score, i.confidence]))
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'phishguard-history.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div ref={root} className="page wrap">
      <div className="hist-head row-between" style={{ marginBottom: 28 }}>
        <div>
          <span className="eyebrow"><HistoryIcon size={14} /> Analysis history</span>
          <h1 className="h-lg">Every scan, <span className="grad-text">on record.</span></h1>
          <p className="dim" style={{ marginTop: 8 }}>{total} {total === 1 ? 'analysis' : 'analyses'} stored. Click a row to open the full report.</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!items.length}><Download size={16} /> Export CSV</button>
          <button className="btn btn-danger btn-sm" onClick={clearAll} disabled={!items.length}><Trash2 size={16} /> Clear all</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={18} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search URLs or email text…" style={{ height: 46, paddingBlock: 0 }} />
        </div>
        <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option><option value="URL">URLs</option><option value="Email">Emails</option>
        </select>
        <select className="select" value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk">
          <option value="">All risk levels</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 16 }}><AlertCircle size={18} />{err}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading && !items.length ? (
          <div style={{ padding: 20 }} className="stack">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>
        ) : !items.length ? (
          <div className="empty" style={{ padding: 60 }}>
            <ScanLine size={44} />
            <h3 style={{ color: 'var(--text)', marginBottom: 6 }}>{q || type || risk ? 'No matching analyses' : 'No analyses yet'}</h3>
            <p>{q || type || risk ? 'Try adjusting your filters.' : 'Your scans will be listed here.'}</p>
            {!(q || type || risk) && <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>Run your first scan</Link>}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Input</th><th className="hide-m">Type</th><th>Verdict</th><th className="hide-m">Score</th><th className="hide-m">When</th><th /></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i._id} data-id={i._id} onClick={() => navigate(`/results/${i._id}`)}>
                  <td><div className="inp" title={i.input}>{i.input}</div></td>
                  <td className="hide-m"><span className="badge neutral">{i.analysis_type === 'URL' ? <Globe size={12} /> : <Mail size={12} />}{i.analysis_type}</span></td>
                  <td><span className={`badge ${i.risk_level}`}>{i.risk_level === 'Medium' ? 'Suspicious' : i.prediction}</span></td>
                  <td className="hide-m"><span className="score-bar"><i style={{ width: `${i.risk_score}%`, background: scoreColor(i.risk_score) }} /></span><span className="mono" style={{ fontSize: 13 }}>{i.risk_score}</span></td>
                  <td className="hide-m mute" title={fmtDate(i.timestamp)} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{timeAgo(i.timestamp)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-icon" style={{ width: 34, height: 34 }} onClick={(e) => remove(e, i._id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {items.length < total && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => load(items.length)} disabled={loading}>{loading ? <span className="spinner" /> : 'Load more'}</button>
        </div>
      )}
    </div>
  )
}
