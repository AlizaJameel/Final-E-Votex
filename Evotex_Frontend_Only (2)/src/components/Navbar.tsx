import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Bell, LayoutDashboard } from 'lucide-react';
import EvotexLogo from './ui/EvotexLogo';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('evotex_token');
  const role = localStorage.getItem('evotex_role');

  const handleLogout = () => {
    localStorage.removeItem('evotex_token');
    localStorage.removeItem('evotex_role');
    localStorage.removeItem('evotex_user');
    navigate('/');
  };

  const navLinkClass = 'text-evotex-muted hover:text-evotex-primary font-medium transition-colors text-sm';

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <EvotexLogo to="/" />

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={navLinkClass}>Home</Link>
            <a href="/#features" className={navLinkClass}>Features</a>
            <Link to="/help" className={navLinkClass}>Help</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-4">
                {role === 'voter' && (
                  <>
                    <Link to="/dashboard" className={`flex items-center gap-1.5 ${navLinkClass}`}>
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link to="/notifications" className="text-evotex-muted hover:text-evotex-primary">
                      <Bell className="w-5 h-5" />
                    </Link>
                    <Link to="/profile" className="text-evotex-muted hover:text-evotex-primary">
                      <User className="w-5 h-5" />
                    </Link>
                  </>
                )}
                <button type="button" onClick={handleLogout} className={`flex items-center gap-1.5 ${navLinkClass}`}>
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="evotex-btn-outline text-sm px-5 py-2">Login</Link>
                <Link to="/register" className="evotex-btn-primary text-sm px-5 py-2">Register</Link>
              </>
            )}
          </div>

          <button type="button" className="md:hidden p-2 text-evotex-muted" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-4 flex flex-col gap-3 bg-white">
          <Link to="/" className={navLinkClass} onClick={() => setMobileOpen(false)}>Home</Link>
          <a href="/#features" className={navLinkClass} onClick={() => setMobileOpen(false)}>Features</a>
          <Link to="/help" className={navLinkClass} onClick={() => setMobileOpen(false)}>Help</Link>
          {token ? (
            <>
              <Link to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button type="button" onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-left text-red-500 font-medium">
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" className="evotex-btn-outline text-center" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="evotex-btn-primary text-center" onClick={() => setMobileOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
