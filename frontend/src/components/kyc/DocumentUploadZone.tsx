import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { DocumentItem } from '../../types';

interface DocumentUploadZoneProps {
  caseId: string;
  onUploadSuccess: (newDoc: DocumentItem) => void;
}

interface UploadingFileState {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  caseId,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadQueue, setUploadQueue] = useState<UploadingFileState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

  const validateFile = (file: File): string | null => {
    if (file.size === 0) {
      return 'File is empty (0 bytes).';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format (.${ext}). Allowed: PDF, JPG, JPEG, PNG.`;
    }
    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newEntries: UploadingFileState[] = [];
    const validFilesToUpload: { file: File; id: string }[] = [];

    Array.from(files).forEach((file) => {
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      const validationError = validateFile(file);

      if (validationError) {
        newEntries.push({
          id: fileId,
          file,
          progress: 0,
          status: 'error',
          errorMessage: validationError,
        });
      } else {
        newEntries.push({
          id: fileId,
          file,
          progress: 0,
          status: 'uploading',
        });
        validFilesToUpload.push({ file, id: fileId });
      }
    });

    setUploadQueue((prev) => [...prev, ...newEntries]);

    // Execute actual uploads with real progress tracking
    for (const item of validFilesToUpload) {
      try {
        const uploadedDoc = await api.uploadDocument(caseId, item.file, (percent) => {
          setUploadQueue((current) =>
            current.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
          );
        });

        setUploadQueue((current) =>
          current.map((q) =>
            q.id === item.id ? { ...q, progress: 100, status: 'completed' } : q
          )
        );

        onUploadSuccess(uploadedDoc);
      } catch (err: any) {
        setUploadQueue((current) =>
          current.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: err.message || 'Upload failed' }
              : q
          )
        );
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
          <Upload size={22} />
        </div>

        <h4 className="text-sm font-semibold text-slate-800 mb-1">
          Click to upload or drag & drop customer documents
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
          Supported: <strong>PDF, PNG, JPG, JPEG</strong> (Passports, National IDs, PAN Cards, Driving Licenses, Utility Bills). Max size: 15MB.
        </p>

        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-white px-3 py-1 rounded-md border border-slate-200">
          <span>Private Encrypted Storage</span> &bull; <span>Automated OCR & Extraction</span>
        </div>
      </div>

      {/* Upload Progress Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Upload Progress ({uploadQueue.filter((q) => q.status === 'completed').length}/
            {uploadQueue.length})
          </h5>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            {uploadQueue.map((item) => {
              const isPdf = item.file.name.toLowerCase().endsWith('.pdf');
              return (
                <div key={item.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                    {isPdf ? <FileText size={18} className="text-rose-600" /> : <ImageIcon size={18} className="text-blue-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-800 truncate" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-0.5">
                        <AlertCircle size={12} />
                        <span>{item.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {item.status === 'uploading' && (
                      <span className="text-xs font-semibold text-blue-600 font-mono">
                        {item.progress}%
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    )}
                    {item.status === 'error' && (
                      <X size={18} className="text-rose-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
