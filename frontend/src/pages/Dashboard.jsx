import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { Link2, Mail, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'email'
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!input) return;
    
    setLoading(true);
    try {
      const endpoint = activeTab === 'url' ? '/api/analysis/url' : '/api/analysis/email';
      const payload = activeTab === 'url' ? { url: input } : { email_text: input };
      
      const res = await axios.post(`http://localhost:8000${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      navigate('/results', { state: { result: res.data } });
    } catch (err) {
      console.error(err);
      alert('Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Welcome, {user?.name}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>What would you like to analyze today?</p>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            style={{ flex: 1, padding: '1.5rem', background: activeTab === 'url' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', border: 'none', color: activeTab === 'url' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => { setActiveTab('url'); setInput(''); }}
          >
            <Link2 size={20} />
            URL Analysis
          </button>
          <button 
            style={{ flex: 1, padding: '1.5rem', background: activeTab === 'email' ? 'rgba(139, 92, 246, 0.1)' : 'transparent', border: 'none', color: activeTab === 'email' ? 'var(--secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => { setActiveTab('email'); setInput(''); }}
          >
            <Mail size={20} />
            Email Analysis
          </button>
        </div>
        
        <form onSubmit={handleAnalyze} style={{ padding: '3rem' }}>
          {activeTab === 'url' ? (
            <div className="input-group">
              <label>Suspicious URL</label>
              <input 
                type="url" 
                className="input-field" 
                style={{ padding: '1rem', fontSize: '1.1rem' }}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                required 
                placeholder="https://example.com/login"
              />
            </div>
          ) : (
            <div className="input-group">
              <label>Suspicious Email Content</label>
              <textarea 
                className="input-field" 
                style={{ padding: '1rem', fontSize: '1.1rem', minHeight: '200px', resize: 'vertical' }}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                required 
                placeholder="Paste the email content here..."
              />
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}} />
        </form>
      </div>
    </div>
  );
}
