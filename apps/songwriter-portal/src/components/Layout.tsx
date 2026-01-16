import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, DollarSign, Music, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export function Layout() {
  const navigate = useNavigate();
  const { songwriter, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/royalties', icon: DollarSign, label: 'Royalties' },
    { path: '/works', icon: Music, label: 'My Works' },
  ];

  return (
    <div className="min-h-screen bg-notion-bg flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-notion-border-light bg-notion-bg-secondary flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-notion-border-light">
          <h1 className="text-sm font-semibold text-notion-text">Songwriter Portal</h1>
          {songwriter && (
            <p className="text-xs text-notion-text-tertiary mt-1 truncate">
              {songwriter.legal_name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-notion text-sm transition-colors duration-100',
                  isActive
                    ? 'bg-notion-bg-active text-notion-text font-medium'
                    : 'text-notion-text-secondary hover:bg-notion-bg-hover hover:text-notion-text'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-notion-border-light">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-notion text-sm text-notion-text-secondary hover:bg-notion-bg-hover hover:text-notion-text w-full transition-colors duration-100"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
