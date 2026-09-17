import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { RuleIssue } from '../../types';

interface IssuesListProps {
  issues: RuleIssue[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-emerald-900">Zero Compliance Issues Detected</h4>
          <p className="text-xs text-emerald-700 mt-0.5">
            All format, identity, and expiration checks met standards with no discrepancies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {issues.map((issue) => {
        const isCritical = issue.severity === 'CRITICAL';
        const isWarning = issue.severity === 'WARNING';

        return (
          <div
            key={issue.id}
            className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
              isCritical
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : isWarning
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-blue-50/70 border-blue-200 text-blue-950'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {isCritical ? (
                <AlertCircle size={18} className="text-rose-600" />
              ) : isWarning ? (
                <AlertTriangle size={18} className="text-amber-600" />
              ) : (
                <Info size={18} className="text-blue-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold">{issue.title}</span>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                    isCritical
                      ? 'bg-rose-100 text-rose-800'
                      : isWarning
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {issue.rule_code}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{issue.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
