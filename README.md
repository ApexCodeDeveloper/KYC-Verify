# 🏦 AI KYC Verification Platform

A full-stack, production-ready AI-powered KYC (Know Your Customer) verification dashboard for financial businesses. Upload customer documents and let the system automatically extract, analyze, validate, and flag them — with a human-review workflow for edge cases.

---

## ✨ Features

| Capability | Detail |
|---|---|
| **Document Upload** | PDF, PNG, JPG, JPEG (up to 15 MB) |
| **OCR Extraction** | pypdf for digital PDFs; pytesseract for scanned docs & images |
| **AI Analysis** | Google Gemini (gemini-2.0-flash) — structured JSON extraction |
| **Validation Engine** | 10+ rule checks: expiry, name match, DOB, PAN/Passport format, age, cross-doc discrepancy |
| **Risk Scoring** | 0–100 risk score derived from issue severity and confidence |
| **Human Review** | Approve / Reject / Request Info workflow with notes |
| **Audit Trail** | Immutable audit log for every action |
| **Auth** | Supabase Auth (email + password, JWT-secured) |
| **Storage** | Private Supabase Storage bucket with signed URLs |
| **RLS** | Row Level Security on all 9 database tables |

---

## 🏗️ Architecture

`
Frontend (React/TS/Vite) <--HTTP--> FastAPI Backend (Python)
                                          |
                                    pypdf / pytesseract (OCR)
                                    Gemini AI (extraction)
                                    ValidationEngine (rules)
                                          |
                                    Supabase (PostgreSQL, Auth, Storage)
`

**Key security principle:** The frontend uses the **Supabase Anon Key** for Auth only. All document processing, database writes, and storage access are performed **exclusively** by the backend using the **Service Role Key** — never exposed to the browser.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (private bucket) |
| AI / LLM | Google Gemini (google-genai SDK) |
| OCR | pytesseract + pypdf + pdfplumber |
| Deployment | Frontend → Vercel, Backend → Render |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 and npm >= 9
- Python >= 3.11
- Tesseract OCR binary:
  - Windows: UB Mannheim installer — add to PATH
  - macOS: brew install tesseract
  - Linux: sudo apt-get install tesseract-ocr
- A Supabase project (free tier works)
- A Google Gemini API key

---

## 🗄️ Supabase Setup

### 1. Create a Supabase project

Go to supabase.com, create a new project, and note:
- Project URL (e.g., https://abcdefgh.supabase.co)
- Anon Key (public)
- Service Role Key (secret)

### 2. Run SQL migrations in order

In Supabase SQL Editor, paste and run:
1. supabase/migrations/20260917000001_initial_schema.sql
2. supabase/migrations/20260917000002_storage_and_rls.sql

### 3. Enable Email Auth

Supabase → Authentication → Providers → Email (enable)

---

## ⚙️ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in your values
uvicorn app.main:app --reload --port 8000
```

### Backend .env

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # SECRET
SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
CORS_ORIGINS=http://localhost:5173
PORT=8000
MAX_FILE_SIZE_MB=15
```

Health check: http://localhost:8000/api/health
Swagger docs: http://localhost:8000/docs

Run tests: pytest tests/ -v  (13 tests)

---

## 🖥️ Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env           # fill in your values
npm run dev                    # http://localhost:5173
```

### Frontend .env

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Public anon key (safe in browser)
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Testing with Documents

```bash
cd backend
python create_test_docs.py
# Creates 4 files in backend/sample_documents/:
#   valid_passport.pdf          — should VERIFY cleanly
#   expired_national_id.pdf     — triggers EXPIRY issue
#   mismatched_pan_card.pdf     — triggers NAME_MISMATCH issue
#   sample_id_card.png          — image OCR test
```

End-to-end flow:
1. Sign up at http://localhost:5173
2. New KYC Case → fill customer details
3. Upload documents from sample_documents/
4. Click "Process Case" → OCR + Gemini + validation runs
5. View Extraction, Validation Report, Issues
6. NEEDS_REVIEW cases appear in Review Queue

---

## ☁️ Deployment

### Frontend → Vercel
- Set Root Directory: frontend
- Set env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (Render URL)
- vercel.json handles SPA routing

### Backend → Render
- Set Root Directory: backend
- Build: pip install -r requirements.txt
- Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Set all env vars from .env.example
- Add Vercel URL to CORS_ORIGINS

---

## 🔐 Security

| Concern | How handled |
|---|---|
| Service Role Key | Only in backend .env — never frontend |
| RLS | All 9 tables — users see only their data |
| Private storage | Files via signed URLs (1-hour expiry) |
| File validation | MIME type + extension checked server-side |
| File size | 15 MB enforced at upload |
| CORS | Restricted to CORS_ORIGINS |

---

## 📋 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Health check |
| GET | /api/dashboard/stats | Dashboard stats |
| POST | /api/kyc | Create KYC case |
| GET | /api/kyc | List cases |
| GET | /api/kyc/{id} | Case detail |
| POST | /api/kyc/{id}/documents | Upload document |
| POST | /api/kyc/{id}/process | Run AI pipeline |
| GET | /api/kyc/{id}/results | Verification results |
| GET | /api/kyc/{id}/issues | Flagged issues |
| POST | /api/kyc/{id}/review | Submit review |
| GET | /api/documents/{id}/signed-url | Signed preview URL |

---

## 🐛 Troubleshooting

- **tesseract not found**: Add Tesseract to PATH. Windows: C:\Program Files\Tesseract-OCR
- **SUPABASE_URL not configured**: Copy .env.example → .env and fill values
- **CORS errors**: Add frontend URL to CORS_ORIGINS in backend .env
- **Documents stuck in PROCESSING**: Click "Process Case" button in UI
- **Row not found after signup**: Ensure Migration 1 is applied (creates auto-profile trigger)
- **Gemini quota errors**: System falls back to regex heuristics automatically

---

## 📄 License

MIT
