import React from 'react';
import { History, FileUp, Play, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { AuditLogItem } from '../../types';

interface AuditTimelineProps {
  logs: AuditLogItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No audit log events recorded yet.
      </div>
    );
  }

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'CASE_CREATED':
        return {
          icon: FileText,
          color: 'text-blue-600 bg-blue-100 border-blue-200',
          title: 'Case Created',
        };
      case 'DOCUMENT_UPLOADED':
        return {
          icon: FileUp,
          color: 'text-indigo-600 bg-indigo-100 border-indigo-200',
          title: 'Document Uploaded',
        };
      case 'PROCESSING_STARTED':
        return {
          icon: Play,
          color: 'text-amber-600 bg-amber-100 border-amber-200',
          title: 'AI Processing Started',
        };
      case 'PROCESSING_COMPLETED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-100 border-emerald-200',
          title: 'Processing Completed',
        };
      case 'ISSUE_DETECTED':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 bg-amber-100 border-amber-200',
          title: 'Issue Detected',
        };
      case 'CASE_APPROVED':
        return {
          icon: ShieldCheck,
          color: 'text-emerald-600 bg-emerald-100 border-emerald-200',
          title: 'Case Approved by Reviewer',
        };
      case 'CASE_REJECTED':
        return {
          icon: ShieldAlert,
          color: 'text-rose-600 bg-rose-100 border-rose-200',
          title: 'Case Rejected by Reviewer',
        };
      default:
        return {
          icon: History,
          color: 'text-slate-600 bg-slate-100 border-slate-200',
          title: action.replace(/_/g, ' '),
        };
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {logs.map((log) => {
        const config = getActionConfig(log.action);
        const Icon = config.icon;
        const metaEntries = Object.entries(log.metadata || {});

        return (
          <div key={log.id} className="relative group">
            {/* Timeline icon indicator */}
            <div
              className={`absolute -left-6 top-0 w-6 h-6 rounded-full border flex items-center justify-center -translate-x-1/2 bg-white ${config.color}`}
            >
              <Icon size={12} />
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-800">{config.title}</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatDate(log.created_at)}
                </span>
              </div>

              {log.user_email && (
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Actor: <span className="font-medium text-slate-700">{log.user_email}</span>
                </p>
              )}

              {metaEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  {metaEntries.map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-slate-50 rounded border border-slate-200 text-slate-600"
                    >
                      <strong className="font-semibold text-slate-500">{k}:</strong>
                      <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
