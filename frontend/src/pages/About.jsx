import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Boxes, Code2, Database, GraduationCap, Layers, Server, Target, Users, AlertTriangle } from 'lucide-react'
import useReveal from '../lib/useReveal'
import { gsap, useGSAP } from '../lib/gsap'
import { PIPELINE, SUPERVISOR, TEAM } from '../lib/project'
import Spotlight from '../components/Spotlight'

const OBJECTIVES = [
  ['AI-based phishing detection', 'Classify URLs as Legitimate or Phishing from extracted features.'],
  ['Email content analysis', 'Use NLP to identify linguistic patterns associated with phishing.'],
  ['Cybersecurity feature extraction', 'URL length, special characters, subdomains, suspicious terms and more.'],
  ['Explainable predictions', 'Prediction, confidence, risk level, indicators and suggested action.'],
  ['User-friendly dashboard', 'Submit inputs, view results and browse analysis history.'],
]
const LAYERS = [
  { icon: Layers, t: 'Frontend', d: 'React 19 + Vite, GSAP & ScrollTrigger animations, Lenis smooth scroll, Recharts, jsPDF reports.' },
  { icon: Server, t: 'Backend', d: 'FastAPI REST API: validation, JWT authentication (bcrypt), result processing, history & stats.' },
  { icon: Boxes, t: 'Machine Learning', d: 'scikit-learn pipelines: feature engineering, 6-algorithm comparison, ensemble, occlusion XAI, joblib.' },
  { icon: Database, t: 'Database', d: 'MongoDB via PyMongo (set MONGO_URI), with an embedded Mongo-compatible fallback for demos.' },
  { icon: Target, t: 'External intelligence', d: 'Optional Google Safe Browsing lookup plus a local top-10k domain reputation layer.' },
]
const STACK = ['Python', 'FastAPI', 'scikit-learn', 'Pandas', 'NumPy', 'Joblib', 'PyMongo', 'JWT', 'React', 'Vite', 'GSAP', 'Recharts', 'jsPDF', 'Lenis']
const REFS = [
  'Sahingoz, O. K., Buber, E., Demir, O., & Diri, B. (2019). Machine learning based phishing detection from URLs. Expert Systems with Applications, 117, 345–357.',
  'Marchal, S., & Asokan, N. (2018). On designing and evaluating phishing webpage detection techniques for the real world. USENIX CSET 18.',
  'Pedregosa, F. et al. (2011). Scikit-learn: Machine learning in Python. JMLR, 12, 2825–2830.',
  'Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of deep bidirectional transformers for language understanding. arXiv:1810.04805.',
  'Adebowale, M. A., Lwin, K. T., Sánchez, E., & Hossain, M. A. (2019). Intelligent web-phishing detection and protection scheme using integrated features of images, frames and text. ESWA, 115, 300–313.',
  'Marchal, S., François, J., State, R., & Engel, T. (2014). PhishStorm: Detecting phishing with streaming analytics. IEEE TNSM.',
  'Lin, Y. et al. (2021). Phishpedia: A hybrid deep learning based approach to visually identify phishing webpages. USENIX Security.',
  'Metsis, V., Androutsopoulos, I., & Paliouras, G. (2006). Spam filtering with Naive Bayes - which Naive Bayes? CEAS (Enron-Spam corpus).',
]

