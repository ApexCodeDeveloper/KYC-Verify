import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  PlusCircle,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardStats, KYCCaseListItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return <LoadingSpinner message="Querying live Supabase verification metrics..." size="lg" />;
  }

  const total = stats?.total_cases || 0;
  const verified = stats?.verified_count || 0;
  const needsReview = stats?.needs_review_count || 0;
  const processing = stats?.processing_count || 0;
  const rejected = stats?.rejected_count || 0;

  // Real percentage calculations from database
  const verifiedPct = total > 0 ? ((verified / total) * 100).toFixed(0) : '0';
  const needsReviewPct = total > 0 ? ((needsReview / total) * 100).toFixed(0) : '0';
  const processingPct = total > 0 ? ((processing / total) * 100).toFixed(0) : '0';
  const rejectedPct = total > 0 ? ((rejected / total) * 100).toFixed(0) : '0';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time KYC identity verification metrics and automated compliance audit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            <span>Refresh Data</span>
          </button>

          <Link
            to="/kyc/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle size={15} />
            <span>New KYC Case</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <span className="text-[11px] font-mono">Check Supabase connection in backend</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Directly from Supabase DB</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Verified
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono">{verified}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">{verifiedPct}% of total cases</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-2xs ring-2 ring-amber-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Needs Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono">{needsReview}</div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Requires officer sign-off</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Processing
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-700 font-mono">{processing}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">{processingPct}% pending analysis</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Rejected
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-700 font-mono">{rejected}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">{rejectedPct}% failed criteria</div>
        </div>
      </div>

      {/* Distribution Chart / Progress Bar */}
      {total > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verification Status Distribution
            </h4>
            <span className="text-xs text-slate-500 font-mono">{total} Total Logged In Database</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
            {verified > 0 && (
              <div
                style={{ width: `${(verified / total) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Verified: ${verified}`}
              />
            )}
            {needsReview > 0 && (
              <div
                style={{ width: `${(needsReview / total) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Needs Review: ${needsReview}`}
              />
            )}
            {processing > 0 && (
              <div
                style={{ width: `${(processing / total) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`Processing: ${processing}`}
              />
            )}
            {rejected > 0 && (
              <div
                style={{ width: `${(rejected / total) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Rejected: ${rejected}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Verified ({verified})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Needs Review ({needsReview})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600">Processing ({processing})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600">Rejected ({rejected})</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Urgent Review Queue & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Urgent Review Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cases Requiring Review</h3>
                <p className="text-xs text-slate-500">
                  {stats?.review_queue?.length || 0} flagged cases awaiting compliance decision
                </p>
              </div>
            </div>

            <Link
              to="/review"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {stats?.review_queue && stats.review_queue.length > 0 ? (
              stats.review_queue.map((caseItem: KYCCaseListItem) => (
                <div
                  key={caseItem.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {caseItem.customer_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {caseItem.case_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>ID: {caseItem.customer_id_number}</span>
                      <span>&bull;</span>
                      <span className="text-amber-700 font-medium">
                        {caseItem.issues_count} issues flagged
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <RiskBadge score={caseItem.risk_score} />
                    <Link
                      to={`/kyc/${caseItem.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No cases currently pending compliance review.
              </div>
            )}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FileCheck2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent KYC Activity</h3>
                <p className="text-xs text-slate-500">Latest customer submissions</p>
              </div>
            </div>

            <Link
              to="/kyc"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View Directory</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {stats?.recent_cases && stats.recent_cases.length > 0 ? (
              stats.recent_cases.map((caseItem: KYCCaseListItem) => (
                <div
                  key={caseItem.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {caseItem.customer_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {caseItem.case_number}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(caseItem.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={caseItem.status} size="sm" />
                    <Link
                      to={`/kyc/${caseItem.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No KYC Cases Found"
                description="Begin verifying customer identities by uploading documents to create your first case."
                action={{
                  label: "Create KYC Case",
                  onClick: () => window.location.assign("/kyc/new")
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
