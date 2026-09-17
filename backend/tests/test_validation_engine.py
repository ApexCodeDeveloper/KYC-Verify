from datetime import date, timedelta
from app.services.validation_engine import validation_engine, string_similarity, parse_date
from app.schemas.case import KYCStatus, IssueSeverity


def test_string_similarity():
    assert string_similarity("Alice Walker", "Alice Walker") == 1.0
    assert string_similarity("Alice Walker", "Alice M. Walker") >= 0.85
    assert string_similarity("Bob Smith", "Charlie Davis") < 0.50


def test_parse_date():
    d1 = parse_date("2024-05-12")
    assert d1 == date(2024, 5, 12)
    d2 = parse_date("15/08/1995")
    assert d2 == date(1995, 8, 15)
    assert parse_date("invalid-date") is None


def test_valid_case_passes():
    future_expiry = (date.today() + timedelta(days=365)).isoformat()
    customer = {
        "full_name": "Marcus Aurelius",
        "date_of_birth": "1990-04-26"
    }
    extracted_docs = [
        {
            "document_id": "doc-1",
            "file_name": "passport.pdf",
            "document_type": "PASSPORT",
            "fields": {
                "full_name": "Marcus Aurelius",
                "document_number": "A12345678",
                "date_of_birth": "1990-04-26",
                "expiry_date": future_expiry
            },
            "confidence": 0.95
        }
    ]
    res = validation_engine.validate_case(customer, extracted_docs)
    assert res.overall_status == KYCStatus.VERIFIED
    assert len(res.detected_issues) == 0
    assert res.risk_score == 0.0


def test_expired_document_needs_review():
    past_expiry = (date.today() - timedelta(days=100)).isoformat()
    customer = {
        "full_name": "Marcus Aurelius",
        "date_of_birth": "1990-04-26"
    }
    extracted_docs = [
        {
            "document_id": "doc-1",
            "file_name": "passport.pdf",
            "document_type": "PASSPORT",
            "fields": {
                "full_name": "Marcus Aurelius",
                "document_number": "A12345678",
                "date_of_birth": "1990-04-26",
                "expiry_date": past_expiry
            },
            "confidence": 0.95
        }
    ]
    res = validation_engine.validate_case(customer, extracted_docs)
    assert res.overall_status == KYCStatus.NEEDS_REVIEW
    codes = [i.rule_code for i in res.detected_issues]
    assert "DOCUMENT_EXPIRED" in codes


def test_name_mismatch_detected():
    future_expiry = (date.today() + timedelta(days=365)).isoformat()
    customer = {
        "full_name": "Marcus Aurelius",
        "date_of_birth": "1990-04-26"
    }
    extracted_docs = [
        {
            "document_id": "doc-1",
            "file_name": "id_card.png",
            "document_type": "NATIONAL_ID",
            "fields": {
                "full_name": "Lucius Verus",
                "document_number": "N9876543",
                "date_of_birth": "1990-04-26",
                "expiry_date": future_expiry
            },
            "confidence": 0.92
        }
    ]
    res = validation_engine.validate_case(customer, extracted_docs)
    assert res.overall_status == KYCStatus.NEEDS_REVIEW
    codes = [i.rule_code for i in res.detected_issues]
    assert "NAME_MISMATCH" in codes


def test_cross_document_discrepancy():
    future_expiry = (date.today() + timedelta(days=365)).isoformat()
    customer = {
        "full_name": "Marcus Aurelius",
        "date_of_birth": "1990-04-26"
    }
    extracted_docs = [
        {
            "document_id": "doc-1",
            "file_name": "passport.pdf",
            "document_type": "PASSPORT",
            "fields": {
                "full_name": "Marcus Aurelius",
                "document_number": "A12345678",
                "date_of_birth": "1990-04-26",
                "expiry_date": future_expiry
            },
            "confidence": 0.95
        },
        {
            "document_id": "doc-2",
            "file_name": "pan.jpg",
            "document_type": "PAN_CARD",
            "fields": {
                "full_name": "Marcus Differentius",
                "document_number": "ABCDE1234F",
                "date_of_birth": "1990-04-26"
            },
            "confidence": 0.90
        }
    ]
    res = validation_engine.validate_case(customer, extracted_docs)
    assert res.overall_status == KYCStatus.NEEDS_REVIEW
    codes = [i.rule_code for i in res.detected_issues]
    assert "CROSS_DOC_NAME_MISMATCH" in codes


def test_underage_applicant_rejected():
    underage_dob = (date.today() - timedelta(days=365 * 16)).isoformat()
    future_expiry = (date.today() + timedelta(days=365)).isoformat()
    customer = {
        "full_name": "Young Prodigy",
        "date_of_birth": underage_dob
    }
    extracted_docs = [
        {
            "document_id": "doc-1",
            "file_name": "passport.pdf",
            "document_type": "PASSPORT",
            "fields": {
                "full_name": "Young Prodigy",
                "document_number": "P88888888",
                "date_of_birth": underage_dob,
                "expiry_date": future_expiry
            },
            "confidence": 0.95
        }
    ]
    res = validation_engine.validate_case(customer, extracted_docs)
    assert res.overall_status == KYCStatus.REJECTED
    codes = [i.rule_code for i in res.detected_issues]
    assert "UNDERAGE_APPLICANT" in codes
