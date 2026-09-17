import React from 'react';
import { KYCStatus } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: KYCStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  switch (status) {
    case 'VERIFIED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses[size]}`}
        >
          <CheckCircle2 size={iconSizes[size]} className="text-emerald-600" />
          Verified
        </span>
      );
    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses[size]}`}
        >
          <Clock size={iconSizes[size]} className="animate-spin text-blue-600" />
          Processing
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses[size]}`}
        >
          <AlertTriangle size={iconSizes[size]} className="text-amber-600" />
          Needs Review
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses[size]}`}
        >
          <XCircle size={iconSizes[size]} className="text-rose-600" />
          Rejected
        </span>
      );
    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-300 ${sizeClasses[size]}`}
        >
          <AlertOctagon size={iconSizes[size]} className="text-gray-600" />
          Failed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 ${sizeClasses[size]}`}
        >
          {status}
        </span>
      );
  }
};
