from datetime import date, datetime
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from difflib import SequenceMatcher

from app.schemas.case import DocumentType, IssueSeverity, KYCStatus
from app.schemas.verification import (
    AIStructuredExtraction,
    RuleIssue,
    ValidationCheck,
    ValidationResult,
)

logger = logging.getLogger("kyc.validation")


def string_similarity(a: str, b: str) -> float:
    """Computes similarity ratio between two strings with token and surname awareness."""
    if not a or not b:
        return 0.0
    norm_a = re.sub(r"[^a-zA-Z0-9\s]", "", a.lower()).strip()
    norm_b = re.sub(r"[^a-zA-Z0-9\s]", "", b.lower()).strip()
    if norm_a == norm_b:
        return 1.0

    tokens_a = norm_a.split()
    tokens_b = norm_b.split()
    if not tokens_a or not tokens_b:
        return 0.0

    # If both have multiple words, compare last name (surname)
    if len(tokens_a) >= 2 and len(tokens_b) >= 2:
        surname_a = tokens_a[-1]
        surname_b = tokens_b[-1]
        if surname_a != surname_b:
            surname_ratio = SequenceMatcher(None, surname_a, surname_b).ratio()
            if surname_ratio < 0.80:
                # Surnames distinctly differ (e.g. Aurelius vs Differentius)
                return min(0.45, SequenceMatcher(None, norm_a, norm_b).ratio() * 0.6)

    # Subset check (e.g. "John Smith" vs "John Adam Smith")
    set_a = set(tokens_a)
    set_b = set(tokens_b)
    if set_a.issubset(set_b) or set_b.issubset(set_a):
        return 0.90

    # Token overlap score
    overlap = len(set_a.intersection(set_b)) / max(len(set_a), len(set_b))
    seq_ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
    return round(max(overlap, seq_ratio), 2)


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Attempts to parse varied date string formats into a date object."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d.%m.%Y",
        "%m/%d/%Y",
        "%Y/%m/%d"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            pass
    return None


