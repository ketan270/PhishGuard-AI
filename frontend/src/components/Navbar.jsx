import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { ShieldCheck, LogOut, LayoutDashboard, History } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="animate-fade-in">
      <Link to="/" className="logo">
        <ShieldCheck size={28} />
        PhishGuard AI
      </Link>
      
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-secondary">
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            <Link to="/history" className="btn btn-secondary">
              <History size={18} />
              History
            </Link>
            <button onClick={handleLogout} className="btn btn-primary" style={{ background: 'var(--danger)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}>
              <LogOut size={18} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary">Login</Link>
            <Link to="/register" className="btn btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
