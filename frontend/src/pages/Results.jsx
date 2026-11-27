import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Brain, CheckCircle2, ChevronDown, Download, Globe, Info, Link2, ListChecks,
  Mail, ScanLine, ShieldAlert, ShieldCheck, Trash2, Lightbulb, Cpu,
} from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { gsap, useGSAP } from '../lib/gsap'
import { fmtDate, prettyTerm, riskColor, riskHex } from '../lib/format'
import { downloadReport } from '../lib/report'
import { useToast } from '../context/ToastContext'
import RiskGauge from '../components/RiskGauge'

const SEV_ICON = { high: ShieldAlert, medium: AlertTriangle, low: Info, safe: CheckCircle2 }

function Contributions({ rows, kind }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.contribution)), 0.01)
  return (
    <div>
      <div className="row-between mute" style={{ fontSize: 11, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
        <span>{kind === 'URL' ? 'FEATURE = VALUE' : 'TERM'}</span>
        <span style={{ display: 'flex', gap: 18 }}><span className="safe">← safer</span><span className="danger">riskier →</span></span>
      </div>
      {rows.map((r) => {
        const w = `${(Math.abs(r.contribution) / max) * 50}%`
        return (
          <div key={r.feature || r.term} className="contrib-row" title={r.typical_legit !== undefined ? `Typical legitimate value: ${r.typical_legit}` : ''}>
            <span className="lbl">
              {r.label ? <>{r.label} <code>= {r.value}</code></> : <span className="mono">“{prettyTerm(r.term)}”</span>}
            </span>
            <div className="contrib-track">
              <div className={`contrib-bar ${r.contribution > 0 ? 'pos' : 'neg'}`} data-w={w} style={{ width: 0 }} />
            </div>
            <span className="v" style={{ color: r.contribution > 0 ? 'var(--danger)' : 'var(--safe)' }}>
              {r.contribution > 0 ? '+' : ''}{r.contribution.toFixed(2)}
            </span>
          </div>
        )
      })}
      <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
        Occlusion analysis: each {kind === 'URL' ? 'feature is reset to the typical value of a legitimate URL' : 'term is removed'} and
        the change in the model's log-odds is measured.
      </p>
    </div>
  )
}

function highlight(text, terms) {
  if (!terms?.length) return text
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  const re = new RegExp(`(${esc.join('|')}|https?://[^\\s]+)`, 'gi')
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}

export default function Results() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [r, setR] = useState(state?.result?._id === id ? state.result : null)
  const [err, setErr] = useState('')
  const [showFeatures, setShowFeatures] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (r) return
    api.get(`/analysis/history/${id}`).then((res) => setR(res.data)).catch((e) => setErr(errorMessage(e)))
  }, [id, r])

  useGSAP(() => {
    if (!r) return
    const tl = gsap.timeline()
    tl.from('.result-hero', { y: 40, opacity: 0, duration: 0.9 })
      .from('.verdict', { y: 30, opacity: 0, filter: 'blur(8px)', duration: 0.8 }, 0.3)
      .from('.result-hero .reveal-i', { y: 20, opacity: 0, stagger: 0.08 }, 0.4)
      .from('.result-glow', { scale: 0.3, opacity: 0, duration: 1.6 }, 0.2)
      .from('.result-grid > .card, .result-more > .card', { y: 50, opacity: 0, stagger: 0.12, duration: 0.9 }, 0.5)
      .from('.indicator', { x: -24, opacity: 0, stagger: 0.06, duration: 0.6 }, 0.8)
      .from('.rec', { x: 24, opacity: 0, stagger: 0.07, duration: 0.6 }, 0.9)
    gsap.utils.toArray('.contrib-bar').forEach((el, i) => {
      gsap.to(el, { width: el.dataset.w, duration: 1.2, delay: 1 + i * 0.05, ease: 'power3.out' })
    })
    if (r.risk_level === 'High') gsap.fromTo('.result-hero', { boxShadow: '0 0 0 0 rgba(255,77,109,0)' }, { boxShadow: '0 0 60px -10px rgba(255,77,109,.45)', duration: 1.2, delay: 1.6, yoyo: true, repeat: 1 })
  }, { scope: root, dependencies: [r] })

  const contributions = r?.feature_contributions || r?.term_contributions || []
  const VerdictIcon = r?.risk_level === 'High' ? ShieldAlert : r?.risk_level === 'Medium' ? AlertTriangle : ShieldCheck
  const verdictText = r ? (r.risk_level === 'Medium' ? 'Suspicious' : r.prediction) : ''
  const emailHtml = useMemo(() => (r?.analysis_type === 'Email' ? highlight(r.input, r.highlight_terms) : null), [r])

  const remove = async () => {
    if (!confirm('Delete this analysis from your history?')) return
    try { await api.delete(`/analysis/history/${id}`); toast('Analysis deleted', 'success'); navigate('/history') }
    catch (e) { toast(errorMessage(e), 'error') }
  }

  if (err) return (
    <div className="page wrap"><div className="card pad empty"><ShieldAlert size={40} /><h3 style={{ marginBottom: 8 }}>Couldn't load this analysis</h3><p>{err}</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>Back to scanner</Link></div></div>
  )
  if (!r) return <div className="page wrap"><div className="skeleton" style={{ height: 300 }} /><div className="skeleton" style={{ height: 240, marginTop: 20 }} /></div>

  return (
    <div ref={root} className="page wrap">
      <div className="row-between" style={{ marginBottom: 20 }}>
        <Link to="/dashboard" className="row dim" style={{ gap: 8, fontSize: 14 }}><ArrowLeft size={16} /> Back to scanner</Link>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadReport(r).then(() => toast('Report downloaded', 'success'))}><Download size={16} /> PDF report</button>
          <Link to="/dashboard" className="btn btn-primary btn-sm"><ScanLine size={16} /> New scan</Link>
          <button className="btn btn-danger btn-sm btn-icon" onClick={remove} title="Delete" aria-label="Delete analysis"><Trash2 size={16} /></button>
        </div>
      </div>

      <section className="card glow result-hero" style={{ position: 'relative' }}>
        <div className="result-glow" style={{ background: riskHex(r.risk_level) }} />
        <RiskGauge score={r.risk_score} size={240} delay={0.4} />
        <div style={{ minWidth: 0 }}>
          <div className="row reveal-i" style={{ gap: 10, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'inherit' }}>
            <span className={`badge ${r.risk_level}`}>{r.risk_level} risk</span>
            <span className="badge neutral">{r.analysis_type === 'URL' ? <Globe size={12} /> : <Mail size={12} />} {r.analysis_type} analysis</span>
          </div>
          <h1 className="verdict" style={{ color: riskColor(r.risk_level), display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'inherit' }}>
            <VerdictIcon size={44} /> {verdictText}
          </h1>
          <p className="reveal-i" style={{ fontSize: 16.5, margin: '10px 0 16px' }}>{r.summary}</p>
          <div className="target reveal-i" style={r.analysis_type === 'Email' ? { fontFamily: 'var(--font-body)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' } : undefined}>{r.analysis_type === 'URL' ? r.input : r.input.slice(0, 300) + (r.input.length > 300 ? '…' : '')}</div>
          <div className="meta-row reveal-i">
            <div><strong>{r.confidence}%</strong>confidence</div>
            <div><strong>{(r.phishing_probability * 100).toFixed(1)}%</strong>phishing probability</div>
            {r.processing_ms !== undefined && <div><strong>{r.processing_ms} ms</strong>analysis time</div>}
            <div><strong>{fmtDate(r.timestamp).split(',')[0]}</strong>{fmtDate(r.timestamp).split(',').slice(1).join(',') || 'analysed'}</div>
          </div>
        </div>
      </section>

      <div className="result-grid">
        <div className="card pad">
          <div className="card-title"><ListChecks size={18} /> Detected indicators <span className="badge neutral" style={{ marginLeft: 'auto' }}>{r.indicators.length}</span></div>
          <div className="stack" style={{ gap: 10 }}>
            {r.indicators.map((ind) => {
              const Icon = SEV_ICON[ind.severity] || Info
              return (
                <div key={ind.title} className={`indicator ${ind.severity}`}>
                  <span className="ii"><Icon size={18} /></span>
                  <div><h4>{ind.title}</h4><p>{ind.detail}</p></div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card pad" style={{ borderColor: r.risk_level === 'High' ? 'rgba(255,77,109,.3)' : undefined }}>
            <div className="card-title"><Lightbulb size={18} /> What you should do</div>
            {r.recommendations.map((t) => (
              <div key={t} className="rec"><CheckCircle2 size={17} color={riskColor(r.risk_level)} />{t}</div>
            ))}
          </div>
          <div className="card pad">
            <div className="card-title"><Cpu size={18} /> Model scores</div>
            <div className="score-pills">
              {Object.entries(r.model_scores || {}).map(([k, v]) => (
                <div key={k} className="score-pill"><b>{(v * 100).toFixed(1)}%</b>{k.replace(/_/g, ' ')}</div>
              ))}
            </div>
            <p className="mute" style={{ fontSize: 12.5, marginTop: 12 }}>Models: {(r.models_used || []).join(' · ')}</p>
            {r.adjustments?.length > 0 && (
              <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                {r.adjustments.map((a) => <div key={a} className="row dim" style={{ fontSize: 13, gap: 8, alignItems: 'flex-start' }}><Info size={14} style={{ marginTop: 3, flexShrink: 0 }} />{a}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="result-more result-grid">
        <div className="card pad">
          <div className="card-title"><Brain size={18} /> Why the model decided this</div>
          {contributions.length ? <Contributions rows={contributions} kind={r.analysis_type} /> : <p className="dim">The model's decision was not dominated by any single feature.</p>}
        </div>
        {r.analysis_type === 'URL' ? (
          <div className="card pad">
            <div className="card-title"><Link2 size={18} /> URL breakdown</div>
            <dl className="kv">
              {Object.entries(r.url_parts || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}><dt>{k.replace('_', ' ')}</dt><dd>{v || '—'}</dd></div>
              ))}
            </dl>
            {r.features && (
              <>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={() => setShowFeatures((s) => !s)}>
                  <ChevronDown size={16} style={{ transform: showFeatures ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
                  {showFeatures ? 'Hide' : 'Show'} all {Object.keys(r.features).length} extracted features
                </button>
                {showFeatures && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginTop: 14 }}>
                    {Object.entries(r.features).map(([k, v]) => (
                      <div key={k} className="score-pill" style={{ padding: '8px 12px' }}><b style={{ fontSize: 14 }}>{v}</b>{k.replace(/_/g, ' ')}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="card pad">
            <div className="card-title"><Mail size={18} /> Email content <span className="mute" style={{ fontSize: 12, fontWeight: 400, marginLeft: 'auto' }}>suspicious phrases highlighted</span></div>
            <div className="email-preview">{emailHtml}</div>
            {r.stats && (
              <div className="score-pills" style={{ marginTop: 14 }}>
                <div className="score-pill"><b>{r.stats.word_count}</b>words</div>
                <div className="score-pill"><b>{r.stats.links}</b>links</div>
                <div className="score-pill"><b>{r.stats.exclamations}</b>“!” marks</div>
                <div className="score-pill"><b>{(r.stats.caps_ratio * 100).toFixed(0)}%</b>caps words</div>
              </div>
            )}
            {r.embedded_urls?.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="label" style={{ marginBottom: 8 }}>Embedded links scanned by the URL model</div>
                {r.embedded_urls.map((u) => (
                  <div key={u.url} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{u.url}</span>
                    <span className={`badge ${u.risk_level}`}>{u.risk_score} · {u.risk_level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mute" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 28 }}>
        PhishGuard AI is a decision-support tool. A low score is not a guarantee of safety. Always verify unexpected requests.
      </p>
    </div>
  )
}
