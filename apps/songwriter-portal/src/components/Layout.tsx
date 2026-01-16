import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, DollarSign, Music, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen bg-studio-bg flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-studio-border bg-studio-surface flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-studio-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-primary rounded-studio-md flex items-center justify-center shadow-glow-sm">
              <Music className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text-primary">Songwriter Portal</h1>
              {songwriter && (
                <p className="text-xs text-text-tertiary truncate max-w-[140px]">
                  {songwriter.legal_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-studio-md text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'gradient-primary text-white shadow-glow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-studio-surface-hover'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    'w-4.5 h-4.5 transition-colors',
                    isActive ? 'text-white' : 'text-text-tertiary group-hover:text-text-secondary'
                  )} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section & Logout */}
        <div className="p-3 border-t border-studio-border">
          {songwriter && (
            <div className="mb-3 px-3 py-2 rounded-studio bg-studio-surface-hover">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 gradient-purple rounded-full flex items-center justify-center text-xs font-semibold text-white">
                  {songwriter.legal_name?.charAt(0) || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {songwriter.stage_name || songwriter.legal_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary">Songwriter</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-studio-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-studio-surface-hover w-full transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-studio-bg">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
