-- ==============================================================================
-- 20260917000002_storage_and_rls.sql
-- AI KYC Verification Platform - Row Level Security (RLS) & Storage Configuration
-- ==============================================================================

-- ==============================================================================
-- 1. Enable Row Level Security (RLS) on all tables
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Profiles Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. Customers Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create customers"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. KYC Cases Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view kyc cases"
    ON public.kyc_cases FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create kyc cases"
    ON public.kyc_cases FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update kyc cases"
    ON public.kyc_cases FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. Documents Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 6. Extracted Data Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view extracted data"
    ON public.extracted_data FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert extracted data"
    ON public.extracted_data FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update extracted data"
    ON public.extracted_data FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 7. Verification Results Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view verification results"
    ON public.verification_results FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert verification results"
    ON public.verification_results FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update verification results"
    ON public.verification_results FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 8. Issues Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view issues"
    ON public.issues FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert issues"
    ON public.issues FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues"
    ON public.issues FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 9. Reviews Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 10. Audit Logs Policies
-- ==============================================================================
CREATE POLICY "Authenticated users can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 11. Supabase Storage: Private Bucket 'kyc-documents'
-- ==============================================================================
-- Insert the private bucket into storage.buckets if not already existing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents',
    'kyc-documents',
    false, -- STRICTLY PRIVATE: no public access allowed
    15728640, -- 15 MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- Storage RLS Policies:
-- Allow authenticated users to upload documents to 'kyc-documents'
CREATE POLICY "Authenticated users can upload to kyc-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'kyc-documents');

-- Allow authenticated users to view/download objects in 'kyc-documents'
CREATE POLICY "Authenticated users can view kyc-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'kyc-documents');

-- Allow authenticated users to update objects in 'kyc-documents'
CREATE POLICY "Authenticated users can update kyc-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'kyc-documents');

-- Allow authenticated users to delete objects in 'kyc-documents'
CREATE POLICY "Authenticated users can delete kyc-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'kyc-documents');
