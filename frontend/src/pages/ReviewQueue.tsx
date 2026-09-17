import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { KYCCaseListItem } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ReviewQueue: React.FC = () => {
  const [cases, setCases] = useState<KYCCaseListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReviewQueue = async () => {
    try {
      const data = await api.getCases('NEEDS_REVIEW');
      setCases(data);
    } catch (err) {
      console.error('Error fetching review queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Review Queue</h2>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized cases requiring manual officer sign-off due to discrepancies, expired documents, or low extraction confidence
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchReviewQueue();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading pending review cases..." />
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Review Queue Clear</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            There are currently no cases flagged for manual compliance review. All automated checks are passing.
          </p>
          <Link
            to="/kyc"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span>Browse All Cases</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white rounded-2xl border border-amber-200/80 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    {caseItem.case_number}
                  </span>
                  <RiskBadge score={caseItem.risk_score} />
                </div>

                <h4 className="text-base font-bold text-slate-900 mb-1 truncate">
                  {caseItem.customer_name}
                </h4>
                <p className="text-xs text-slate-500 font-mono mb-3">
                  Customer ID: {caseItem.customer_id_number}
                </p>

                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl mb-4 flex items-center gap-2 text-xs text-amber-800">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                  <span className="font-semibold">{caseItem.issues_count} compliance issue(s) detected</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(caseItem.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/kyc/${caseItem.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Open & Review</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
