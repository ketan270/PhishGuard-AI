import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="grid">
          <div>
            <Logo />
            <p style={{ marginTop: 14, maxWidth: 380 }}>
              An explainable, machine-learning based phishing detection system for URLs and emails.
              Exploratory Project, Department of CSE, Chitkara University.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <div className="stack" style={{ gap: 8 }}>
              <Link to="/dashboard">Scanner</Link>
              <Link to="/history">History</Link>
              <Link to="/insights">Model Insights</Link>
            </div>
          </div>
          <div>
            <h4>Project</h4>
            <div className="stack" style={{ gap: 8 }}>
              <Link to="/about">Methodology</Link>
              <Link to="/about#team">Team</Link>
              <a href={`${(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api/docs`} target="_blank" rel="noreferrer">API docs</a>
            </div>
          </div>
        </div>
        <div className="row-between" style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <span>© {new Date().getFullYear()} PhishGuard AI. For educational & research use.</span>
          <span className="mono" style={{ fontSize: 12 }}>Predictions are advisory, not a guarantee of safety.</span>
        </div>
      </div>
    </footer>
  )
}
