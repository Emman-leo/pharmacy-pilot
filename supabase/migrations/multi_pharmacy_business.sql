-- Multi-pharmacy business: per-pharmacy drug catalog and optional settings
-- Run in Supabase SQL Editor. Safe to run on existing DB (adds nullable pharmacy_id to drugs).

-- 1) Add pharmacy_id to drugs (NULL = shared catalog for backward compatibility)
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_drugs_pharmacy ON drugs(pharmacy_id);

-- 2) Pharmacy settings (branding, currency per business)
CREATE TABLE IF NOT EXISTS pharmacy_settings (
  pharmacy_id UUID PRIMARY KEY REFERENCES pharmacies(id) ON DELETE CASCADE,
  currency_code TEXT DEFAULT 'GHS',
  logo_url TEXT,
  timezone TEXT DEFAULT 'Africa/Accra',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pharmacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pharmacy_settings_select_own ON pharmacy_settings FOR SELECT TO authenticated
  USING (pharmacy_id = public.user_pharmacy_id() OR public.user_role() = 'ADMIN');
CREATE POLICY pharmacy_settings_all_admin ON pharmacy_settings FOR ALL TO authenticated
  USING (public.user_role() = 'ADMIN');

-- 3) Replace drugs RLS so each pharmacy sees only shared drugs + their own
DROP POLICY IF EXISTS drugs_select_auth ON drugs;
DROP POLICY IF EXISTS drugs_all_admin ON drugs;

CREATE POLICY drugs_select_pharmacy ON drugs FOR SELECT TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());

-- Staff can insert drugs for their pharmacy or shared (NULL); ADMIN can insert any
CREATE POLICY drugs_insert_pharmacy ON drugs FOR INSERT TO authenticated
  WITH CHECK (
    public.user_role() = 'ADMIN'
    OR pharmacy_id IS NULL
    OR pharmacy_id = public.user_pharmacy_id()
  );

CREATE POLICY drugs_update_pharmacy ON drugs FOR UPDATE TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id())
  WITH CHECK (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());

CREATE POLICY drugs_delete_admin ON drugs FOR DELETE TO authenticated
  USING (public.user_role() = 'ADMIN');

-- Trigger for pharmacy_settings updated_at
CREATE TRIGGER pharmacy_settings_updated_at BEFORE UPDATE ON pharmacy_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
