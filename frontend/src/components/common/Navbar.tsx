import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Activity, ShieldCheck, Database, Cpu } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { isConfigured, profile } = useAuth();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api
      .getHealth()
      .then((data) => setHealth(data))
      .catch((e) => setHealth({ status: 'offline', error: e.message }));
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Compliance Overview';
    if (path === '/kyc') return 'KYC Cases Directory';
    if (path === '/kyc/new') return 'Initiate New KYC Verification';
    if (path.startsWith('/kyc/')) return 'Case Verification Inspector';
    if (path === '/review') return 'Human Review Queue';
    if (path === '/settings') return 'System Health & Settings';
    return 'KYC Verification Portal';
  };

  const isDbConnected = health?.database?.connected;
  const isAiReady = health?.ai?.configured;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Supabase connection indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isDbConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={
            isDbConnected
              ? 'Connected to Supabase PostgreSQL Database'
              : 'Supabase credentials pending in backend .env'
          }
        >
          <Database size={12} />
          <span>{isDbConnected ? 'Supabase Live' : 'Supabase Setup Mode'}</span>
        </div>

        {/* AI status indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isAiReady
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={
            isAiReady
              ? 'Gemini 3.8 Flash Multimodal AI active'
              : 'Running in deterministic heuristic rule mode (GEMINI_API_KEY optional)'
          }
        >
          <Cpu size={12} />
          <span>{isAiReady ? 'Gemini AI Active' : 'Heuristic Engine'}</span>
        </div>

        {/* Quick New KYC Action */}
        {location.pathname !== '/kyc/new' && (
          <Link
            to="/kyc/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle size={14} />
            <span>New KYC</span>
          </Link>
        )}
      </div>
    </header>
  );
};
