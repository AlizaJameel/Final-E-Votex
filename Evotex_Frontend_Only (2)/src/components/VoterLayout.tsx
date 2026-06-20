import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, BarChart3, Vote, CheckCircle, HelpCircle, LogOut, Bell, Menu, X } from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', to: '/dashboard' },
  { icon: Vote, label: 'Elections', to: '/elections', matchPrefix: true },
  { icon: CheckCircle, label: 'My Votes', to: '/profile' },
  { icon: HelpCircle, label: 'Help', to: '/help' },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem('evotex_token');
    localStorage.removeItem('evotex_role');
    localStorage.removeItem('evotex_user');
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-green-800/80">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-evotex-sidebar-active p-2 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display">E-Votex</h1>
            <p className="text-xs text-green-300">Voter Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.matchPrefix
            ? location.pathname.startsWith(item.to)
            : location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                active ? 'bg-evotex-sidebar-active text-white' : 'text-green-200 hover:bg-green-800'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-green-800/80">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

export default function VoterLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = (() => {
    try {
      const u = localStorage.getItem('evotex_user');
      return u ? JSON.parse(u).name : 'Ahmed Khan';
    } catch {
      return 'Ahmed Khan';
    }
  })();

  return (
    <div className="flex min-h-screen bg-evotex-surface">
      <aside className="hidden md:flex flex-col w-64 bg-evotex-sidebar shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 w-64 h-full bg-evotex-sidebar">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 text-gray-600"
                aria-label="Open menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate font-display">{title}</h2>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-evotex-primary">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  2
                </span>
              </Link>
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 min-w-0">
                <div className="w-8 h-8 bg-evotex-primary rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {userName.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-gray-700 hidden sm:block truncate max-w-[120px]">{userName}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-page mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