export default function About() {
  const root = useRef(null)
  useReveal(root)
  useGSAP(() => {
    gsap.from('.about-hero > *', { y: 40, opacity: 0, stagger: 0.1, duration: 1 })
    gsap.from('.stack-pill', { scale: 0.6, opacity: 0, stagger: 0.04, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: '.stack-cloud', start: 'top 85%' } })
  }, { scope: root })
  return (
    <div ref={root} className="page">
      <div className="wrap">
        <div className="about-hero section-head" style={{ marginBottom: 72 }}>
          <span className="eyebrow"><BookOpen size={14} /> About the project</span>
          <h1 className="h-xl" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)' }}>PhishGuard AI: <span className="grad-text">AI-powered phishing detection</span> & URL risk analysis</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Phishing targets the weakest component of any security system: the human user. Blacklists cannot keep up with newly
            generated attacks, and most tools give a binary answer with no explanation. PhishGuard AI learns phishing patterns from
            labelled data and explains every verdict in plain language.
          </p>
        </div>

        <h2 className="h-md reveal" style={{ marginBottom: 20 }}>Objectives</h2>
        <div className="grid features" style={{ marginBottom: 96 }}>
          {OBJECTIVES.map(([t, d], i) => (
            <Spotlight key={t} className="feature reveal" style={{ minHeight: 0 }}>
              <span className="mono" style={{ color: 'var(--cyan)', fontSize: 13 }}>Objective 0{i + 1}</span>
              <h3 style={{ marginTop: 10 }}>{t}</h3>
              <p>{d}</p>
            </Spotlight>
          ))}
          <Spotlight className="feature reveal" style={{ minHeight: 0, justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-primary"><span className="shine" />Try the scanner <ArrowRight size={16} /></Link>
          </Spotlight>
        </div>

        <h2 className="h-md reveal" style={{ marginBottom: 20 }}>System architecture</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 96 }}>
          {LAYERS.map((l) => (
            <Spotlight key={l.t} className="feature reveal" style={{ minHeight: 0 }}>
              <div className="ico"><l.icon size={20} /></div>
              <h3>{l.t}</h3><p>{l.d}</p>
            </Spotlight>
          ))}
        </div>

        <h2 className="h-md reveal" style={{ marginBottom: 20 }}>Workflow</h2>
        <div className="card pad reveal" style={{ marginBottom: 96 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {PIPELINE.map((s, i) => (
              <div key={s.title} className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                <span className="mono" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(34,211,238,.08)', color: 'var(--cyan)', fontSize: 12 }}>{i + 1}</span>
                <div><b style={{ fontSize: 15 }}>{s.title}</b><p className="dim" style={{ fontSize: 13.5 }}>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="h-md reveal" style={{ marginBottom: 20 }}><Code2 size={22} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Tech stack</h2>
        <div className="stack-cloud row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 96 }}>
          {STACK.map((s) => <span key={s} className="stack-pill badge neutral" style={{ fontSize: 14, padding: '8px 16px' }}>{s}</span>)}
        </div>

        <div className="result-grid" style={{ marginBottom: 96 }}>
          <div className="card pad reveal">
            <div className="card-title"><Target size={18} /> Scope</div>
            <p className="dim" style={{ fontSize: 14.5 }}>
              Registration & login, URL validation & feature extraction, ML URL classification, NLP email analysis, risk & confidence
              scoring, explainable indicators, analysis history, recommendations, PDF reports, optional threat-intelligence and model
              performance evaluation.
            </p>
          </div>
          <div className="card pad reveal">
            <div className="card-title"><AlertTriangle size={18} /> Limitations</div>
            <p className="dim" style={{ fontSize: 14.5 }}>
              Accuracy depends on training-data quality and diversity; brand-new or highly sophisticated attacks may be missed; false
              positives/negatives are possible; email analysis is text-only (no attachment sandboxing). PhishGuard is a decision-support
              tool, not a replacement for enterprise security.
            </p>
          </div>
        </div>

        <div id="team" className="section-head reveal" style={{ marginBottom: 24 }}>
          <span className="eyebrow"><Users size={14} /> Team</span>
          <h2 className="h-lg">The people behind it</h2>
        </div>
        <div className="grid team" style={{ marginBottom: 20 }}>
          {TEAM.map((t) => (
            <Spotlight key={t.name} className="member reveal">
              <div className="pic">{t.name.split(' ').map((x) => x[0]).join('')}</div>
              <h4>{t.name}</h4><p>{t.roll}</p>
            </Spotlight>
          ))}
        </div>
        <div className="card pad reveal row" style={{ marginBottom: 96, gap: 16 }}>
          <span className="logo-mark" style={{ width: 48, height: 48 }}><GraduationCap size={24} /></span>
          <div><b>{SUPERVISOR.name}</b> · <span className="dim">{SUPERVISOR.role}</span><div className="mute" style={{ fontSize: 13 }}>Department of Computer Science & Engineering, Chitkara University Institute of Engineering & Technology, Punjab</div></div>
        </div>

        <h2 className="h-md reveal" style={{ marginBottom: 20 }}>References</h2>
        <ol className="card pad reveal stack" style={{ gap: 10, paddingLeft: 48, fontSize: 14 }}>
          {REFS.map((r) => <li key={r} className="dim">{r}</li>)}
        </ol>
      </div>
    </div>
  )
}
