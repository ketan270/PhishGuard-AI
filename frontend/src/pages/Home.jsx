import { Link } from 'react-router-dom';
import { ShieldAlert, MailWarning, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', paddingTop: '4rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', marginBottom: '2rem', fontWeight: '500' }}>
        <Activity size={18} />
        AI-Powered Cybersecurity
      </div>
      
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: '1.2' }}>
        Protect Yourself from <br />
        <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Phishing Threats</span>
      </h1>
      
      <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: '1.6' }}>
        Analyze suspicious URLs and email content instantly. Our Machine Learning models detect hidden patterns, protecting your sensitive information from cybercriminals.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
        <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Start Analyzing
        </Link>
        <Link to="/login" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Sign In
        </Link>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <ShieldAlert size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>URL Risk Analysis</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>We extract features like URL length, subdomains, and suspicious keywords to classify links safely before you click them.</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <MailWarning size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Email Content Scanning</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>Using NLP, our system detects urgency indicators, credential requests, and linguistic patterns associated with phishing.</p>
        </div>
      </div>
    </div>
  );
}
