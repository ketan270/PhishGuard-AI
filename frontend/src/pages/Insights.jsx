import { useRef, useState } from 'react'
import { BarChart3, Database, Globe, Mail, Medal, Target, TrendingUp, Layers, AlertCircle } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from 'recharts'
import { gsap, useGSAP } from '../lib/gsap'
import useMetrics from '../lib/useMetrics'
import { errorMessage } from '../lib/api'
import Tabs from '../components/Tabs'
import Counter from '../components/Counter'

const tip = { background: '#0c1222', border: '1px solid rgba(148,163,255,.22)', borderRadius: 12, fontSize: 12.5, color: '#e8ecf8' }
const PALETTE = ['#22d3ee', '#8b5cf6', '#3b82f6', '#f472b6', '#fbbf24', '#10e0a0', '#fb923c', '#ff4d6d']
const short = (n) => n.replace('Support Vector Machine', 'SVM').replace('Logistic Regression', 'Log. Reg.').replace('Gradient Boosting', 'Grad. Boost')
  .replace('Random Forest', 'Rand. Forest').replace('Decision Tree', 'Dec. Tree').replace('Naive Bayes', 'Naive Bayes').replace('Char n-gram (TF-IDF + LR)', 'Char n-gram')
  .replace(/^Ensemble.*/, 'Ensemble')

function ConfusionMatrix({ cm }) {
  const [[tn, fp], [fn, tp]] = cm
  const total = tn + fp + fn + tp
  const cell = (v, good) => ({
    background: good ? `rgba(16,224,160,${0.08 + (v / total) * 0.9})` : `rgba(255,77,109,${0.08 + (v / total) * 3})`,
    border: `1px solid ${good ? 'rgba(16,224,160,.3)' : 'rgba(255,77,109,.3)'}`,
  })
  return (
    <div className="cm">
      <div />
      <div className="hdr">Predicted<br />Legitimate</div>
      <div className="hdr">Predicted<br />Phishing</div>
      <div className="hdr" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Actual legit</div>
      <div className="cell" style={cell(tn, true)}>{tn.toLocaleString()}<small>True negatives</small></div>
      <div className="cell" style={cell(fp, false)}>{fp.toLocaleString()}<small>False positives</small></div>
      <div className="hdr" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Actual phish</div>
      <div className="cell" style={cell(fn, false)}>{fn.toLocaleString()}<small>False negatives</small></div>
      <div className="cell" style={cell(tp, true)}>{tp.toLocaleString()}<small>True positives</small></div>
    </div>
  )
}

