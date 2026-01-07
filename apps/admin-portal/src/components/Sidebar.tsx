import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  FileText,
  DollarSign,
  Users,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-notion-purple-text' },
  { to: '/works', icon: Music, label: 'Works', color: 'text-notion-purple-text' },
  { to: '/deals', icon: FileText, label: 'Deals', color: 'text-notion-blue-text' },
  { to: '/usage', icon: BarChart3, label: 'Usage', color: 'text-notion-orange-text' },
  { to: '/royalties', icon: DollarSign, label: 'Royalties', color: 'text-notion-green-text' },
  { to: '/songwriters', icon: Users, label: 'Songwriters', color: 'text-notion-yellow-text' },
  { to: '/settings', icon: Settings, label: 'Settings', color: 'text-notion-gray-text' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-notion-bg-secondary flex flex-col border-r border-notion-border-light">
      {/* Logo */}
      <div className="h-12 flex items-center px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-notion-purple-text to-notion-blue-text rounded-md flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-notion-text">MusicPub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-colors duration-100',
                  isActive
                    ? 'bg-white shadow-notion text-notion-text font-medium'
                    : 'text-notion-text-secondary hover:bg-notion-bg-hover'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors duration-100',
                    isActive ? item.color : 'text-notion-text-tertiary group-hover:text-notion-text-secondary'
                  )} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-2 py-3 border-t border-notion-border-light">
        <button
          className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm text-notion-text-secondary rounded-md hover:bg-notion-bg-hover transition-colors duration-100"
        >
          <LogOut className="w-4 h-4 text-notion-text-tertiary" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
