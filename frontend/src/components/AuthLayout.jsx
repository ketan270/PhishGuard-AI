import { useRef } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import Logo from './Logo'

const FEED = [
  { u: 'secure-paypal.com.account-verify.ru/signin', bad: true },
  { u: 'github.com/features/actions', bad: false },
  { u: '185.21.44.9/hdfc/netbanking/login.php', bad: true },
  { u: 'docs.python.org/3/library/re.html', bad: false },
  { u: 'amaz0n-giftcards.top/claim?id=88231', bad: true },
  { u: 'en.wikipedia.org/wiki/Phishing', bad: false },
]

export default function AuthLayout({ title, subtitle, children }) {
  const root = useRef(null)
  useGSAP(() => {
    gsap.from('.auth-card > *', { y: 30, opacity: 0, stagger: 0.07, duration: 0.8, delay: 0.1 })
    gsap.from('.auth-side .quote', { y: 40, opacity: 0, duration: 1.1, delay: 0.2 })
    const items = gsap.utils.toArray('.auth-feed .item')
    gsap.from(items, { x: -40, opacity: 0, stagger: 0.12, duration: 0.7, delay: 0.5 })
    gsap.to(items, { y: -6, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: { each: 0.3, from: 'random' } })
  }, { scope: root })
  return (
    <div ref={root} className="auth">
      <aside className="auth-side">
        <Logo />
        <div>
          <p className="quote">“91% of cyber-attacks begin with a phishing email.”<span className="grad-text"> Be the 9% that doesn’t click.</span></p>
          <p className="mute" style={{ fontSize: 13, marginTop: 10 }}>Commonly cited industry statistic.</p>
        </div>
        <div className="auth-feed">
          <div className="mono mute" style={{ fontSize: 11, letterSpacing: '.15em', marginBottom: 4 }}>LIVE CLASSIFICATION FEED</div>
          {FEED.map((f) => (
            <div key={f.u} className="item">
              {f.bad ? <ShieldAlert size={16} color="var(--danger)" /> : <ShieldCheck size={16} color="var(--safe)" />}
              <span>{f.u}</span>
              <span className={`badge ${f.bad ? 'High' : 'Low'}`} style={{ flex: 'none' }}>{f.bad ? 'phishing' : 'safe'}</span>
            </div>
          ))}
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-card">
          <div style={{ marginBottom: 28 }} className="auth-logo-m"><Logo /></div>
          <h1>{title}</h1>
          <p className="dim" style={{ marginBottom: 28 }}>{subtitle}</p>
          {children}
        </div>
      </div>
      <style>{`@media (min-width: 861px){ .auth-logo-m{ display:none } }`}</style>
    </div>
  )
}
