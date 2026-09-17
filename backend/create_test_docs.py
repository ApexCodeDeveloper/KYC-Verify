import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_pdf(file_path: Path, lines: list):
    """Writes a standard readable PDF file."""
    text_content = " ".join(lines)
    escaped = text_content.replace("(", "\\(").replace(")", "\\)")
    
    # Simple valid single-page PDF
    stream_data = f"BT /F1 12 Tf 50 700 Td ({escaped}) Tj ET\n".encode("utf-8")
    stream_len = len(stream_data)

    content = bytearray()
    content.extend(b"%PDF-1.4\n")
    offsets = []

    def add_obj(obj_str: str):
        offsets.append(len(content))
        content.extend(obj_str.encode("utf-8"))

    add_obj("1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n")
    add_obj("2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n")
    add_obj("3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n")
    add_obj("4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n")
    add_obj(f"5 0 obj <</Length {stream_len}>> stream\n")
    content.extend(stream_data)
    content.extend(b"endstream\nendobj\n")

    xref_offset = len(content)
    content.extend(b"xref\n0 6\n0000000000 65535 f \n")
    for off in offsets:
        content.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    content.extend(f"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n{xref_offset}\n%%EOF".encode("ascii"))

    with open(file_path, "wb") as f:
        f.write(content)
    print(f"Generated PDF: {file_path}")


def create_image(file_path: Path, title: str, fields: dict):
    """Draws a clean identity card image with readable text."""
    width, height = 600, 360
    img = Image.new("RGB", (width, height), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (width, 60)], fill=(30, 58, 138))
    draw.text((20, 18), title, fill=(255, 255, 255))

    # Details
    y = 90
    for k, v in fields.items():
        draw.text((30, y), f"{k}:", fill=(71, 85, 105))
        draw.text((180, y), str(v), fill=(15, 23, 42))
        y += 35

    # Decorative ID box
    draw.rectangle([(width - 150, 80), (width - 30, 220)], outline=(203, 213, 225), width=2)
    draw.text((width - 130, 140), "PHOTO", fill=(148, 163, 184))

    img.save(file_path)
    print(f"Generated Image: {file_path}")


def generate_all_samples():
    sample_dir = Path(__file__).parent / "sample_documents"
    sample_dir.mkdir(exist_ok=True)

    # 1. Valid Passport
    create_pdf(
        sample_dir / "valid_passport.pdf",
        [
            "PASSPORT",
            "Full Name: Marcus Aurelius",
            "Document Number: P98765432",
            "Date of Birth: 1990-04-26",
            "Expiry Date: 2032-12-31",
            "Nationality: Italian",
            "Gender: Male"
        ]
    )

    # 2. Expired ID
    create_pdf(
        sample_dir / "expired_national_id.pdf",
        [
            "NATIONAL ID CARD",
            "Full Name: Marcus Aurelius",
            "Document Number: ID87654321",
            "Date of Birth: 1990-04-26",
            "Expiry Date: 2021-01-01"
        ]
    )

    # 3. Mismatched Name Document
    create_pdf(
        sample_dir / "mismatched_pan_card.pdf",
        [
            "PERMANENT ACCOUNT NUMBER CARD",
            "INCOME TAX DEPARTMENT",
            "ABCDE1234F",
            "Full Name: Lucius Verus",
            "Date of Birth: 1990-04-26"
        ]
    )

    # 4. Valid PNG ID Card
    create_image(
        sample_dir / "sample_id_card.png",
        title="GOVERNMENT IDENTITY CARD",
        fields={
            "Name": "Marcus Aurelius",
            "DOB": "1990-04-26",
            "ID Number": "N87654321",
            "Expiry": "2030-05-15"
        }
    )


if __name__ == "__main__":
    generate_all_samples()
