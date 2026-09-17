import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  UserPlus,
  ClipboardCheck,
  Settings,
  LogOut,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { profile, user, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/kyc', label: 'KYC Cases', icon: ShieldCheck },
    { to: '/kyc/new', label: 'New KYC Case', icon: UserPlus },
    { to: '/review', label: 'Review Queue', icon: ClipboardCheck },
    { to: '/settings', label: 'Settings & Health', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80 bg-slate-950/50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Shield size={20} />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
            KYC Verify <Sparkles size={13} className="text-blue-400" />
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
            AI Compliance Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Session & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold text-xs">
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.full_name || user?.email?.split('@')[0] || 'Compliance Officer'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {profile?.role ? `${profile.role.toUpperCase()}` : user?.email || 'Active Session'}
            </p>
          </div>
        </div>

        {isConfigured && user ? (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-400 text-xs font-medium transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="text-[11px] text-amber-400/90 text-center font-medium">
            Supabase Connection Mode
          </div>
        )}
      </div>
    </aside>
  );
};
