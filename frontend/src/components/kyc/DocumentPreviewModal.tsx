import React from 'react';
import { X, ExternalLink, Download, FileText, AlertCircle } from 'lucide-react';
import { DocumentItem } from '../../types';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
}) => {
  if (!document) return null;

  const isPdf =
    document.file_type.includes('pdf') ||
    document.file_name.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 truncate max-w-md">
                {document.file_name}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {document.document_type_detected} &bull; {(document.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.signed_url && (
              <a
                href={document.signed_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Preview Pane */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
          {document.signed_url ? (
            isPdf ? (
              <iframe
                src={`${document.signed_url}#toolbar=1`}
                title={document.file_name}
                className="w-full h-full rounded-lg border border-slate-300 bg-white"
              />
            ) : (
              <img
                src={document.signed_url}
                alt={document.file_name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
              />
            )
          ) : (
            <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 max-w-md">
              <AlertCircle size={32} className="text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800 mb-1">
                Document URL Unavailable
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                To view this document, ensure your Supabase Storage bucket ('kyc-documents') is configured with valid read permissions and API credentials.
              </p>
              <p className="text-[11px] font-mono bg-slate-50 p-2 rounded text-slate-600">
                Storage Path: {document.storage_path}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
