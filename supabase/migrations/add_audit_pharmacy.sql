-- Add pharmacy_id to audit_logs for multi-pharmacy scoping
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_pharmacy ON public.audit_logs(pharmacy_id);
