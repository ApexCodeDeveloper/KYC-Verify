from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class KYCStatus(str, Enum):
    PROCESSING = "PROCESSING"
    VERIFIED = "VERIFIED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"
    FAILED = "FAILED"


class DocumentType(str, Enum):
    PASSPORT = "PASSPORT"
    DRIVING_LICENSE = "DRIVING_LICENSE"
    NATIONAL_ID = "NATIONAL_ID"
    PAN_CARD = "PAN_CARD"
    UTILITY_BILL = "UTILITY_BILL"
    UNKNOWN = "UNKNOWN"


class IssueSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


class ReviewDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_INFO = "REQUEST_INFO"


# Customer Schemas
class CustomerBase(BaseModel):
    customer_id_number: str = Field(..., description="Unique government or business Customer ID")
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


# KYC Case Schemas
class KYCCaseCreate(BaseModel):
    customer_id_number: str
    customer_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None


class DocumentInfo(BaseModel):
    id: str
    case_id: str
    file_name: str
    file_type: str
    storage_path: str
    file_size: int
    document_type_detected: str = "UNKNOWN"
    status: str = "PENDING"
    created_at: datetime
    signed_url: Optional[str] = None


class ExtractedDataInfo(BaseModel):
    id: str
    document_id: str
    raw_text: Optional[str] = None
    fields: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    ai_model: Optional[str] = None
    extracted_at: datetime


class IssueInfo(BaseModel):
    id: str
    case_id: str
    document_id: Optional[str] = None
    rule_code: str
    severity: IssueSeverity
    title: str
    description: str
    created_at: datetime


class VerificationResultInfo(BaseModel):
    id: str
    case_id: str
    overall_status: KYCStatus
    confidence_score: float
    checks_run: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[str] = None
    created_at: datetime


class ReviewInfo(BaseModel):
    id: str
    case_id: str
    reviewer_id: str
    reviewer_name: Optional[str] = None
    decision: ReviewDecision
    notes: Optional[str] = None
    created_at: datetime


class AuditLogInfo(BaseModel):
    id: str
    case_id: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class KYCCaseListItem(BaseModel):
    id: str
    case_number: str
    customer_id: str
    customer_name: str
    customer_id_number: str
    status: KYCStatus
    risk_score: float
    documents_count: int = 0
    issues_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None


class KYCCaseDetail(BaseModel):
    id: str
    case_number: str
    customer: CustomerResponse
    status: KYCStatus
    risk_score: float
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    documents: List[DocumentInfo] = Field(default_factory=list)
    extracted_data: List[ExtractedDataInfo] = Field(default_factory=list)
    verification_result: Optional[VerificationResultInfo] = None
    issues: List[IssueInfo] = Field(default_factory=list)
    reviews: List[ReviewInfo] = Field(default_factory=list)
    audit_logs: List[AuditLogInfo] = Field(default_factory=list)
