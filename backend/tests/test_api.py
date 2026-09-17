from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["health_check"] == "/api/health"


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "ai" in data
    assert "ocr" in data


def test_invalid_document_upload_format():
    # Attempt to upload an invalid file extension like .exe
    response = client.post(
        "/api/kyc/test-case-id/documents",
        files={"file": ("malware.exe", b"executable bytes", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_empty_document_upload():
    response = client.post(
        "/api/kyc/test-case-id/documents",
        files={"file": ("empty.pdf", b"", "application/pdf")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