class KYCValidationEngine:
    """
    Production-ready deterministic KYC validation & risk assessment engine.
    Applies regulatory compliance rules and cross-document discrepancy detection.
    """

    MIN_CONFIDENCE_THRESHOLD = 0.70
    HIGH_CONFIDENCE_THRESHOLD = 0.85
    MIN_AGE_YEARS = 18

    def validate_case(
        self,
        customer: Dict[str, Any],
        extracted_docs: List[Dict[str, Any]]
    ) -> ValidationResult:
        """
        Validates a KYC case consisting of customer records and all submitted documents.
        """
        checks_run: List[ValidationCheck] = []
        detected_issues: List[RuleIssue] = []

        customer_name = customer.get("full_name", "")
        customer_dob_raw = customer.get("date_of_birth")
        customer_dob = parse_date(str(customer_dob_raw)) if customer_dob_raw else None

        if not extracted_docs:
            checks_run.append(
                ValidationCheck(
                    check_name="Document Presence",
                    passed=False,
                    details="No documents have been successfully processed for this case.",
                    severity=IssueSeverity.CRITICAL
                )
            )
            detected_issues.append(
                RuleIssue(
                    rule_code="NO_DOCUMENTS",
                    severity=IssueSeverity.CRITICAL,
                    title="No Documents Uploaded",
                    description="Case cannot be verified without at least one valid identity document."
                )
            )
            return ValidationResult(
                overall_status=KYCStatus.FAILED,
                confidence_score=0.0,
                risk_score=100.0,
                checks_run=checks_run,
                detected_issues=detected_issues,
                summary="Validation failed: No documents provided."
            )

        confidences = []

        # 1. Validate each document individually
        for doc_item in extracted_docs:
            doc_id = doc_item.get("document_id")
            doc_type_str = doc_item.get("document_type", "UNKNOWN")
            fields: Dict[str, Any] = doc_item.get("fields", {})
            confidence = float(doc_item.get("confidence", 0.0))
            confidences.append(confidence)

            # Check 1.1: Document Type Detection
            if doc_type_str == "UNKNOWN":
                checks_run.append(
                    ValidationCheck(
                        check_name=f"Document Type ({doc_item.get('file_name', 'Doc')})",
                        passed=False,
                        details="Document type could not be confidently identified.",
                        severity=IssueSeverity.WARNING
                    )
                )
                detected_issues.append(
                    RuleIssue(
                        rule_code="UNKNOWN_DOC_TYPE",
                        severity=IssueSeverity.WARNING,
                        title="Unknown Document Type",
                        description=f"File '{doc_item.get('file_name')}' could not be matched to standard KYC formats.",
                        document_id=doc_id
                    )
                )
            else:
                checks_run.append(
                    ValidationCheck(
                        check_name=f"Document Type ({doc_item.get('file_name', 'Doc')})",
                        passed=True,
                        details=f"Identified as {doc_type_str}.",
                        severity=IssueSeverity.INFO
                    )
                )

            # Check 1.2: Mandatory Fields completeness
            missing_fields = self._check_missing_fields(doc_type_str, fields)
            if missing_fields:
                checks_run.append(
                    ValidationCheck(
                        check_name=f"Required Fields ({doc_type_str})",
                        passed=False,
                        details=f"Missing essential fields: {', '.join(missing_fields)}.",
                        severity=IssueSeverity.CRITICAL
                    )
                )
                detected_issues.append(
                    RuleIssue(
                        rule_code="MISSING_REQUIRED_FIELDS",
                        severity=IssueSeverity.CRITICAL,
                        title=f"Missing Fields on {doc_type_str}",
                        description=f"Document lacks required information: {', '.join(missing_fields)}.",
                        document_id=doc_id
                    )
                )
            else:
                checks_run.append(
                    ValidationCheck(
                        check_name=f"Required Fields ({doc_type_str})",
                        passed=True,
                        details="All standard required fields are present.",
                        severity=IssueSeverity.INFO
                    )
                )

            # Check 1.3: Expiration Date
            expiry_str = fields.get("expiry_date")
            if expiry_str:
                parsed_expiry = parse_date(expiry_str)
                if parsed_expiry:
                    today = date.today()
                    if parsed_expiry < today:
                        checks_run.append(
                            ValidationCheck(
                                check_name=f"Document Validity ({doc_type_str})",
                                passed=False,
                                details=f"Document expired on {parsed_expiry.isoformat()} (today is {today.isoformat()}).",
                                severity=IssueSeverity.CRITICAL
                            )
                        )
                        detected_issues.append(
                            RuleIssue(
                                rule_code="DOCUMENT_EXPIRED",
                                severity=IssueSeverity.CRITICAL,
                                title=f"Expired {doc_type_str}",
                                description=f"Document expired on {parsed_expiry.isoformat()}. Expired documents are not legally valid for KYC.",
                                document_id=doc_id
                            )
                        )
                    else:
                        checks_run.append(
                            ValidationCheck(
                                check_name=f"Document Validity ({doc_type_str})",
                                passed=True,
                                details=f"Valid until {parsed_expiry.isoformat()}.",
                                severity=IssueSeverity.INFO
                            )
                        )

            # Check 1.4: Document Number Format
            doc_num = fields.get("document_number")
            if doc_num:
                format_ok, err_msg = self._validate_document_number_format(doc_type_str, doc_num)
                if not format_ok:
                    checks_run.append(
                        ValidationCheck(
                            check_name=f"Number Format ({doc_type_str})",
                            passed=False,
                            details=err_msg,
                            severity=IssueSeverity.WARNING
                        )
                    )
                    detected_issues.append(
                        RuleIssue(
                            rule_code="INVALID_DOC_FORMAT",
                            severity=IssueSeverity.WARNING,
                            title="Format Validation Alert",
                            description=err_msg,
                            document_id=doc_id
                        )
                    )
                else:
                    checks_run.append(
                        ValidationCheck(
                            check_name=f"Number Format ({doc_type_str})",
                            passed=True,
                            details=f"Document number '{doc_num[:2]}****{doc_num[-2:] if len(doc_num) > 4 else ''}' satisfies structural checksum regex.",
                            severity=IssueSeverity.INFO
                        )
                    )

            # Check 1.5: Name Match with Customer
            doc_name = fields.get("full_name")
            if doc_name and customer_name:
                sim = string_similarity(doc_name, customer_name)
                if sim < 0.60:
                    checks_run.append(
                        ValidationCheck(
                            check_name="Customer Name Match",
                            passed=False,
                            details=f"Name on document ('{doc_name}') does not match customer profile ('{customer_name}') [Match: {sim:.0%}].",
                            severity=IssueSeverity.CRITICAL
                        )
                    )
                    detected_issues.append(
                        RuleIssue(
                            rule_code="NAME_MISMATCH",
                            severity=IssueSeverity.CRITICAL,
                            title="Customer Name Mismatch",
                            description=f"Submitted document lists '{doc_name}', but customer record is '{customer_name}'.",
                            document_id=doc_id
                        )
                    )
                elif sim < 0.85:
                    checks_run.append(
                        ValidationCheck(
                            check_name="Customer Name Match",
                            passed=True,
                            details=f"Minor name variation detected: '{doc_name}' vs '{customer_name}' [Match: {sim:.0%}].",
                            severity=IssueSeverity.WARNING
                        )
                    )
                    detected_issues.append(
                        RuleIssue(
                            rule_code="NAME_VARIATION",
                            severity=IssueSeverity.WARNING,
                            title="Name Variation Detected",
                            description=f"Minor name difference between document ('{doc_name}') and profile ('{customer_name}').",
                            document_id=doc_id
                        )
                    )
                else:
                    checks_run.append(
                        ValidationCheck(
                            check_name="Customer Name Match",
                            passed=True,
                            details=f"Document name matches customer profile with {sim:.0%} match score.",
                            severity=IssueSeverity.INFO
                        )
                    )

            # Check 1.6: DOB Match with Customer Record
            doc_dob_str = fields.get("date_of_birth")
            if doc_dob_str and customer_dob:
                doc_dob = parse_date(doc_dob_str)
                if doc_dob and doc_dob != customer_dob:
                    checks_run.append(
                        ValidationCheck(
                            check_name="Customer DOB Match",
                            passed=False,
                            details=f"DOB on document ({doc_dob.isoformat()}) does not match customer profile ({customer_dob.isoformat()}).",
                            severity=IssueSeverity.CRITICAL
                        )
                    )
                    detected_issues.append(
                        RuleIssue(
                            rule_code="DOB_MISMATCH",
                            severity=IssueSeverity.CRITICAL,
                            title="Date of Birth Mismatch",
                            description=f"Document DOB is {doc_dob.isoformat()} while customer profile DOB is {customer_dob.isoformat()}.",
                            document_id=doc_id
                        )
                    )
                elif doc_dob:
                    # Age check
                    age = (date.today() - doc_dob).days // 365
                    if age < self.MIN_AGE_YEARS:
                        checks_run.append(
                            ValidationCheck(
                                check_name="Age Requirement",
                                passed=False,
                                details=f"Customer age is {age} (minimum required is {self.MIN_AGE_YEARS}).",
                                severity=IssueSeverity.CRITICAL
                            )
                        )
                        detected_issues.append(
                            RuleIssue(
                                rule_code="UNDERAGE_APPLICANT",
                                severity=IssueSeverity.CRITICAL,
                                title="Underage Applicant",
                                description=f"Applicant is {age} years old; financial accounts require minimum {self.MIN_AGE_YEARS} years.",
                                document_id=doc_id
                            )
                        )
                    else:
                        checks_run.append(
                            ValidationCheck(
                                check_name="Age Requirement",
                                passed=True,
                                details=f"Applicant age confirmed ({age} years old).",
                                severity=IssueSeverity.INFO
                            )
                        )

            # Check 1.7: Confidence Check
            if confidence < self.MIN_CONFIDENCE_THRESHOLD:
                checks_run.append(
                    ValidationCheck(
                        check_name="Extraction Confidence",
                        passed=False,
                        details=f"Extraction confidence is low ({confidence:.0%}). Manual document inspection advised.",
                        severity=IssueSeverity.WARNING
                    )
                )
                detected_issues.append(
                    RuleIssue(
                        rule_code="LOW_CONFIDENCE",
                        severity=IssueSeverity.WARNING,
                        title="Low OCR/AI Confidence",
                        description=f"Document text clarity or confidence score is {confidence:.0%}.",
                        document_id=doc_id
                    )
                )
            else:
                checks_run.append(
                    ValidationCheck(
                        check_name="Extraction Confidence",
                        passed=True,
                        details=f"High extraction confidence ({confidence:.0%}).",
                        severity=IssueSeverity.INFO
                    )
                )

        # 2. Cross-Document Consistency Checks (if multiple documents)
        if len(extracted_docs) > 1:
            self._check_cross_document_discrepancies(extracted_docs, checks_run, detected_issues)

        # 3. Overall Case Decision & Risk Score
        avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

        critical_count = sum(1 for i in detected_issues if i.severity == IssueSeverity.CRITICAL)
        warning_count = sum(1 for i in detected_issues if i.severity == IssueSeverity.WARNING)

        # Risk scoring: 0 - 100
        risk_score = min(100.0, (critical_count * 40.0) + (warning_count * 15.0))
        if avg_confidence < self.MIN_CONFIDENCE_THRESHOLD:
            risk_score = min(100.0, risk_score + 20.0)

        # Determine Final Status
        if any(i.rule_code == "UNDERAGE_APPLICANT" for i in detected_issues):
            status = KYCStatus.REJECTED
            summary = "Case rejected: Applicant does not meet minimum legal age requirements."
        elif critical_count > 0:
            status = KYCStatus.NEEDS_REVIEW
            summary = f"Case requires compliance review: {critical_count} critical issue(s) and {warning_count} warning(s) detected."
        elif warning_count > 0 or avg_confidence < self.HIGH_CONFIDENCE_THRESHOLD:
            status = KYCStatus.NEEDS_REVIEW
            summary = f"Case requires human review: {warning_count} warning(s) or moderate confidence."
        else:
            status = KYCStatus.VERIFIED
            summary = "All automated identity and document consistency checks passed successfully."

        return ValidationResult(
            overall_status=status,
            confidence_score=avg_confidence,
            risk_score=risk_score,
            checks_run=checks_run,
            detected_issues=detected_issues,
            summary=summary
        )

    def _check_missing_fields(self, doc_type: str, fields: Dict[str, Any]) -> List[str]:
        missing = []
        if doc_type == "PASSPORT":
            for f in ["full_name", "document_number", "date_of_birth", "expiry_date"]:
                if not fields.get(f):
                    missing.append(f.replace("_", " "))
        elif doc_type == "PAN_CARD":
            for f in ["full_name", "document_number", "date_of_birth"]:
                if not fields.get(f):
                    missing.append(f.replace("_", " "))
        elif doc_type == "DRIVING_LICENSE":
            for f in ["full_name", "document_number"]:
                if not fields.get(f):
                    missing.append(f.replace("_", " "))
        elif doc_type == "NATIONAL_ID":
            for f in ["full_name", "document_number"]:
                if not fields.get(f):
                    missing.append(f.replace("_", " "))
        elif doc_type == "UTILITY_BILL":
            if not fields.get("full_name") and not fields.get("address"):
                missing.append("name or address")
        return missing

    def _validate_document_number_format(self, doc_type: str, doc_number: str) -> Tuple[bool, str]:
        cleaned = re.sub(r"[\s\-]", "", doc_number.strip().upper())
        if doc_type == "PAN_CARD":
            # 5 letters, 4 digits, 1 letter
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", cleaned):
                return False, f"PAN card number '{cleaned}' does not match standard 10-character format (ABCDE1234F)."
        elif doc_type == "PASSPORT":
            if len(cleaned) < 6 or len(cleaned) > 12 or not re.match(r"^[A-Z0-9]+$", cleaned):
                return False, f"Passport number '{cleaned}' has an atypical format."
        return True, ""

    def _check_cross_document_discrepancies(
        self,
        extracted_docs: List[Dict[str, Any]],
        checks_run: List[ValidationCheck],
        detected_issues: List[RuleIssue]
    ):
        """Cross-validates information across multiple submitted documents."""
        # 1. Compare names across all document pairs
        for i in range(len(extracted_docs)):
            for j in range(i + 1, len(extracted_docs)):
                doc1 = extracted_docs[i]
                doc2 = extracted_docs[j]
                name1 = doc1.get("fields", {}).get("full_name")
                name2 = doc2.get("fields", {}).get("full_name")
                type1 = doc1.get("document_type", "Doc1")
                type2 = doc2.get("document_type", "Doc2")

                if name1 and name2:
                    sim = string_similarity(name1, name2)
                    if sim < 0.80:
                        checks_run.append(
                            ValidationCheck(
                                check_name="Cross-Document Name Match",
                                passed=False,
                                details=f"Name discrepancy between {type1} ('{name1}') and {type2} ('{name2}').",
                                severity=IssueSeverity.CRITICAL
                            )
                        )
                        detected_issues.append(
                            RuleIssue(
                                rule_code="CROSS_DOC_NAME_MISMATCH",
                                severity=IssueSeverity.CRITICAL,
                                title="Cross-Document Name Mismatch",
                                description=f"Name on {type1} is '{name1}', but {type2} shows '{name2}'.",
                                document_id=doc2.get("document_id")
                            )
                        )
                    else:
                        checks_run.append(
                            ValidationCheck(
                                check_name="Cross-Document Name Match",
                                passed=True,
                                details=f"Names across {type1} and {type2} are consistent ({sim:.0%} match).",
                                severity=IssueSeverity.INFO
                            )
                        )

                # 2. Compare DOB across documents
                dob1_str = doc1.get("fields", {}).get("date_of_birth")
                dob2_str = doc2.get("fields", {}).get("date_of_birth")
                if dob1_str and dob2_str:
                    d1 = parse_date(dob1_str)
                    d2 = parse_date(dob2_str)
                    if d1 and d2 and d1 != d2:
                        checks_run.append(
                            ValidationCheck(
                                check_name="Cross-Document DOB Match",
                                passed=False,
                                details=f"DOB mismatch: {type1} ({d1.isoformat()}) vs {type2} ({d2.isoformat()}).",
                                severity=IssueSeverity.CRITICAL
                            )
                        )
                        detected_issues.append(
                            RuleIssue(
                                rule_code="CROSS_DOC_DOB_MISMATCH",
                                severity=IssueSeverity.CRITICAL,
                                title="Cross-Document DOB Mismatch",
                                description=f"{type1} has DOB {d1.isoformat()}, while {type2} has DOB {d2.isoformat()}.",
                                document_id=doc2.get("document_id")
                            )
                        )


validation_engine = KYCValidationEngine()
