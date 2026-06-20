import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  BarChart3,
  Vote,
  Users,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  UserCheck,
  Search,
  User,
} from 'lucide-react';
import AdminBadge from './ui/AdminBadge';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Vote, label: 'Elections Management', to: '/admin/elections' },
  { icon: UserCheck, label: 'Candidates', to: '/admin/elections/create' },
  { icon: Users, label: 'Voters Management', to: '/admin/voters' },
  { icon: TrendingUp, label: 'Results & Analytics', to: '/admin/results/1' },
  { icon: FileText, label: 'Audit Logs', to: '/admin/notifications' },
  { icon: Settings, label: 'System Settings', to: '/admin/settings' },
];

function isNavActive(path: string, current: string) {
  if (path.startsWith('/admin/results')) return current.startsWith('/admin/results');
  if (path === '/admin/elections/create') return current === '/admin/elections/create';
  if (path === '/admin/elections')
    return current === '/admin/elections' || (current.startsWith('/admin/elections/') && current !== '/admin/elections/create');
  if (path === '/admin/notifications') return current === '/admin/notifications';
  return current === path;
}

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
            <p className="text-xs text-green-300">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isNavActive(item.to, location.pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                active ? 'bg-evotex-sidebar-active text-white' : 'text-green-200 hover:bg-green-800'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
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

export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = () => {
    localStorage.removeItem('evotex_token');
    localStorage.removeItem('evotex_role');
    localStorage.removeItem('evotex_user');
    navigate('/');
  };

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
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate font-display">{title}</h2>
              <AdminBadge />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button type="button" className="p-2 text-gray-400 hover:text-evotex-primary hidden sm:block" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
              <NavLink to="/admin/notifications" className="relative p-2 text-gray-400 hover:text-evotex-primary">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </NavLink>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                  <div className="w-8 h-8 bg-evotex-primary rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700">Admin</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-48 z-50">
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); navigate('/admin/settings'); }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <User className="w-4 h-4 text-gray-400" /> Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); navigate('/admin/settings'); }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <Settings className="w-4 h-4 text-gray-400" /> Settings
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
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
