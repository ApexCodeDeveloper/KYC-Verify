import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.database.supabase_client import supabase_service
from app.processing.extractor import process_uploaded_document_file
from app.ai.gemini_extractor import extract_with_gemini
from app.services.validation_engine import validation_engine
from app.schemas.case import (
    CustomerResponse,
    DocumentInfo,
    ExtractedDataInfo,
    IssueInfo,
    KYCCaseCreate,
    KYCCaseDetail,
    KYCCaseListItem,
    KYCStatus,
    ReviewDecision,
    ReviewInfo,
    VerificationResultInfo,
    AuditLogInfo,
)
from app.schemas.document import DocumentUploadResponse
from app.schemas.stats import DashboardStats

logger = logging.getLogger("kyc.service")


class KYCService:
    def __init__(self):
        self.supabase = supabase_service

    # =========================================================================
    # Case & Customer Management
    # =========================================================================
    def create_case(self, data: KYCCaseCreate, user_id: Optional[str] = None) -> KYCCaseDetail:
        client = self.supabase.client

        # 1. Check or create customer
        cust_query = client.table("customers").select("*").eq("customer_id_number", data.customer_id_number).execute()
        if cust_query.data:
            customer = cust_query.data[0]
        else:
            cust_payload = {
                "customer_id_number": data.customer_id_number,
                "full_name": data.customer_name,
                "email": data.email,
                "phone": data.phone,
                "date_of_birth": data.date_of_birth,
                "created_by": user_id
            }
            res = client.table("customers").insert(cust_payload).execute()
            customer = res.data[0]

        # 2. Generate unique case number: KYC-YYYYMMDD-XXXX
        case_num = f"KYC-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        case_payload = {
            "case_number": case_num,
            "customer_id": customer["id"],
            "created_by": user_id,
            "status": "PROCESSING",
            "risk_score": 0.0,
            "notes": data.notes
        }
        case_res = client.table("kyc_cases").insert(case_payload).execute()
        new_case = case_res.data[0]

        # 3. Log audit event
        self.supabase.log_audit(
            action="CASE_CREATED",
            case_id=new_case["id"],
            user_id=user_id,
            metadata={"case_number": case_num, "customer_name": data.customer_name}
        )

        return self.get_case_detail(new_case["id"])

    def list_cases(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[KYCCaseListItem]:
        client = self.supabase.client
        query = client.table("kyc_cases").select("*, customers(*), documents(id), issues(id)")

        if status and status.upper() != "ALL":
            query = query.eq("status", status.upper())

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        res = query.execute()

        items: List[KYCCaseListItem] = []
        for row in res.data:
            cust = row.get("customers") or {}
            cust_name = cust.get("full_name", "Unknown")
            cust_id_num = cust.get("customer_id_number", "")
            case_num = row.get("case_number", "")

            # Filter search query across customer name, customer id, and case number
            if search:
                s_lower = search.lower()
                if (s_lower not in cust_name.lower() and
                    s_lower not in cust_id_num.lower() and
                    s_lower not in case_num.lower()):
                    continue

            docs_count = len(row.get("documents") or [])
            issues_count = len(row.get("issues") or [])

            items.append(
                KYCCaseListItem(
                    id=row["id"],
                    case_number=case_num,
                    customer_id=row["customer_id"],
                    customer_name=cust_name,
                    customer_id_number=cust_id_num,
                    status=KYCStatus(row["status"]),
                    risk_score=float(row.get("risk_score") or 0.0),
                    documents_count=docs_count,
                    issues_count=issues_count,
                    created_at=row["created_at"],
                    updated_at=row.get("updated_at")
                )
            )
        return items

    def get_case_detail(self, case_id: str) -> KYCCaseDetail:
        client = self.supabase.client

        # Fetch case
        case_res = client.table("kyc_cases").select("*, customers(*)").eq("id", case_id).execute()
        if not case_res.data:
            raise ValueError(f"Case with ID '{case_id}' not found.")
        case_data = case_res.data[0]
        cust_data = case_data.get("customers") or {}

        customer = CustomerResponse(
            id=cust_data.get("id", ""),
            customer_id_number=cust_data.get("customer_id_number", ""),
            full_name=cust_data.get("full_name", ""),
            email=cust_data.get("email"),
            phone=cust_data.get("phone"),
            date_of_birth=cust_data.get("date_of_birth"),
            created_at=cust_data.get("created_at") or case_data["created_at"]
        )

        # Fetch documents
        docs_res = client.table("documents").select("*").eq("case_id", case_id).order("created_at").execute()
        docs: List[DocumentInfo] = []
        for d in docs_res.data:
            # Generate secure signed preview URL
            signed = self.supabase.create_signed_url("kyc-documents", d["storage_path"], 3600)
            docs.append(
                DocumentInfo(
                    id=d["id"],
                    case_id=d["case_id"],
                    file_name=d["file_name"],
                    file_type=d["file_type"],
                    storage_path=d["storage_path"],
                    file_size=d["file_size"],
                    document_type_detected=d.get("document_type_detected") or "UNKNOWN",
                    status=d.get("status") or "PENDING",
                    created_at=d["created_at"],
                    signed_url=signed
                )
            )

        # Fetch extracted data
        doc_ids = [d.id for d in docs]
        extracted_list: List[ExtractedDataInfo] = []
        if doc_ids:
            ext_res = client.table("extracted_data").select("*").in_("document_id", doc_ids).execute()
            for ext in ext_res.data:
                extracted_list.append(
                    ExtractedDataInfo(
                        id=ext["id"],
                        document_id=ext["document_id"],
                        raw_text=ext.get("raw_text"),
                        fields=ext.get("fields") or {},
                        confidence=float(ext.get("confidence") or 0.0),
                        ai_model=ext.get("ai_model"),
                        extracted_at=ext["extracted_at"]
                    )
                )

        # Fetch verification result
        vr_res = client.table("verification_results").select("*").eq("case_id", case_id).execute()
        vr: Optional[VerificationResultInfo] = None
        if vr_res.data:
            vr_row = vr_res.data[0]
            vr = VerificationResultInfo(
                id=vr_row["id"],
                case_id=vr_row["case_id"],
                overall_status=KYCStatus(vr_row["overall_status"]),
                confidence_score=float(vr_row.get("confidence_score") or 0.0),
                checks_run=vr_row.get("checks_run") or [],
                summary=vr_row.get("summary"),
                created_at=vr_row["created_at"]
            )

        # Fetch issues
        issues_res = client.table("issues").select("*").eq("case_id", case_id).order("created_at").execute()
        issues = [
            IssueInfo(
                id=iss["id"],
                case_id=iss["case_id"],
                document_id=iss.get("document_id"),
                rule_code=iss["rule_code"],
                severity=iss["severity"],
                title=iss["title"],
                description=iss["description"],
                created_at=iss["created_at"]
            )
            for iss in issues_res.data
        ]

        # Fetch reviews
        reviews_res = client.table("reviews").select("*, profiles(full_name, email)").eq("case_id", case_id).order("created_at", desc=True).execute()
        reviews = []
        for r in reviews_res.data:
            prof = r.get("profiles") or {}
            rev_name = prof.get("full_name") or prof.get("email") or "Reviewer"
            reviews.append(
                ReviewInfo(
                    id=r["id"],
                    case_id=r["case_id"],
                    reviewer_id=r["reviewer_id"],
                    reviewer_name=rev_name,
                    decision=r["decision"],
                    notes=r.get("notes"),
                    created_at=r["created_at"]
                )
            )

        # Fetch audit logs
        logs_res = client.table("audit_logs").select("*, profiles(email)").eq("case_id", case_id).order("created_at", desc=True).limit(50).execute()
        audit_logs = []
        for l in logs_res.data:
            prof = l.get("profiles") or {}
            audit_logs.append(
                AuditLogInfo(
                    id=l["id"],
                    case_id=l.get("case_id"),
                    user_id=l.get("user_id"),
                    user_email=prof.get("email"),
                    action=l["action"],
                    metadata=l.get("metadata") or {},
                    created_at=l["created_at"]
                )
            )

        return KYCCaseDetail(
            id=case_data["id"],
            case_number=case_data["case_number"],
            customer=customer,
            status=KYCStatus(case_data["status"]),
            risk_score=float(case_data.get("risk_score") or 0.0),
            notes=case_data.get("notes"),
            created_at=case_data["created_at"],
            updated_at=case_data.get("updated_at"),
            documents=docs,
            extracted_data=extracted_list,
            verification_result=vr,
            issues=issues,
            reviews=reviews,
            audit_logs=audit_logs
        )

    # =========================================================================
    # Document Upload & Storage
    # =========================================================================
    def upload_document(
        self,
        case_id: str,
        file_bytes: bytes,
        file_name: str,
        content_type: str,
        user_id: Optional[str] = None
    ) -> DocumentUploadResponse:
        client = self.supabase.client
        doc_id = str(uuid.uuid4())
        clean_name = file_name.replace(" ", "_").replace("/", "_")
        storage_path = f"{case_id}/{doc_id}_{clean_name}"

        # 1. Upload to Supabase Storage private bucket 'kyc-documents'
        self.supabase.upload_document_to_storage(
            bucket="kyc-documents",
            destination_path=storage_path,
            file_bytes=file_bytes,
            content_type=content_type
        )

        # 2. Insert record in documents table
        doc_record = {
            "id": doc_id,
            "case_id": case_id,
            "file_name": file_name,
            "file_type": content_type,
            "storage_path": storage_path,
            "file_size": len(file_bytes),
            "document_type_detected": "UNKNOWN",
            "status": "PENDING"
        }
        res = client.table("documents").insert(doc_record).execute()
        new_doc = res.data[0]

        # 3. Audit log
        self.supabase.log_audit(
            action="DOCUMENT_UPLOADED",
            case_id=case_id,
            user_id=user_id,
            metadata={"document_id": doc_id, "file_name": file_name, "size": len(file_bytes)}
        )

        signed_url = self.supabase.create_signed_url("kyc-documents", storage_path, 3600)
        return DocumentUploadResponse(
            id=new_doc["id"],
            case_id=new_doc["case_id"],
            file_name=new_doc["file_name"],
            file_type=new_doc["file_type"],
            storage_path=new_doc["storage_path"],
            file_size=new_doc["file_size"],
            document_type_detected=new_doc["document_type_detected"],
            status=new_doc["status"],
            created_at=new_doc["created_at"],
            signed_url=signed_url
        )

    # =========================================================================
    # Document Processing & Verification Pipeline
    # =========================================================================
    def process_case(self, case_id: str, user_id: Optional[str] = None) -> KYCCaseDetail:
        client = self.supabase.client

        # Update case status to PROCESSING
        client.table("kyc_cases").update({"status": "PROCESSING"}).eq("id", case_id).execute()
        self.supabase.log_audit(
            action="PROCESSING_STARTED",
            case_id=case_id,
            user_id=user_id
        )

        # Fetch case and customer
        case_res = client.table("kyc_cases").select("*, customers(*)").eq("id", case_id).execute()
        if not case_res.data:
            raise ValueError(f"Case '{case_id}' not found.")
        case_row = case_res.data[0]
        customer = case_row.get("customers") or {}

        # Fetch all documents for this case
        docs_res = client.table("documents").select("*").eq("case_id", case_id).execute()
        docs = docs_res.data

        extracted_docs_for_validation = []

        for doc in docs:
            # Download file bytes from storage
            try:
                file_bytes = self.supabase.download_document_from_storage(
                    "kyc-documents", doc["storage_path"]
                )
            except Exception as e:
                logger.error(f"Failed to download doc {doc['id']}: {e}")
                client.table("documents").update({"status": "FAILED"}).eq("id", doc["id"]).execute()
                continue

            # 1. Parse text & OCR
            raw_doc = process_uploaded_document_file(
                file_bytes=file_bytes,
                file_name=doc["file_name"],
                content_type=doc["file_type"]
            )

            # 2. AI Structured Extraction
            extraction, model_used = extract_with_gemini(raw_doc, doc["file_name"])

            # 3. Update documents table with detected type
            client.table("documents").update({
                "document_type_detected": extraction.document_type.value,
                "status": "EXTRACTED"
            }).eq("id", doc["id"]).execute()

            # 4. Upsert extracted_data table
            # Check if extracted_data row already exists for this document
            existing_ext = client.table("extracted_data").select("id").eq("document_id", doc["id"]).execute()
            ext_payload = {
                "document_id": doc["id"],
                "raw_text": raw_doc.raw_text[:8000] if raw_doc.raw_text else None,
                "fields": extraction.fields.model_dump(),
                "confidence": extraction.confidence,
                "ai_model": model_used
            }
            if existing_ext.data:
                client.table("extracted_data").update(ext_payload).eq("id", existing_ext.data[0]["id"]).execute()
            else:
                client.table("extracted_data").insert(ext_payload).execute()

            extracted_docs_for_validation.append({
                "document_id": doc["id"],
                "file_name": doc["file_name"],
                "document_type": extraction.document_type.value,
                "fields": extraction.fields.model_dump(),
                "confidence": extraction.confidence
            })

        # 5. Run Validation Engine across customer and all extracted documents
        validation_res = validation_engine.validate_case(customer, extracted_docs_for_validation)

        # 6. Store detected issues
        # Clear previous issues for this case
        client.table("issues").delete().eq("case_id", case_id).execute()
        for issue in validation_res.detected_issues:
            issue_payload = {
                "case_id": case_id,
                "document_id": issue.document_id,
                "rule_code": issue.rule_code,
                "severity": issue.severity.value,
                "title": issue.title,
                "description": issue.description
            }
            client.table("issues").insert(issue_payload).execute()

            self.supabase.log_audit(
                action="ISSUE_DETECTED",
                case_id=case_id,
                user_id=user_id,
                metadata={"rule_code": issue.rule_code, "severity": issue.severity.value, "title": issue.title}
            )

        # 7. Upsert verification_results
        vr_payload = {
            "case_id": case_id,
            "overall_status": validation_res.overall_status.value,
            "confidence_score": validation_res.confidence_score,
            "checks_run": [c.model_dump() for c in validation_res.checks_run],
            "summary": validation_res.summary
        }
        existing_vr = client.table("verification_results").select("id").eq("case_id", case_id).execute()
        if existing_vr.data:
            client.table("verification_results").update(vr_payload).eq("case_id", case_id).execute()
        else:
            client.table("verification_results").insert(vr_payload).execute()

        # 8. Update case status & risk score
        client.table("kyc_cases").update({
            "status": validation_res.overall_status.value,
            "risk_score": validation_res.risk_score
        }).eq("id", case_id).execute()

        # 9. Log completion
        self.supabase.log_audit(
            action="PROCESSING_COMPLETED",
            case_id=case_id,
            user_id=user_id,
            metadata={
                "status": validation_res.overall_status.value,
                "risk_score": validation_res.risk_score,
                "confidence": validation_res.confidence_score,
                "issues_count": len(validation_res.detected_issues)
            }
        )

        return self.get_case_detail(case_id)

    # =========================================================================
    # Human Review Workflow
    # =========================================================================
    def submit_review(
        self,
        case_id: str,
        reviewer_id: str,
        decision: ReviewDecision,
        notes: Optional[str] = None
    ) -> KYCCaseDetail:
        client = self.supabase.client

        # 1. Insert review record
        review_payload = {
            "case_id": case_id,
            "reviewer_id": reviewer_id,
            "decision": decision.value,
            "notes": notes
        }
        client.table("reviews").insert(review_payload).execute()

        # 2. Update case status based on reviewer decision
        new_status = KYCStatus.NEEDS_REVIEW
        audit_action = "CASE_REVIEWED"
        if decision == ReviewDecision.APPROVE:
            new_status = KYCStatus.VERIFIED
            audit_action = "CASE_APPROVED"
        elif decision == ReviewDecision.REJECT:
            new_status = KYCStatus.REJECTED
            audit_action = "CASE_REJECTED"
        elif decision == ReviewDecision.REQUEST_INFO:
            new_status = KYCStatus.NEEDS_REVIEW
            audit_action = "INFO_REQUESTED"

        client.table("kyc_cases").update({
            "status": new_status.value,
            "assigned_reviewer_id": reviewer_id
        }).eq("id", case_id).execute()

        # 3. Log audit event
        self.supabase.log_audit(
            action=audit_action,
            case_id=case_id,
            user_id=reviewer_id,
            metadata={"decision": decision.value, "notes": notes}
        )

        return self.get_case_detail(case_id)

    # =========================================================================
    # Dashboard KPI Statistics
    # =========================================================================
    def get_dashboard_stats(self) -> DashboardStats:
        client = self.supabase.client

        # Fetch status counts
        res = client.table("kyc_cases").select("status").execute()
        rows = res.data or []

        counts = {
            "VERIFIED": 0,
            "PROCESSING": 0,
            "NEEDS_REVIEW": 0,
            "REJECTED": 0,
            "FAILED": 0
        }
        for r in rows:
            st = r.get("status", "")
            if st in counts:
                counts[st] += 1

        total = len(rows)

        # Fetch recent cases (last 6)
        recent_cases = self.list_cases(limit=6)

        # Fetch review queue (cases in NEEDS_REVIEW)
        review_queue = self.list_cases(status="NEEDS_REVIEW", limit=6)

        return DashboardStats(
            total_cases=total,
            verified_count=counts["VERIFIED"],
            processing_count=counts["PROCESSING"],
            needs_review_count=counts["NEEDS_REVIEW"],
            rejected_count=counts["REJECTED"],
            failed_count=counts["FAILED"],
            status_distribution=counts,
            recent_cases=recent_cases,
            review_queue=review_queue
        )


kyc_service = KYCService()
