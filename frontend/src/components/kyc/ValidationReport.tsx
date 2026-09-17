import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Shield, Info } from 'lucide-react';
import { ValidationResult, ValidationCheck } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBadge } from '../common/RiskBadge';

interface ValidationReportProps {
  result?: ValidationResult | null;
  riskScore: number;
}

export const ValidationReport: React.FC<ValidationReportProps> = ({ result, riskScore }) => {
  if (!result) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center">
        <Shield size={32} className="text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">Validation Not Run</h4>
        <p className="text-xs text-slate-500 mt-1">
          Upload customer documents and click "Process Case" to run the automated verification engine.
        </p>
      </div>
    );
  }

  const checks = result.checks_run || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Automated Rule & Risk Engine
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {result.summary || 'Summary of automated KYC rules evaluation'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge score={riskScore} />
          <StatusBadge status={result.overall_status} size="md" />
        </div>
      </div>

      {/* Checklist Table */}
      <div className="divide-y divide-slate-100">
        {checks.map((check: ValidationCheck, idx: number) => {
          return (
            <div key={idx} className="p-4 flex items-start gap-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {check.passed ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : check.severity === 'CRITICAL' ? (
                  <XCircle size={18} className="text-rose-500" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-800 tracking-tight">
                    {check.check_name}
                  </h5>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      check.passed
                        ? 'bg-emerald-50 text-emerald-700'
                        : check.severity === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {check.passed ? 'PASSED' : check.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{check.details}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
