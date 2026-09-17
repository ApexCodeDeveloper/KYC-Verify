import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, X, Loader2 } from 'lucide-react';
import { ReviewDecision } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface ReviewActionModalProps {
  caseId: string;
  caseNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCase: any) => void;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  caseId,
  caseNumber,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [decision, setDecision] = useState<ReviewDecision>('APPROVE');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updated = await api.submitReview(caseId, decision, notes, user?.id);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Compliance Review Decision</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Case Number: <span className="font-mono font-semibold text-slate-700">{caseNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Review Decision
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  decision === 'APPROVE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <CheckCircle2 size={20} className={decision === 'APPROVE' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs font-bold">Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  decision === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <XCircle size={20} className={decision === 'REJECT' ? 'text-rose-600' : 'text-slate-400'} />
                <span className="text-xs font-bold">Reject</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REQUEST_INFO')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  decision === 'REQUEST_INFO'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <HelpCircle size={20} className={decision === 'REQUEST_INFO' ? 'text-amber-600' : 'text-slate-400'} />
                <span className="text-xs font-bold">Request Info</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Compliance Notes & Justification
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail reasons for approval/rejection, verification notes, or extra documents required..."
              rows={4}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>Submit Decision</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
