import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Brain, ChevronDown, FileText, Fingerprint, Gauge, Globe, History, Mail, Radar, ShieldCheck, Sparkles, Zap,
} from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import useReveal from '../lib/useReveal'
import useMetrics from '../lib/useMetrics'
import { PIPELINE, SUPERVISOR, TEAM, THREATS } from '../lib/project'
import { useAuth } from '../context/AuthContext'
import LiveScanner from '../components/LiveScanner'
import Counter from '../components/Counter'
import Spotlight from '../components/Spotlight'

/* ------------------------------------------------------------------ */
function Hero() {
  const root = useRef(null)
  const { isAuthed } = useAuth()
  const { data: m } = useMetrics()
  const acc = m?.url?.ensemble?.accuracy

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
    tl.from('.eyebrow', { y: 20, opacity: 0, duration: 0.8 }, 0.2)
      .from('.hero-title .word', { yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.07 }, 0.25)
      .from('.hero .lead', { y: 24, opacity: 0, duration: 1 }, 0.8)
      .from('.hero-cta > *', { y: 20, opacity: 0, stagger: 0.1, duration: 0.8 }, 0.95)
      .from('.hero-meta > div', { y: 20, opacity: 0, stagger: 0.1, duration: 0.8 }, 1.05)
      .from('.hero-visual', { y: 80, opacity: 0, rotateX: 18, scale: 0.94, duration: 1.4, transformPerspective: 1200 }, 0.5)
      .from('.ring', { scale: 0.6, opacity: 0, stagger: 0.12, duration: 1.6 }, 0.6)
      .from('.scroll-hint', { opacity: 0, y: -10, duration: 0.8 }, 1.6)

    gsap.to('.ring-1', { rotate: 360, duration: 40, repeat: -1, ease: 'none' })
    gsap.to('.ring-2', { rotate: -360, duration: 60, repeat: -1, ease: 'none' })
    gsap.to('.float-tag', { y: -10, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.6 })

    // parallax on scroll
    gsap.to('.hero-copy', { yPercent: -12, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
    gsap.to('.orb.a', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
  }, { scope: root })

  const words = (s) => s.split(' ').map((w, i) => <span key={i} className="word">{w}&nbsp;</span>)

  return (
    <section ref={root} className="hero">
      <div className="orb a" /><div className="orb b" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span className="dot" /> ML-powered · Explainable · Real-time</span>
          <h1 className="hero-title">
            <span className="line">{words('Catch the hook')}</span>
            <span className="line">{words('before it')}</span>
            <span className="line"><span className="word grad-text">catches&nbsp;</span><span className="word grad-text">you.</span></span>
          </h1>
          <p className="lead">
            PhishGuard AI inspects suspicious links and emails with trained machine-learning models, then tells you
            <em> why </em>it looks dangerous, with a risk score, the indicators it found and what to do next.
          </p>
          <div className="hero-cta">
            <Link to={isAuthed ? '/dashboard' : '/register'} className="btn btn-primary"><span className="shine" />Start scanning free <ArrowRight size={18} /></Link>
            <a href="#anatomy" className="btn btn-ghost">See how it thinks</a>
          </div>
          <div className="hero-meta">
            <div><strong>{acc ? `${(acc * 100).toFixed(1)}%` : '96%+'}</strong>URL test accuracy</div>
            <div><strong>{m ? (m.url.dataset.total / 1000).toFixed(0) + 'k+' : '118k+'}</strong>labelled URLs</div>
            <div><strong>&lt;50ms</strong>per prediction</div>
          </div>
        </div>
        <div className="hero-visual" style={{ position: 'relative' }}>
          <svg className="ring ring-1" viewBox="0 0 400 400" style={{ position: 'absolute', inset: '-12%', width: '124%', height: '124%', zIndex: -1, opacity: 0.5 }} aria-hidden>
            <circle cx="200" cy="200" r="190" fill="none" stroke="url(#rg)" strokeWidth="1" strokeDasharray="4 10" />
            <defs><linearGradient id="rg"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
          </svg>
          <svg className="ring ring-2" viewBox="0 0 400 400" style={{ position: 'absolute', inset: '-4%', width: '108%', height: '108%', zIndex: -1, opacity: 0.35 }} aria-hidden>
            <circle cx="200" cy="200" r="195" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="60 30 2 30" />
          </svg>
          <span className="float-tag badge danger" style={{ position: 'absolute', top: -18, right: 24, zIndex: 2 }}>⚠ typosquat detected</span>
          <span className="float-tag badge safe" style={{ position: 'absolute', bottom: -16, left: 24, zIndex: 2 }}>✓ explainable verdict</span>
          <LiveScanner />
        </div>
      </div>
      <a href="#stats" className="scroll-hint" style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', color: 'var(--text-mute)', display: 'grid', placeItems: 'center', gap: 4, fontSize: 12 }}>
        scroll<ChevronDown size={16} className="bounce" />
      </a>
    </section>
  )
}

/* ------------------------------------------------------------------ */
function Marquee() {
  const items = [...THREATS, ...THREATS]
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {items.map((t, i) => <div className="marquee-item" key={i}><Sparkles size={18} />{t}</div>)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function Stats() {
  const { data: m } = useMetrics()
  const root = useRef(null)
  useReveal(root, [!!m])
  const cells = [
    { v: m?.url?.dataset?.total ?? 118142, d: 0, s: '', l: 'real-world URLs used for training & testing' },
    { v: (m?.url?.ensemble?.accuracy ?? 0.966) * 100, d: 1, s: '%', l: 'URL accuracy on unseen test data' },
    { v: (m ? Math.max(...m.email.models.map((x) => x.accuracy)) : 0.994) * 100, d: 1, s: '%', l: 'email accuracy (Enron + modern phishing)' },
    { v: m?.url?.dataset?.num_features ?? 34, d: 0, s: '', l: 'engineered URL security features' },
  ]
  return (
    <section id="stats" ref={root} style={{ padding: '40px 0' }}>
      <div className="wrap">
        <div className="card stats-band reveal">
          {cells.map((c, i) => (
            <div key={i} className="stat-cell">
              <div className="stat-num grad-text"><Counter value={c.v} decimals={c.d} suffix={c.s} /></div>
              <div className="stat-label">{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
const ANATOMY_PARTS = [
  { t: 'http://', step: 0 },
  { t: 'paypa1', step: 1 },
  { t: '-secure', step: 1 },
  { t: '.login-verify.account-update', step: 2 },
  { t: '.tk', step: 3 },
  { t: '/signin/webscr.php', step: 4 },
  { t: '?cmd=_login&id=88213', step: 4 },
]
const ANATOMY_STEPS = [
  { title: 'No HTTPS', desc: 'Plain HTTP: anything you type can be intercepted.', score: 18 },
  { title: 'Look-alike brand', desc: '“paypa1” swaps an L for a 1 to imitate PayPal.', score: 46 },
  { title: 'Subdomain stacking', desc: 'Extra subdomains bury the real domain out of sight.', score: 64 },
  { title: 'Risky TLD', desc: '.tk domains are free and heavily abused.', score: 82 },
  { title: 'Credential bait', desc: '“signin”, “webscr”, “cmd=_login” target your password.', score: 97 },
]

function Anatomy() {
  const root = useRef(null)
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    const build = (end) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current, start: 'top top', end, pin: true, scrub: 0.6,
          onUpdate: (self) => {
            const idx = Math.min(ANATOMY_STEPS.length - 1, Math.floor(self.progress * (ANATOMY_STEPS.length + 0.6)) - 1)
            if (idx !== activeRef.current) { activeRef.current = idx; setActive(idx) }
          },
        },
      })
      tl.fromTo('.anatomy .fill', { width: '0%' }, { width: '97%', ease: 'none' })
      return tl
    }
    mm.add('(min-width: 861px)', () => { build('+=2200') })
    mm.add('(max-width: 860px)', () => { build('+=1400') })
    gsap.from('.anatomy-head > *', { y: 40, opacity: 0, stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
  }, { scope: root })

  const score = active >= 0 ? ANATOMY_STEPS[active].score : 0
  return (
    <section id="anatomy" ref={root} className="anatomy">
      <div className="wrap" style={{ width: '100%' }}>
        <div className="section-head anatomy-head">
          <span className="eyebrow"><Fingerprint size={14} /> Anatomy of a phishing link</span>
          <h2 className="h-lg">Every URL leaves <span className="grad-text">fingerprints.</span></h2>
          <p className="lead" style={{ marginTop: 14 }}>Scroll to watch PhishGuard dissect a real-world style phishing URL, one signal at a time.</p>
        </div>
        <div className="card glow anatomy-url" aria-label="Example phishing URL">
          {ANATOMY_PARTS.map((p, i) => (
            <span key={i} className={active >= p.step ? 'on' : ''}>{p.t}</span>
          ))}
        </div>
        <div className="anatomy-meter">
          <span className="mono mute" style={{ fontSize: 12 }}>RISK</span>
          <div className="bar"><div className="fill" /></div>
          <span className="mono" style={{ fontSize: 22, fontWeight: 600, minWidth: 48, color: score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--warn)' : 'var(--safe)' }}>{score}</span>
        </div>
        <div className="anatomy-steps">
          {ANATOMY_STEPS.map((s, i) => (
            <div key={s.title} className={`anatomy-step ${active >= i ? 'on' : ''}`}>
              <div className="n">0{i + 1}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
function Pipeline() {
  const root = useRef(null)
  useGSAP(() => {
    gsap.to('.pipeline-line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.pipeline', start: 'top 60%', end: 'bottom 60%', scrub: true } })
    gsap.utils.toArray('.pipe-step').forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: 'top 60%', toggleClass: 'lit' })
      gsap.from(el, { x: 60, opacity: 0, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 88%' } })
    })
    gsap.from('.pipe-head > *', { y: 40, opacity: 0, stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
  }, { scope: root })
  return (
    <section id="how" ref={root} className="section">
      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 56 }}>
        <div className="pipe-head" style={{ position: 'sticky', top: 120, alignSelf: 'start' }}>
          <span className="eyebrow"><Brain size={14} /> System workflow</span>
          <h2 className="h-lg">From raw input to an <span className="grad-text">explainable verdict</span>.</h2>
          <p className="lead" style={{ marginTop: 16 }}>
            Nine stages turn a link or email into a prediction, confidence score, risk level, the reasons behind it and
            the action you should take.
          </p>
          <Link to="/about" className="btn btn-ghost" style={{ marginTop: 28 }}>Read the methodology <ArrowRight size={16} /></Link>
        </div>
        <div className="pipeline">
          <div className="pipeline-line"><i /></div>
          {PIPELINE.map((s, i) => (
            <div key={s.title} className="card pipe-step">
              <span className="node">{i + 1}</span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
              <span className="tag">{s.tag}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 1024px){ #how .wrap{ grid-template-columns: 1fr !important; } #how .pipe-head{ position: static !important; } }`}</style>
    </section>
  )
}

/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: Brain, title: 'Explainable AI, not a black box', desc: 'Occlusion-based explanations show exactly which features or words pushed the model toward phishing, and by how much, so anyone can understand the verdict.', big: true },
  { icon: Globe, title: 'URL threat analysis', desc: '34 lexical and structural features (length, entropy, subdomains, IPs, punycode, risky TLDs and more) feed a Gradient Boosting + character n-gram ensemble.' },
  { icon: Mail, title: 'Email NLP engine', desc: 'TF-IDF n-grams and a linear SVM read the language, while urgency, credential and money cues are flagged. Embedded links are scanned too.' },
  { icon: Gauge, title: 'Risk scoring', desc: 'Calibrated probabilities become a 0-100 score and Low / Medium / High level with confidence.' },
  { icon: ShieldCheck, title: 'Reputation layer', desc: 'Top-10k domain popularity, institutional registries and optional Google Safe Browsing add context to the ML score.' },
  { icon: FileText, title: 'PDF reports', desc: 'Download a formatted security report for any analysis, ready to share or submit.' },
  { icon: History, title: 'History & dashboard', desc: 'Every scan is stored. Search, filter and track your risk exposure over time.' },
  { icon: Zap, title: 'Fast', desc: 'Models load once at start-up and predict in milliseconds.' },
]

function Features() {
  const root = useRef(null)
  useReveal(root)
  useGSAP(() => {
    gsap.utils.toArray('.feature').forEach((card) => {
      gsap.set(card, { rotationX: 0, rotationY: 0 })
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5 })
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5 })
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect()
        ry(((e.clientX - r.left) / r.width - 0.5) * 8)
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8)
      })
      card.addEventListener('pointerleave', () => { rx(0); ry(0) })
    })
  }, { scope: root })
  return (
    <section ref={root} className="section">
      <div className="wrap">
        <div className="section-head center reveal">
          <span className="eyebrow"><Radar size={14} /> Capabilities</span>
          <h2 className="h-lg">Everything you need to <span className="grad-text">spot the bait.</span></h2>
        </div>
        <div className="grid features" style={{ perspective: 1200 }}>
          {FEATURES.map((f) => (
            <Spotlight key={f.title} className={`feature reveal ${f.big ? 'big' : ''}`}>
              <div className="ico"><f.icon size={22} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Spotlight>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
function ModelTeaser() {
  const root = useRef(null)
  const { data: m } = useMetrics()
  const rows = m ? [...m.url.models, { ...m.url.lexical_model }, { ...m.url.ensemble, name: 'PhishGuard Ensemble', best: true }] : []
  useGSAP(() => {
    if (!m) return
    gsap.utils.toArray('.mbar .fill').forEach((el) => {
      gsap.fromTo(el, { width: '0%' }, { width: el.dataset.w, duration: 1.6, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%' } })
    })
  }, { scope: root, dependencies: [m] })
  useReveal(root, [!!m])
  return (
    <section ref={root} className="section">
      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 56, alignItems: 'center' }}>
        <div className="reveal">
          <span className="eyebrow"><Sparkles size={14} /> Model comparison</span>
          <h2 className="h-lg">Six algorithms tested. <span className="grad-text">The best ones kept.</span></h2>
          <p className="lead" style={{ marginTop: 16 }}>
            Logistic Regression, Decision Tree, Random Forest, SVM, Naive Bayes and Gradient Boosting were trained and
            evaluated on the same held-out 20% test split. Final models were chosen on F1-score.
          </p>
          <Link to="/insights" className="btn btn-ghost" style={{ marginTop: 28 }}>Explore all metrics <ArrowRight size={16} /></Link>
        </div>
        <div className="card pad reveal">
          <div className="row-between" style={{ marginBottom: 20 }}>
            <span className="card-title" style={{ margin: 0 }}><Gauge size={18} /> URL models · F1-score</span>
            <span className="badge neutral mono">test n = {m?.url?.dataset?.test_size?.toLocaleString() ?? '…'}</span>
          </div>
          <div className="model-bars">
            {!m && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 18 }} />)}
            {rows.map((r) => (
              <div key={r.name} className={`mbar ${r.best ? 'best' : ''}`}>
                <span style={{ color: r.best ? 'var(--safe)' : 'var(--text-dim)', fontWeight: r.best ? 600 : 400 }}>{r.name.replace(' (TF-IDF + LR)', '')}</span>
                <div className="track"><div className="fill" data-w={`${(r.f1 * 100).toFixed(1)}%`} /></div>
                <span className="val">{(r.f1 * 100).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 1024px){ .section > .wrap[style]{ grid-template-columns: 1fr !important; } }`}</style>
    </section>
  )
}

/* ------------------------------------------------------------------ */
function Team() {
  const root = useRef(null)
  useReveal(root)
  return (
    <section ref={root} className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="section-head center reveal">
          <span className="eyebrow">The team</span>
          <h2 className="h-lg">Built at <span className="grad-text">Chitkara University</span></h2>
          <p className="lead" style={{ margin: '14px auto 0' }}>Exploratory Project · B.E. Computer Science & Engineering · Supervised by {SUPERVISOR.name}</p>
        </div>
        <div className="grid team">
          {TEAM.map((t) => (
            <Spotlight key={t.name} className="member reveal">
              <div className="pic">{t.name.split(' ').map((x) => x[0]).join('')}</div>
              <h4>{t.name}</h4>
              <p>{t.roll}</p>
            </Spotlight>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  const root = useRef(null)
  const { isAuthed } = useAuth()
  useGSAP(() => {
    gsap.from('.cta', { scale: 0.92, opacity: 0, duration: 1.2, scrollTrigger: { trigger: root.current, start: 'top 80%' } })
  }, { scope: root })
  return (
    <section ref={root} className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="card glow cta">
          <div className="orb a" style={{ top: -200, right: -100 }} /><div className="orb b" style={{ bottom: -240 }} />
          <h2>Think before you click.<br /><span className="grad-text">Scan before you trust.</span></h2>
          <p className="lead" style={{ margin: '0 auto 32px' }}>Create a free account to save your scans, build your security dashboard and export PDF reports.</p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={isAuthed ? '/dashboard' : '/register'} className="btn btn-primary"><span className="shine" />{isAuthed ? 'Open the scanner' : 'Create free account'} <ArrowRight size={18} /></Link>
            <Link to="/insights" className="btn btn-ghost">View model insights</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Stats />
      <Anatomy />
      <Pipeline />
      <Features />
      <ModelTeaser />
      <Team />
      <CTA />
    </>
  )
}
