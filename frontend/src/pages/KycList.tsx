import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { KYCCaseListItem, KYCStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const KycList: React.FC = () => {
  const [cases, setCases] = useState<KYCCaseListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'risk' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCases = async () => {
    try {
      const data = await api.getCases(statusFilter, searchTerm);
      setCases(data);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  // Client-side sort
  const sortedCases = [...cases].sort((a, b) => {
    if (sortBy === 'date') {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? diff : -diff;
    } else if (sortBy === 'risk') {
      return sortOrder === 'asc' ? a.risk_score - b.risk_score : b.risk_score - a.risk_score;
    } else {
      return sortOrder === 'asc'
        ? a.customer_name.localeCompare(b.customer_name)
        : b.customer_name.localeCompare(a.customer_name);
    }
  });

  const toggleSort = (field: 'date' | 'risk' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">KYC Cases Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and audit identity verification workflows across all financial customers
          </p>
        </div>

        <Link
          to="/kyc/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <PlusCircle size={16} />
          <span>New KYC Case</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, customer ID, or case number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="PROCESSING">Processing</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchCases();
            }}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
            title="Reload cases"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Fetching cases from Supabase..." />
        ) : sortedCases.length === 0 ? (
          <EmptyState
            title="No Matching KYC Cases"
            description="No verification records matched your current query or filter criteria."
            action={{
              label: "Create New KYC Case",
              onClick: () => window.location.assign("/kyc/new")
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Case ID</th>
                  <th className="py-3.5 px-4">Documents</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('risk')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Risk Assessment</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Issues</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Created Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{c.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {c.customer_id_number}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 font-medium">
                      {c.case_number}
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-medium">
                        <FileText size={12} />
                        <span>{c.documents_count}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-4 px-4">
                      <RiskBadge score={c.risk_score} />
                    </td>
                    <td className="py-4 px-4">
                      {c.issues_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle size={12} />
                          {c.issues_count}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={`/kyc/${c.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
