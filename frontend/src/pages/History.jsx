import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/analysis/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading history...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Analysis History</h2>
      
      {history.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>You haven't performed any analyses yet.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Type</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Input</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Risk Level</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Confidence</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: item.analysis_type === 'URL' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: item.analysis_type === 'URL' ? 'var(--primary)' : 'var(--secondary)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                      {item.analysis_type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {item.input}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: item.risk_level === 'High' ? 'var(--danger)' : item.risk_level === 'Medium' ? 'var(--warning)' : 'var(--accent)' }}>
                      {item.risk_level === 'High' ? <ShieldAlert size={18} /> : item.risk_level === 'Medium' ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                      {item.risk_level}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>{item.confidence}%</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
