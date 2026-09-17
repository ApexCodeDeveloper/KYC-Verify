import React, { useEffect, useState } from 'react';
import {
  Database,
  Cpu,
  FileSearch,
  CheckCircle2,
  XCircle,
  Shield,
  Sliders,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export const Settings: React.FC = () => {
  const { profile } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err: any) {
      setHealth({ status: 'offline', error: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isDbLive = health?.database?.connected;
  const isAiLive = health?.ai?.configured;
  const isOcrBinary = health?.ocr?.tesseract_binary_detected;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & Health</h2>
          <p className="text-xs text-slate-500 mt-1">
            Service connections, AI providers, regulatory parameters, and environment diagnostics
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchHealth();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          <span>Re-Check Health</span>
        </button>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Supabase PostgreSQL & Auth */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database size={18} />
              </div>
              {isDbLive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <XCircle size={12} /> Setup Required
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-900">Supabase Platform</h3>
            <p className="text-xs text-slate-500 mt-1">
              PostgreSQL DB, Row Level Security, Auth Sessions, and Private Storage.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
            Client: {isSupabaseConfigured() ? 'Configured' : 'Placeholder URL'}
          </div>
        </div>

        {/* Gemini Multimodal AI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Cpu size={18} />
              </div>
              {isAiLive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  <CheckCircle2 size={12} /> Live API
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Fallback Mode
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-900">Google Gemini AI</h3>
            <p className="text-xs text-slate-500 mt-1">
              Multimodal structured document vision and entity parsing ({health?.ai?.model || 'gemini-3.8-flash'}).
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
            {isAiLive ? 'Active (API Key loaded)' : 'Heuristic regex parser fallback'}
          </div>
        </div>

        {/* PDF & OCR Parsing Engine */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSearch size={18} />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <CheckCircle2 size={12} /> Ready
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">OCR & PDF Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              PyPDF text streams and Pytesseract rasterized image OCR.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
            Binary: {isOcrBinary ? 'Tesseract on PATH' : 'Digital PDF text active'}
          </div>
        </div>
      </div>

      {/* Compliance Rules & Thresholds */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
          <Sliders size={16} className="text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Configured KYC Compliance Rules</h3>
        </div>

        <div className="p-6 divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between first:pt-0">
            <div>
              <span className="font-bold text-slate-800">Minimum Legal Age Requirement</span>
              <p className="text-slate-500 text-[11px]">Applicants below this threshold are automatically rejected.</p>
            </div>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
              18 Years
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800">Document Expiration Enforcement</span>
              <p className="text-slate-500 text-[11px]">
                Documents with past expiry dates are immediately flagged as Critical.
              </p>
            </div>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              Active (Strict)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800">Cross-Document Discrepancy Check</span>
              <p className="text-slate-500 text-[11px]">
                Detects name and DOB contradictions across all submitted documents (e.g. Passport vs PAN).
              </p>
            </div>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              Active (Token + Surname Matching)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800">Minimum Confidence Review Threshold</span>
              <p className="text-slate-500 text-[11px]">
                Extractions scoring below 70% are automatically sent to human review.
              </p>
            </div>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
              70.0%
            </span>
          </div>

          <div className="py-3 flex items-center justify-between last:pb-0">
            <div>
              <span className="font-bold text-slate-800">Maximum Allowed File Upload Size</span>
              <p className="text-slate-500 text-[11px]">Validated on both client and FastAPI backend.</p>
            </div>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
              15 MB
            </span>
          </div>
        </div>
      </div>

      {/* Environment Setup Guide */}
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Terminal size={18} className="text-blue-400" />
          <span>Quick Environment Configuration Guide</span>
        </div>

        <p className="text-xs text-slate-400">
          Ensure the following variables are configured in your <code className="text-blue-300">backend/.env</code> and <code className="text-blue-300">frontend/.env</code> files:
        </p>

        <div className="space-y-3 font-mono text-[11px]">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-1"># backend/.env</span>
            <div className="text-emerald-400">SUPABASE_URL=https://your-project.supabase.co</div>
            <div className="text-emerald-400">SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key</div>
            <div className="text-emerald-400">GEMINI_API_KEY=your-gemini-api-key</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block mb-1"># frontend/.env</span>
            <div className="text-cyan-400">VITE_SUPABASE_URL=https://your-project.supabase.co</div>
            <div className="text-cyan-400">VITE_SUPABASE_ANON_KEY=your-public-anon-key</div>
            <div className="text-cyan-400">VITE_API_URL=http://localhost:8000</div>
          </div>
        </div>
      </div>
    </div>
  );
};