function Section({ m, kind }) {
  const isUrl = kind === 'url'
  const ds = m.dataset
  const models = isUrl ? [...m.models, m.lexical_model, m.ensemble] : m.models
  const deployedName = isUrl ? m.ensemble.name : m.deployed.model
  const deployed = models.find((x) => x.name === deployedName)
  const best = Math.max(...models.map((x) => x.f1))
  const barData = models.map((x) => ({ name: short(x.name), Accuracy: +(x.accuracy * 100).toFixed(2), Precision: +(x.precision * 100).toFixed(2), Recall: +(x.recall * 100).toFixed(2), F1: +(x.f1 * 100).toFixed(2) }))
  const roc = models.map((x) => ({ name: short(x.name), data: x.roc.fpr.map((f, i) => ({ fpr: f, tpr: x.roc.tpr[i] })) }))

  return (
    <div className="ins-body stack" style={{ gap: 20 }}>
      <div className="kpis" style={{ marginBottom: 0 }}>
        {[
          { l: 'Samples', v: ds.total, i: Database },
          { l: 'Legitimate', v: ds.legitimate, i: Target },
          { l: 'Phishing', v: ds.phishing, i: AlertCircle },
          { l: isUrl ? 'Features' : 'Test samples', v: isUrl ? ds.num_features : ds.test_size, i: Layers },
        ].map((k) => (
          <div key={k.l} className="card kpi">
            <div className="k-label">{k.l}<k.i size={16} className="mute" /></div>
            <div className="k-val"><Counter value={k.v} scroll={false} duration={1.3} /></div>
          </div>
        ))}
      </div>

      <div className="card pad">
        <div className="row-between" style={{ marginBottom: 16 }}>
          <span className="card-title" style={{ margin: 0 }}><BarChart3 size={18} /> Algorithm comparison · held-out test set</span>
          <span className="badge safe" style={{ whiteSpace: "normal" }}><Medal size={12} /> Deployed: {deployedName}</span>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid stroke="rgba(148,163,255,.07)" vertical={false} />
              <XAxis dataKey="name" stroke="#64708f" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis domain={isUrl ? [0, 100] : [90, 100]} ticks={isUrl ? [0, 20, 40, 60, 80, 100] : [90, 92, 94, 96, 98, 100]} allowDataOverflow stroke="#64708f" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(34,211,238,.05)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {['Accuracy', 'Precision', 'Recall', 'F1'].map((k, i) => <Bar key={k} dataKey={k} fill={PALETTE[i]} radius={[4, 4, 0, 0]} animationDuration={1400} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table metric-table">
          <thead><tr><th>Model</th><th className="num">Accuracy</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">ROC-AUC</th><th className="num">Train time</th></tr></thead>
          <tbody>
            {models.map((x) => (
              <tr key={x.name} className={x.f1 === best ? 'best' : ''}>
                <td style={{ fontWeight: x.name === deployedName ? 600 : 400 }}>{x.name} {x.f1 === best && <span className="badge safe" style={{ marginLeft: 6 }}>best</span>}</td>
                <td className="num">{(x.accuracy * 100).toFixed(2)}%</td>
                <td className="num">{(x.precision * 100).toFixed(2)}%</td>
                <td className="num">{(x.recall * 100).toFixed(2)}%</td>
                <td className="num">{(x.f1 * 100).toFixed(2)}%</td>
                <td className="num">{x.roc_auc.toFixed(4)}</td>
                <td className="num">{x.train_time_s}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="result-grid" style={{ marginTop: 0 }}>
        <div className="card pad">
          <div className="card-title"><TrendingUp size={18} /> ROC curves</div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <LineChart margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke="rgba(148,163,255,.07)" />
                <XAxis type="number" dataKey="fpr" domain={[0, 1]} stroke="#64708f" fontSize={11} label={{ value: 'False positive rate', position: 'insideBottom', offset: -2, fill: '#64708f', fontSize: 11 }} />
                <YAxis type="number" dataKey="tpr" domain={[0, 1]} stroke="#64708f" fontSize={11} />
                <Tooltip contentStyle={tip} formatter={(v) => v.toFixed(3)} labelFormatter={(v) => `FPR ${Number(v).toFixed(3)}`} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {roc.map((s, i) => <Line key={s.name} data={s.data} dataKey="tpr" name={s.name} stroke={PALETTE[i % PALETTE.length]} dot={false} strokeWidth={s.name === 'Ensemble' ? 3 : 1.6} animationDuration={1600} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card pad">
          <div className="card-title"><Target size={18} /> Confusion matrix · {short(deployedName)}</div>
          <ConfusionMatrix cm={deployed.confusion_matrix} />
          <p className="mute" style={{ fontSize: 12.5, marginTop: 14 }}>
            On {ds.test_size.toLocaleString()} unseen test samples. False negatives are phishing samples the model missed; false positives are legitimate samples it flagged.
          </p>
        </div>
      </div>

      {isUrl ? (
        <div className="card pad">
          <div className="card-title"><Layers size={18} /> Permutation feature importance · {m.deployed.feature_model}</div>
          <div style={{ height: 460 }}>
            <ResponsiveContainer>
              <BarChart data={m.feature_importance.slice(0, 15)} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid stroke="rgba(148,163,255,.07)" horizontal={false} />
                <XAxis type="number" stroke="#64708f" fontSize={11} />
                <YAxis type="category" dataKey="label" stroke="#9aa4c0" fontSize={11.5} width={190} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} formatter={(v) => [v.toFixed(4), 'F1 drop when shuffled']} cursor={{ fill: 'rgba(34,211,238,.05)' }} />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]} animationDuration={1500}>
                  {m.feature_importance.slice(0, 15).map((_, i) => <Cell key={i} fill={`rgba(34,211,238,${1 - i * 0.05})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="result-grid" style={{ marginTop: 0 }}>
          {[['Words that signal phishing', m.top_phishing_terms, 'danger'], ['Words that signal legitimate mail', m.top_legitimate_terms, 'safe']].map(([title, terms, tone]) => {
            const max = Math.max(...terms.map((t) => Math.abs(t.weight)))
            return (
              <div key={title} className="card pad">
                <div className="card-title">{title}</div>
                <div className="term-cloud">
                  {terms.map((t) => {
                    const a = Math.abs(t.weight) / max
                    return <span key={t.term} style={{ fontSize: 11 + a * 7, background: tone === 'danger' ? `rgba(255,77,109,${0.06 + a * 0.2})` : `rgba(16,224,160,${0.06 + a * 0.2})`, color: tone === 'danger' ? '#ffc2cd' : '#b4f5df' }}>{t.term}</span>
                  })}
                </div>
                <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>Largest Logistic Regression coefficients on TF-IDF features.</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="card pad">
        <div className="card-title"><Database size={18} /> Dataset & methodology</div>
        <div className="stack" style={{ gap: 8, fontSize: 14 }}>
          {ds.sources.map((s) => <div key={s} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--cyan)' }}>▹</span><span className="dim">{s}</span></div>)}
          <div className="divider" />
          <div className="dim">
            Train / test split: <b className="mono">{ds.train_size.toLocaleString()} / {ds.test_size.toLocaleString()}</b> (stratified, seed 42) ·
            duplicates removed: <b className="mono">{ds.duplicates_removed.toLocaleString()}</b>
            {ds.augmented_samples !== undefined && <> · template-augmented samples: <b className="mono">{ds.augmented_samples.toLocaleString()}</b></>}
            {ds.vectorizer && <> · {ds.vectorizer}</>}
          </div>
          {isUrl && <div className="dim">Deployment: {m.deployed.strategy}. A reputation layer then adjusts the score for globally popular and institutional domains.</div>}
        </div>
      </div>
    </div>
  )
}

export default function Insights() {
  const { data: m, error } = useMetrics()
  const [tab, setTab] = useState('url')
  const root = useRef(null)
  const { contextSafe } = useGSAP({ scope: root })
  useGSAP(() => { gsap.from('.ins-head > *', { y: 30, opacity: 0, stagger: 0.08 }) }, { scope: root })
  useGSAP(() => {
    if (!m) return
    gsap.from('.ins-body > *', { y: 40, opacity: 0, stagger: 0.1, duration: 0.9 })
  }, { scope: root, dependencies: [m] })
  const swap = contextSafe((v) => {
    setTab(v)
    requestAnimationFrame(() => gsap.from('.ins-body > *', { y: 30, opacity: 0, stagger: 0.07, duration: 0.7 }))
  })

  return (
    <div ref={root} className="page wrap">
      <div className="ins-head row-between" style={{ marginBottom: 28, alignItems: 'flex-end' }}>
        <div>
          <span className="eyebrow"><BarChart3 size={14} /> Model insights</span>
          <h1 className="h-lg">How well do the <span className="grad-text">models perform?</span></h1>
          <p className="dim" style={{ marginTop: 8, maxWidth: 640 }}>
            Real evaluation results from the training pipeline (<code className="mono">python -m ml.train</code>).
            {m && <> Last trained {new Date(m.generated_at).toLocaleString()}.</>}
          </p>
        </div>
        <Tabs value={tab} onChange={swap} tabs={[{ value: 'url', label: 'URL models', icon: Globe }, { value: 'email', label: 'Email models', icon: Mail }]} />
      </div>
      {error && <div className="error-box"><AlertCircle size={18} />{errorMessage(error)}</div>}
      {!m && !error && <div className="stack" style={{ gap: 20 }}><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 340 }} /></div>}
      {m && <Section key={tab} m={m[tab]} kind={tab} />}
    </div>
  )
}
