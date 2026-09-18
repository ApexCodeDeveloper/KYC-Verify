import {
  DashboardStats,
  DocumentItem,
  KYCCaseDetail,
  KYCCaseListItem,
  ReviewDecision,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://kyc-verifier-backend.onrender.com/';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<any> {
    const res = await fetch(`${API_URL}/api/health`);
    return handleResponse(res);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_URL}/api/dashboard/stats`);
    return handleResponse<DashboardStats>(res);
  },

  async getCases(
    status?: string,
    search?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<KYCCaseListItem[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const res = await fetch(`${API_URL}/api/kyc?${params.toString()}`);
    return handleResponse<KYCCaseListItem[]>(res);
  },

  async getCaseDetail(caseId: string): Promise<KYCCaseDetail> {
    const res = await fetch(`${API_URL}/api/kyc/${caseId}`);
    return handleResponse<KYCCaseDetail>(res);
  },

  async createCase(data: {
    customer_id_number: string;
    customer_name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    notes?: string;
  }): Promise<KYCCaseDetail> {
    const res = await fetch(`${API_URL}/api/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<KYCCaseDetail>(res);
  },

  /**
   * Uploads an actual document file with REAL progress reporting via XMLHttpRequest.
   */
  uploadDocument(
    caseId: string,
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<DocumentItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_URL}/api/kyc/${caseId}/documents`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse upload response.'));
          }
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            reject(new Error(errJson.detail || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during document upload.'));
      };

      xhr.send(formData);
    });
  },

  async processCase(caseId: string): Promise<KYCCaseDetail> {
    const res = await fetch(`${API_URL}/api/kyc/${caseId}/process`, {
      method: 'POST',
    });
    return handleResponse<KYCCaseDetail>(res);
  },

  async submitReview(
    caseId: string,
    decision: ReviewDecision,
    notes?: string,
    reviewerId?: string
  ): Promise<KYCCaseDetail> {
    const res = await fetch(`${API_URL}/api/kyc/${caseId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes, reviewer_id: reviewerId }),
    });
    return handleResponse<KYCCaseDetail>(res);
  },

  async getDocumentSignedUrl(docId: string): Promise<{ signed_url: string }> {
    const res = await fetch(`${API_URL}/api/documents/${docId}/signed-url`);
    return handleResponse<{ signed_url: string }>(res);
  },
};
