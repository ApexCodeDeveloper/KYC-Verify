import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { DocumentUploadZone } from '../components/kyc/DocumentUploadZone';
import { DocumentItem, KYCCaseDetail } from '../types';

export const NewKycCase: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');

  // Creation State
  const [createdCase, setCreatedCase] = useState<KYCCaseDetail | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newCase = await api.createCase({
        customer_name: customerName,
        customer_id_number: customerId,
        email: email || undefined,
        phone: phone || undefined,
        date_of_birth: dob || undefined,
        notes: notes || undefined,
      });
      setCreatedCase(newCase);
    } catch (err: any) {
      setError(err.message || 'Failed to create KYC case in Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (doc: DocumentItem) => {
    setUploadedDocs((prev) => [...prev, doc]);
  };

  const handleStartProcessing = async () => {
    if (!createdCase) return;
    setProcessing(true);
    setError(null);

    try {
      await api.processCase(createdCase.id);
      navigate(`/kyc/${createdCase.id}`);
    } catch (err: any) {
      setError(err.message || 'Automated verification processing failed.');
      setProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Initiate New KYC Verification</h2>
        <p className="text-xs text-slate-500 mt-1">
          Register customer profile, upload identity documents, and run automated AI fraud checks
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Customer Profile Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900">Customer Identity Profile</h3>
          </div>
          {createdCase && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 size={13} />
              Case #{createdCase.case_number} Created
            </span>
          )}
        </div>

        <form onSubmit={handleCreateCase} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(createdCase)}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Marcus Aurelius"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer ID / Account ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CreditCard size={15} />
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(createdCase)}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="e.g. CUST-90210"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  disabled={Boolean(createdCase)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={15} />
                </div>
                <input
                  type="date"
                  disabled={Boolean(createdCase)}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {!createdCase && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Create Case & Continue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* STEP 2: Document Upload */}
      {createdCase && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden animate-in fade-in duration-200">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900">Upload Identity Documents</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {uploadedDocs.length} Document(s) Uploaded
            </span>
          </div>

          <div className="p-6 space-y-6">
            <DocumentUploadZone
              caseId={createdCase.id}
              onUploadSuccess={handleDocumentUploaded}
            />

            {/* Uploaded Documents List */}
            {uploadedDocs.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Ready for AI Verification ({uploadedDocs.length})
                </h5>
                <div className="space-y-2">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={16} className="text-blue-600" />
                        <span className="font-semibold text-slate-800">{doc.file_name}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          ({(doc.file_size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Uploaded to Supabase Storage
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 3: Trigger Processing */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      Ready to Run AI KYC Extraction & Validation
                    </h4>
                    <p className="text-xs text-blue-700/80 mt-0.5">
                      Extracts structured fields with Gemini AI, verifies expiration, and checks cross-document consistency.
                    </p>
                  </div>

                  <button
                    onClick={handleStartProcessing}
                    disabled={processing}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex-shrink-0 cursor-pointer"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Processing AI Verification...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Verification</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
