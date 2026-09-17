import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, AlertCircle } from 'lucide-react';
import { ExtractedData, DocumentItem } from '../../types';

interface ExtractionCardProps {
  data: ExtractedData;
  document?: DocumentItem;
}

export const ExtractionCard: React.FC<ExtractionCardProps> = ({ data, document }) => {
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fields = data.fields || {};
  const confidencePercent = Math.round((data.confidence || 0) * 100);

  const displayFields = [
    { label: 'Full Name', value: fields.full_name, key: 'full_name' },
    { label: 'Document Number', value: fields.document_number, key: 'document_number' },
    { label: 'Date of Birth', value: fields.date_of_birth, key: 'date_of_birth' },
    { label: 'Expiry Date', value: fields.expiry_date, key: 'expiry_date' },
    { label: 'Issue Date', value: fields.issue_date, key: 'issue_date' },
    { label: 'Gender', value: fields.gender, key: 'gender' },
    { label: 'Nationality', value: fields.nationality, key: 'nationality' },
    { label: 'Address', value: fields.address, key: 'address', fullWidth: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              {document?.file_name || 'Document Extraction'}
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              Model: {data.ai_model || 'Gemini 3.8 Flash'}
            </span>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Confidence</span>
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            <div
              className={`w-2 h-2 rounded-full ${
                confidencePercent >= 80
                  ? 'bg-emerald-500'
                  : confidencePercent >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-bold font-mono text-slate-800">
              {confidencePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Structured Fields Grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayFields.map((f) => {
          if (!f.value) return null;
          return (
            <div
              key={f.key}
              className={`p-3 rounded-lg bg-slate-50/70 border border-slate-100 ${
                f.fullWidth ? 'sm:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {f.label}
                </span>
                <button
                  onClick={() => copyToClipboard(String(f.value), f.key)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy value"
                >
                  {copiedField === f.key ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
              <p className="text-sm font-medium text-slate-800 break-words">
                {String(f.value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Raw OCR / Text Toggle */}
      {data.raw_text && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <button
            onClick={() => setShowRawText(!showRawText)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>Raw OCR / Extracted Text Stream</span>
            {showRawText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showRawText && (
            <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-300 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
              {data.raw_text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
