import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  FileText,
  Eye,
  RefreshCw,
  CheckSquare,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { KYCCaseDetail, DocumentItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DocumentPreviewModal } from '../components/kyc/DocumentPreviewModal';
import { ExtractionCard } from '../components/kyc/ExtractionCard';
import { ValidationReport } from '../components/kyc/ValidationReport';
import { IssuesList } from '../components/kyc/IssuesList';
import { ReviewActionModal } from '../components/kyc/ReviewActionModal';
import { AuditTimeline } from '../components/kyc/AuditTimeline';
import { DocumentUploadZone } from '../components/kyc/DocumentUploadZone';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [caseData, setCaseData] = useState<KYCCaseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [showUploadZone, setShowUploadZone] = useState<boolean>(false);

  const fetchCase = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await api.getCaseDetail(id);
      setCaseData(data);
    } catch (err: any) {
      console.error('Failed to load case detail:', err);
      setError(err.message || 'Failed to load case details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  const handleReProcess = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const updated = await api.processCase(id);
      setCaseData(updated);
    } catch (err: any) {
      setError(err.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading KYC Case records from Supabase..." size="lg" />;
  }

  if (!caseData) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <AlertCircle size={36} className="text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Case Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'The requested KYC case ID does not exist.'}</p>
        <Link
          to="/kyc"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Back to Cases</span>
        </Link>
      </div>
    );
  }

  const { customer, documents, extracted_data, verification_result, issues, reviews, audit_logs } =
    caseData;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/kyc"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft size={13} />
          <span>Back to Cases Directory</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {customer.full_name}
                </h2>
                <StatusBadge status={caseData.status} size="md" />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1">
                <span>Case #{caseData.case_number}</span>
                <span>&bull;</span>
                <span>Customer ID: {customer.customer_id_number}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge score={caseData.risk_score} />

            <button
              onClick={handleReProcess}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <RefreshCw size={13} className={processing ? 'animate-spin text-blue-600' : ''} />
              <span>{processing ? 'Processing...' : 'Re-Run Verification'}</span>
            </button>

            <button
              onClick={() => setReviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <CheckSquare size={14} />
              <span>Compliance Decision</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Main Two-Column Verification Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Customer info, uploaded documents, review timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer Record
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Created {new Date(customer.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" /> Full Legal Name
                </span>
                <span className="font-bold text-slate-900">{customer.full_name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <CreditCard size={14} className="text-slate-400" /> Customer ID
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {customer.customer_id_number}
                </span>
              </div>

              {customer.email && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" /> Email
                  </span>
                  <span className="text-slate-800">{customer.email}</span>
                </div>
              )}

              {customer.date_of_birth && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" /> Date of Birth
                  </span>
                  <span className="font-mono text-slate-800">{customer.date_of_birth}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Phone size={14} className="text-slate-400" /> Phone
                  </span>
                  <span className="text-slate-800">{customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Submitted Documents ({documents.length})
              </h3>
              <button
                onClick={() => setShowUploadZone(!showUploadZone)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {showUploadZone ? 'Close' : '+ Add Document'}
              </button>
            </div>

            <div className="p-4 space-y-3">
              {showUploadZone && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <DocumentUploadZone
                    caseId={caseData.id}
                    onUploadSuccess={() => {
                      fetchCase();
                      setShowUploadZone(false);
                    }}
                  />
                </div>
              )}

              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No documents uploaded.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {doc.document_type_detected} &bull; {(doc.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex-shrink-0"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Compliance Decisions History */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Reviewer Decisions ({reviews.length})
                </h3>
              </div>
              <div className="p-4 divide-y divide-slate-100 space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">
                        {r.decision === 'APPROVE'
                          ? 'Approved'
                          : r.decision === 'REJECT'
                          ? 'Rejected'
                          : 'Information Requested'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                      "{r.notes || 'No review notes provided.'}"
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Signed off by: {r.reviewer_name || r.reviewer_id}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Full Audit Trail
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {audit_logs.length} logged actions
              </span>
            </div>
            <div className="p-5">
              <AuditTimeline logs={audit_logs} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Validation Engine Results, Issues, Extracted Data */}
        <div className="lg:col-span-7 space-y-6">
          {/* Automated Rule Validation Report */}
          <ValidationReport
            result={verification_result}
            riskScore={caseData.risk_score}
          />

          {/* Detected Issues Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Detected Compliance & Fraud Issues ({issues.length})
              </h3>
            </div>
            <div className="p-5">
              <IssuesList issues={issues} />
            </div>
          </div>

          {/* AI Extracted Structured Fields Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-purple-600" />
                AI Field Extraction & OCR Data
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {extracted_data.length} document dataset(s)
              </span>
            </div>

            {extracted_data.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No extracted document data found. Click "Re-Run Verification" to parse.
              </div>
            ) : (
              extracted_data.map((ext) => {
                const matchedDoc = documents.find((d) => d.id === ext.document_id);
                return (
                  <ExtractionCard
                    key={ext.id}
                    data={ext}
                    document={matchedDoc}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <ReviewActionModal
        caseId={caseData.id}
        caseNumber={caseData.case_number}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={(updated) => setCaseData(updated)}
      />
    </div>
  );
};
