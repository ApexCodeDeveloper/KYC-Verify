from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .case import DocumentType, IssueSeverity, KYCStatus


class ExtractedFields(BaseModel):
    full_name: Optional[str] = None
    document_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    expiry_date: Optional[str] = None
    issue_date: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None


class AIStructuredExtraction(BaseModel):
    document_type: DocumentType = DocumentType.UNKNOWN
    fields: ExtractedFields = Field(default_factory=ExtractedFields)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    raw_summary: Optional[str] = None
    detected_anomalies: List[str] = Field(default_factory=list)


class ValidationCheck(BaseModel):
    check_name: str
    passed: bool
    details: str
    severity: IssueSeverity = IssueSeverity.INFO


class RuleIssue(BaseModel):
    rule_code: str
    severity: IssueSeverity
    title: str
    description: str
    document_id: Optional[str] = None


class ValidationResult(BaseModel):
    overall_status: KYCStatus
    confidence_score: float
    risk_score: float
    checks_run: List[ValidationCheck] = Field(default_factory=list)
    detected_issues: List[RuleIssue] = Field(default_factory=list)
    summary: str
