export type KYCStatus = 'PROCESSING' | 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' | 'FAILED';

export type DocumentType =
  | 'PASSPORT'
  | 'DRIVING_LICENSE'
  | 'NATIONAL_ID'
  | 'PAN_CARD'
  | 'UTILITY_BILL'
  | 'UNKNOWN';

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type ReviewDecision = 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface Customer {
  id: string;
  customer_id_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  case_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size: number;
  document_type_detected: DocumentType;
  status: string;
  created_at: string;
  signed_url?: string;
}

export interface ExtractedFields {
  full_name?: string;
  document_number?: string;
  date_of_birth?: string;
  expiry_date?: string;
  issue_date?: string;
  address?: string;
  gender?: string;
  nationality?: string;
}

export interface ExtractedData {
  id: string;
  document_id: string;
  raw_text?: string;
  fields: ExtractedFields;
  confidence: number;
  ai_model?: string;
  extracted_at: string;
}

export interface ValidationCheck {
  check_name: string;
  passed: boolean;
  details: string;
  severity: IssueSeverity;
}

export interface RuleIssue {
  id: string;
  case_id: string;
  document_id?: string;
  rule_code: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  created_at: string;
}

export interface VerificationResult {
  id: string;
  case_id: string;
  overall_status: KYCStatus;
  confidence_score: number;
  checks_run: ValidationCheck[];
  summary?: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  case_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  decision: ReviewDecision;
  notes?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  case_id?: string;
  user_id?: string;
  user_email?: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface KYCCaseListItem {
  id: string;
  case_number: string;
  customer_id: string;
  customer_name: string;
  customer_id_number: string;
  status: KYCStatus;
  risk_score: number;
  documents_count: number;
  issues_count: number;
  created_at: string;
  updated_at?: string;
}

export interface KYCCaseDetail {
  id: string;
  case_number: string;
  customer: Customer;
  status: KYCStatus;
  risk_score: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  documents: DocumentItem[];
  extracted_data: ExtractedData[];
  verification_result?: VerificationResult;
  issues: RuleIssue[];
  reviews: ReviewItem[];
  audit_logs: AuditLogItem[];
}

export interface DashboardStats {
  total_cases: number;
  verified_count: number;
  processing_count: number;
  needs_review_count: number;
  rejected_count: number;
  failed_count: number;
  status_distribution: Record<string, number>;
  recent_cases: KYCCaseListItem[];
  review_queue: KYCCaseListItem[];
}

// Alias used by ValidationReport component
export type ValidationResult = VerificationResult;
