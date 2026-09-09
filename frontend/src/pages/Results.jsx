import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  if (!result) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p>No results found. Please analyze a URL or Email first.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const isPhishing = result.prediction === 'Phishing';
  
  let riskColor = 'var(--accent)';
  let RiskIcon = ShieldCheck;
  
  if (result.risk_level === 'High') {
    riskColor = 'var(--danger)';
    RiskIcon = ShieldAlert;
  } else if (result.risk_level === 'Medium') {
    riskColor = 'var(--warning)';
    RiskIcon = AlertTriangle;
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/dashboard')} 
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>
      
      <div className="glass-panel" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: riskColor }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(${riskColor === 'var(--danger)' ? '239, 68, 68' : riskColor === 'var(--warning)' ? '245, 158, 11' : '16, 185, 129'}, 0.1)`, color: riskColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiskIcon size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: riskColor }}>{result.prediction}</h2>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <strong style={{ color: 'var(--text-main)' }}>Risk Level:</strong> {result.risk_level}
              </span>
              <span>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <strong style={{ color: 'var(--text-main)' }}>Confidence:</strong> {result.confidence}%
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
          <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Analyzed Input</h4>
          <p style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '1.1rem' }}>{result.input}</p>
        </div>
        
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Detected Indicators</h3>
        <ul style={{ listStyle: 'none', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {result.indicators.map((indicator, idx) => (
            <li key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ color: isPhishing ? 'var(--danger)' : 'var(--accent)', marginTop: '2px' }}>
                {isPhishing ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <span style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>{indicator}</span>
            </li>
          ))}
        </ul>
        
        <div style={{ background: `rgba(${riskColor === 'var(--danger)' ? '239, 68, 68' : riskColor === 'var(--warning)' ? '245, 158, 11' : '16, 185, 129'}, 0.1)`, padding: '2rem', borderRadius: '12px', border: `1px solid rgba(${riskColor === 'var(--danger)' ? '239, 68, 68' : riskColor === 'var(--warning)' ? '245, 158, 11' : '16, 185, 129'}, 0.3)` }}>
          <h3 style={{ marginBottom: '1rem', color: riskColor }}>Security Recommendation</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            {result.risk_level === 'High' && "Do NOT open this URL or provide any personal information. This is highly likely a malicious attempt to steal your data."}
            {result.risk_level === 'Medium' && "Proceed with extreme caution. Verify the sender or website independently before providing any sensitive information."}
            {result.risk_level === 'Low' && "No significant phishing indicators were detected, but normal cybersecurity precautions should still be followed."}
          </p>
        </div>
      </div>
    </div>
  );
}
