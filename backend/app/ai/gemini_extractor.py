import json
import logging
import re
from typing import Optional, Tuple
from app.config import get_settings
from app.schemas.case import DocumentType
from app.schemas.verification import AIStructuredExtraction, ExtractedFields
from app.processing.extractor import ExtractedRawDocument

TupleModel = Tuple[AIStructuredExtraction, str]

logger = logging.getLogger("kyc.ai")

GEMINI_KYC_PROMPT = """
You are an expert KYC Document Verification and OCR analysis engine for financial compliance.
Analyze the provided document (image or PDF content and raw text).

Your objectives:
1. Detect Document Type: PASSPORT, DRIVING_LICENSE, NATIONAL_ID, PAN_CARD, UTILITY_BILL, or UNKNOWN.
2. Extract fields accurately:
   - full_name: The legal name of the person (capitalized appropriately)
   - document_number: The unique ID/number of the identity card or document
   - date_of_birth: Format YYYY-MM-DD (convert if in other formats like DD/MM/YYYY)
   - expiry_date: Format YYYY-MM-DD if available, or null
   - issue_date: Format YYYY-MM-DD if available, or null
   - address: Full residential address if present, or null
   - gender: Male, Female, or Other if stated, or null
   - nationality: Country/nationality if stated, or null
3. Confidence Score: A float between 0.00 and 1.00 reflecting visual legibility and clarity of the extracted data.
4. Detected Anomalies: List of suspicious traits if any (e.g., "Image appears blurred", "Mismatched fonts detected", "Potential document expiration", "Missing mandatory signature area").
5. Summary: Brief 1-2 sentence description of the document.

Do NOT invent or hallucinate fields that do not exist on the document. Return null for fields not present.
"""

EXTRACTION_JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "document_type": {
            "type": "STRING",
            "enum": ["PASSPORT", "DRIVING_LICENSE", "NATIONAL_ID", "PAN_CARD", "UTILITY_BILL", "UNKNOWN"]
        },
        "fields": {
            "type": "OBJECT",
            "properties": {
                "full_name": {"type": "STRING"},
                "document_number": {"type": "STRING"},
                "date_of_birth": {"type": "STRING"},
                "expiry_date": {"type": "STRING"},
                "issue_date": {"type": "STRING"},
                "address": {"type": "STRING"},
                "gender": {"type": "STRING"},
                "nationality": {"type": "STRING"}
            }
        },
        "confidence": {"type": "NUMBER"},
        "detected_anomalies": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "raw_summary": {"type": "STRING"}
    },
    "required": ["document_type", "fields", "confidence"]
}


def extract_with_gemini(
    raw_doc: ExtractedRawDocument,
    filename: str
) -> TupleModel:
    """
    Calls Google Gemini multimodal API via the modern `google-genai` SDK.
    Returns (AIStructuredExtraction, model_name_used).
    """
    settings = get_settings()
    api_key = settings.effective_ai_key

    if not api_key:
        logger.warning("GEMINI_API_KEY / AI_API_KEY is not configured in backend environment.")
        return fallback_heuristic_extraction(
            raw_doc,
            error_reason="AI_API_KEY_MISSING: Please configure GEMINI_API_KEY or AI_API_KEY in backend .env to enable multimodal LLM extraction."
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        contents = []

        # Add document bytes if supported format
        if raw_doc.file_bytes and len(raw_doc.file_bytes) > 0:
            mime = raw_doc.mime_type
            if mime in ["application/pdf", "image/jpeg", "image/png", "image/webp"]:
                contents.append(
                    types.Part.from_bytes(
                        data=raw_doc.file_bytes,
                        mime_type=mime
                    )
                )

        prompt_text = f"{GEMINI_KYC_PROMPT}\n\nDocument filename: {filename}\n"
        if raw_doc.raw_text:
            prompt_text += f"\nPre-extracted OCR text:\n---\n{raw_doc.raw_text[:4000]}\n---"

        contents.append(prompt_text)

        model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"
        logger.info(f"Invoking Gemini model '{model_name}' for KYC extraction of '{filename}'...")

        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=EXTRACTION_JSON_SCHEMA,
                temperature=0.1
            )
        )

        response_text = response.text or "{}"
        parsed = json.loads(response_text)

        doc_type_str = parsed.get("document_type", "UNKNOWN").upper()
        try:
            doc_type = DocumentType(doc_type_str)
        except ValueError:
            doc_type = DocumentType.UNKNOWN

        f_data = parsed.get("fields", {})
        fields = ExtractedFields(
            full_name=f_data.get("full_name"),
            document_number=f_data.get("document_number"),
            date_of_birth=f_data.get("date_of_birth"),
            expiry_date=f_data.get("expiry_date"),
            issue_date=f_data.get("issue_date"),
            address=f_data.get("address"),
            gender=f_data.get("gender"),
            nationality=f_data.get("nationality")
        )

        extraction = AIStructuredExtraction(
            document_type=doc_type,
            fields=fields,
            confidence=float(parsed.get("confidence", 0.85)),
            raw_summary=parsed.get("raw_summary"),
            detected_anomalies=parsed.get("detected_anomalies", [])
        )
        return extraction, model_name

    except Exception as e:
        logger.error(f"Gemini API extraction failed: {e}")
        return fallback_heuristic_extraction(
            raw_doc,
            error_reason=f"AI_API_ERROR: {str(e)}"
        )


