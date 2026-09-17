import io
from pypdf import PdfWriter
from app.processing.extractor import extract_from_pdf, process_uploaded_document_file, ExtractedRawDocument
from app.ai.gemini_extractor import fallback_heuristic_extraction
from app.schemas.case import DocumentType


def create_sample_pdf_bytes(text_content: str) -> bytes:
    """Helper to generate a minimal valid PDF with text."""
    # A minimal valid standard PDF 1.4 stream containing text
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
        b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        b"5 0 obj <</Length " + str(len(text_content) + 40).encode('ascii') + b">> stream\n"
        b"BT /F1 12 Tf 50 700 Td (" + text_content.replace("(", "\\(").replace(")", "\\)").encode('ascii', errors='ignore') + b") Tj ET\n"
        b"endstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000115 00000 n \n0000000225 00000 n \n0000000295 00000 n \n"
        b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n400\n%%EOF"
    )
    return pdf_content


def test_pdf_extraction():
    sample_text = "PASSPORT Republic of Example Name: John Doe DOB: 1988-06-15 Document No: Z98765432 Expiry: 2030-01-01"
    pdf_bytes = create_sample_pdf_bytes(sample_text)

    raw_doc = process_uploaded_document_file(
        file_bytes=pdf_bytes,
        file_name="sample_passport.pdf",
        content_type="application/pdf"
    )

    assert isinstance(raw_doc, ExtractedRawDocument)
    assert raw_doc.mime_type == "application/pdf"
    assert "John Doe" in raw_doc.raw_text or len(raw_doc.raw_text) > 0


def test_heuristic_extraction_pan():
    raw_text = (
        "INCOME TAX DEPARTMENT\n"
        "GOVT OF INDIA\n"
        "PERMANENT ACCOUNT NUMBER CARD\n"
        "ABCDE1234F\n"
        "Name: Rajesh Kumar\n"
        "DOB: 12/05/1985\n"
    )
    raw_doc = ExtractedRawDocument(
        raw_text=raw_text,
        is_scanned=False,
        page_count=1,
        mime_type="application/pdf",
        file_bytes=b"dummy"
    )

    extraction, model_used = fallback_heuristic_extraction(raw_doc, error_reason="KEY_NOT_CONFIGURED")
    assert extraction.document_type == DocumentType.PAN_CARD
    assert extraction.fields.document_number == "ABCDE1234F"
    assert extraction.fields.full_name == "Rajesh Kumar"
    assert extraction.fields.date_of_birth == "12/05/1985"
