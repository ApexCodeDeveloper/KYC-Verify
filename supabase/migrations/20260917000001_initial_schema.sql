-- ==============================================================================
-- 20260917000001_initial_schema.sql
-- AI KYC Verification Platform - Initial Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE kyc_status AS ENUM (
    'PROCESSING',
    'VERIFIED',
    'NEEDS_REVIEW',
    'REJECTED',
    'FAILED'
);

CREATE TYPE document_type AS ENUM (
    'PASSPORT',
    'DRIVING_LICENSE',
    'NATIONAL_ID',
    'PAN_CARD',
    'UTILITY_BILL',
    'UNKNOWN'
);

CREATE TYPE issue_severity AS ENUM (
    'CRITICAL',
    'WARNING',
    'INFO'
);

CREATE TYPE review_decision AS ENUM (
    'APPROVE',
    'REJECT',
    'REQUEST_INFO'
);

-- ==============================================================================
-- 1. Profiles Table (Linked to Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'reviewer', -- 'admin', 'reviewer', 'compliance_officer'
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Auto-create profile on auth.user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'reviewer')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. Customers Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON public.customers(customer_id_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);

-- ==============================================================================
-- 3. KYC Cases Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.kyc_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status kyc_status NOT NULL DEFAULT 'PROCESSING',
    risk_score NUMERIC(5,2) DEFAULT 0.00, -- 0.00 (low risk) to 100.00 (high risk)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON public.kyc_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.kyc_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON public.kyc_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.kyc_cases(case_number);

-- ==============================================================================
-- 4. Documents Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.kyc_cases(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- e.g. application/pdf, image/jpeg, image/png
    storage_path TEXT NOT NULL, -- Path inside Supabase Storage bucket 'kyc-documents'
    file_size BIGINT NOT NULL,
    document_type_detected document_type DEFAULT 'UNKNOWN',
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, EXTRACTED, FAILED
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type_detected);

-- ==============================================================================
-- 5. Extracted Data Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    raw_text TEXT,
    fields JSONB NOT NULL DEFAULT '{}'::jsonb, -- { full_name, date_of_birth, document_number, expiry_date, issue_date, address, gender, nationality }
    confidence NUMERIC(4,3) DEFAULT 0.000, -- 0.000 to 1.000
    ai_model TEXT,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_extracted_data_document_id ON public.extracted_data(document_id);

-- ==============================================================================
-- 6. Verification Results Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.kyc_cases(id) ON DELETE CASCADE UNIQUE,
    overall_status kyc_status NOT NULL DEFAULT 'PROCESSING',
    confidence_score NUMERIC(4,3) DEFAULT 0.000,
    checks_run JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of check objects { check_name, passed, details }
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_verification_results_case_id ON public.verification_results(case_id);

-- ==============================================================================
-- 7. Issues Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.kyc_cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    rule_code TEXT NOT NULL, -- e.g. DOC_EXPIRED, NAME_MISMATCH, LOW_CONFIDENCE, INVALID_FORMAT, MISSING_REQUIRED_FIELDS
    severity issue_severity NOT NULL DEFAULT 'WARNING',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_issues_case_id ON public.issues(case_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON public.issues(severity);

-- ==============================================================================
-- 8. Reviews Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.kyc_cases(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision review_decision NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reviews_case_id ON public.reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);

-- ==============================================================================
-- 9. Audit Logs Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES public.kyc_cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- CASE_CREATED, DOCUMENT_UPLOADED, PROCESSING_STARTED, PROCESSING_COMPLETED, ISSUE_DETECTED, CASE_REVIEWED, CASE_APPROVED, CASE_REJECTED
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON public.audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- Helper Trigger for updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kyc_cases_updated_at BEFORE UPDATE ON public.kyc_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_verification_results_updated_at BEFORE UPDATE ON public.verification_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