def fallback_heuristic_extraction(
    raw_doc: ExtractedRawDocument,
    error_reason: str
) -> TupleModel:
    """
    Deterministic rule-based extractor on raw text.
    Maintains transparency: explicitly labels the model as heuristic and includes the error reason.
    """
    text = raw_doc.raw_text
    doc_type = DocumentType.UNKNOWN
    fields = ExtractedFields()
    anomalies = [error_reason]
    confidence = 0.2

    if text:
        upper_text = text.upper()

        # Document type heuristic
        if "PASSPORT" in upper_text or "REPUBLIC OF" in upper_text:
            doc_type = DocumentType.PASSPORT
        elif "INCOME TAX DEPARTMENT" in upper_text or "PERMANENT ACCOUNT NUMBER" in upper_text or "PAN" in upper_text:
            doc_type = DocumentType.PAN_CARD
        elif "DRIVING LICENCE" in upper_text or "DRIVING LICENSE" in upper_text:
            doc_type = DocumentType.DRIVING_LICENSE
        elif "ELECTION COMMISSION" in upper_text or "IDENTITY CARD" in upper_text or "AADHAAR" in upper_text:
            doc_type = DocumentType.NATIONAL_ID
        elif "ELECTRICITY" in upper_text or "WATER BILL" in upper_text or "UTILITY" in upper_text or "BILL" in upper_text:
            doc_type = DocumentType.UTILITY_BILL

        # PAN regex heuristic: 5 uppercase letters, 4 digits, 1 uppercase letter
        pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", text)
        if pan_match:
            fields.document_number = pan_match.group(0)
            if doc_type == DocumentType.UNKNOWN:
                doc_type = DocumentType.PAN_CARD
            confidence = max(confidence, 0.65)

        # Passport regex heuristic: 1 uppercase letter followed by 7-8 digits
        passport_match = re.search(r"\b[A-Z][0-9]{7,8}\b", text)
        if passport_match and not fields.document_number:
            fields.document_number = passport_match.group(0)
            if doc_type == DocumentType.UNKNOWN:
                doc_type = DocumentType.PASSPORT
            confidence = max(confidence, 0.65)

        # Date of Birth regex: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
        dob_match = re.search(
            r"(?:DOB|Birth|D\.O\.B)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3}|\d{4}-\d{2}-\d{2})",
            text,
            re.IGNORECASE
        )
        if dob_match:
            fields.date_of_birth = dob_match.group(1)
            confidence = max(confidence, 0.5)

        # Expiry Date regex
        exp_match = re.search(
            r"(?:Expiry|Expires|Valid Till|Valid Until)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3}|\d{4}-\d{2}-\d{2})",
            text,
            re.IGNORECASE
        )
        if exp_match:
            fields.expiry_date = exp_match.group(1)

        # Name heuristic: Name: <value> (single line)
        name_match = re.search(r"(?:Name|Full Name)[:\s]*([A-Za-z \.]{3,40})", text, re.IGNORECASE)
        if name_match:
            fields.full_name = name_match.group(1).strip()
            confidence = max(confidence, 0.55)

    extraction = AIStructuredExtraction(
        document_type=doc_type,
        fields=fields,
        confidence=round(confidence, 2),
        raw_summary="Parsed via heuristic text regex parser (AI service fallback)",
        detected_anomalies=anomalies
    )
    return extraction, "heuristic-rule-parser"
