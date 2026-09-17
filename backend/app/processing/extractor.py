import io
import logging
from typing import Optional, Tuple
from pypdf import PdfReader
from PIL import Image

logger = logging.getLogger("kyc.extractor")


class ExtractedRawDocument:
    def __init__(
        self,
        raw_text: str,
        is_scanned: bool,
        page_count: int,
        mime_type: str,
        file_bytes: bytes,
        ocr_performed: bool = False
    ):
        self.raw_text = raw_text.strip()
        self.is_scanned = is_scanned
        self.page_count = page_count
        self.mime_type = mime_type
        self.file_bytes = file_bytes
        self.ocr_performed = ocr_performed

    def __repr__(self):
        return f"<ExtractedRawDocument pages={self.page_count} scanned={self.is_scanned} text_len={len(self.raw_text)}>"


def extract_from_pdf(file_bytes: bytes) -> Tuple[str, bool, int, bool]:
    """
    Extracts text from PDF bytes.
    Returns (extracted_text, is_scanned, page_count, ocr_performed).
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        page_count = len(reader.pages)
        full_text = []

        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                full_text.append(t.strip())

        combined_text = "\n\n".join(full_text)
        # Check if text length is significant
        if len(combined_text.strip()) > 30:
            return combined_text, False, page_count, False

        # If text is too short or empty, it's likely a scanned PDF
        logger.info("PDF has low or no extractable digital text. Attempting image OCR fallback...")
        ocr_text = try_ocr_on_pdf_images(reader)
        if ocr_text:
            return ocr_text, True, page_count, True

        return combined_text, True, page_count, False
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        return "", True, 1, False


def try_ocr_on_pdf_images(reader: PdfReader) -> str:
    """Extracts embedded images from PDF pages and runs OCR via pytesseract if available."""
    try:
        import pytesseract
        texts = []
        for page in reader.pages:
            for count, image_file_object in enumerate(page.images):
                img = Image.open(io.BytesIO(image_file_object.data))
                text = pytesseract.image_to_string(img)
                if text.strip():
                    texts.append(text.strip())
        return "\n\n".join(texts)
    except Exception as e:
        logger.debug(f"Pytesseract OCR on PDF images skipped or unavailable: {e}")
        return ""


def extract_from_image(file_bytes: bytes) -> Tuple[str, bool]:
    """
    Runs OCR on an image (JPG, PNG) using pytesseract if available.
    Returns (text, ocr_performed).
    """
    try:
        import pytesseract
        img = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(img)
        return text.strip(), True
    except Exception as e:
        logger.debug(f"Pytesseract image OCR unavailable: {e}")
        return "", False


def process_uploaded_document_file(
    file_bytes: bytes,
    file_name: str,
    content_type: str
) -> ExtractedRawDocument:
    """
    Main extraction entrypoint: checks file type and extracts raw text
    and metadata from PDF or image documents.
    """
    lower_name = file_name.lower()
    is_pdf = "pdf" in content_type.lower() or lower_name.endswith(".pdf")

    if is_pdf:
        text, is_scanned, pages, ocr_done = extract_from_pdf(file_bytes)
        return ExtractedRawDocument(
            raw_text=text,
            is_scanned=is_scanned,
            page_count=pages,
            mime_type="application/pdf",
            file_bytes=file_bytes,
            ocr_performed=ocr_done
        )
    else:
        # Image (PNG, JPG, JPEG)
        text, ocr_done = extract_from_image(file_bytes)
        mime = content_type if "image" in content_type else "image/jpeg"
        return ExtractedRawDocument(
            raw_text=text,
            is_scanned=True,
            page_count=1,
            mime_type=mime,
            file_bytes=file_bytes,
            ocr_performed=ocr_done
        )
