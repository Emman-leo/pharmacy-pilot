-- Pharmacy Management System - Supabase Schema
-- Run this in Supabase SQL Editor after project setup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE prescription_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'STAFF',
  pharmacy_id UUID,  -- For multi-tenant isolation; NULL = system-wide
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHARMACIES (optional multi-tenant)
-- ============================================
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_pharmacy 
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE SET NULL;

-- ============================================
-- DRUGS (master data)
-- ============================================
CREATE TABLE drugs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT,  -- e.g. "500mg", "10ml"
  category TEXT,  -- e.g. "Antibiotic", "Analgesic"
  controlled_drug BOOLEAN DEFAULT FALSE,
  requires_prescription BOOLEAN DEFAULT FALSE,
  unit TEXT DEFAULT 'pcs',  -- pcs, bottle, box, etc.
  min_stock_quantity INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drugs_name ON drugs(name);
CREATE INDEX idx_drugs_category ON drugs(category);
CREATE INDEX idx_drugs_controlled ON drugs(controlled_drug);

-- ============================================
-- INVENTORY BATCHES (FEFO tracking)
-- ============================================
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit_price DECIMAL(12,2) NOT NULL,
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_batches_drug ON inventory_batches(drug_id);
CREATE INDEX idx_inventory_batches_pharmacy ON inventory_batches(pharmacy_id);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date);

-- ============================================
-- SALES (transactions)
-- ============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  sold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_pharmacy ON sales(pharmacy_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_receipt ON sales(receipt_number);

-- ============================================
-- SALE ITEMS
-- ============================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_drug ON sale_items(drug_id);

-- ============================================
-- PRESCRIPTIONS
-- ============================================
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  patient_weight DECIMAL(6,2),
  doctor_name TEXT NOT NULL,
  prescribed_drugs JSONB NOT NULL,  -- [{drug_id, dosage, frequency, duration}]
  notes TEXT,
  status prescription_status DEFAULT 'PENDING',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_pharmacy ON prescriptions(pharmacy_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);

-- ============================================
-- DRUG INTERACTIONS (safety rules)
-- ============================================
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_id_1 UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  drug_id_2 UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,  -- mild, moderate, severe
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT drug_interaction_unique UNIQUE (drug_id_1, drug_id_2),
  CONSTRAINT drug_interaction_order CHECK (drug_id_1 < drug_id_2)
);

CREATE INDEX idx_drug_interactions_drug1 ON drug_interactions(drug_id_1);
CREATE INDEX idx_drug_interactions_drug2 ON drug_interactions(drug_id_2);

-- ============================================
-- DOSAGE LIMITS (safety rules by age/weight)
-- ============================================
CREATE TABLE dosage_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  max_daily_dose DECIMAL(10,2),
  max_per_dose DECIMAL(10,2),
  min_age_years INTEGER,
  max_age_years INTEGER,
  min_weight_kg DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dosage_limits_drug ON dosage_limits(drug_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosage_limits ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's pharmacy_id (public schema - no auth schema permission needed)
CREATE OR REPLACE FUNCTION public.user_pharmacy_id()
RETURNS UUID AS $$
  SELECT pharmacy_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users can read/update own profile; ADMIN can manage all
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_select_admin ON profiles FOR SELECT USING (public.user_role() = 'ADMIN');
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_insert_admin ON profiles FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

-- Pharmacies: authenticated users can read; ADMIN can manage
CREATE POLICY pharmacies_select_auth ON pharmacies FOR SELECT TO authenticated USING (true);
CREATE POLICY pharmacies_all_admin ON pharmacies FOR ALL TO authenticated USING (public.user_role() = 'ADMIN');

-- Drugs: all authenticated can read; ADMIN can manage (drugs are shared master data)
CREATE POLICY drugs_select_auth ON drugs FOR SELECT TO authenticated USING (true);
CREATE POLICY drugs_all_admin ON drugs FOR ALL TO authenticated USING (public.user_role() = 'ADMIN');

-- Inventory: filtered by pharmacy; ADMIN full access, STAFF limited
CREATE POLICY inventory_select_own ON inventory_batches FOR SELECT TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY inventory_insert_staff ON inventory_batches FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY inventory_update_staff ON inventory_batches FOR UPDATE TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY inventory_delete_admin ON inventory_batches FOR DELETE TO authenticated
  USING (public.user_role() = 'ADMIN');

-- Sales: filtered by pharmacy
CREATE POLICY sales_select_own ON sales FOR SELECT TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY sales_insert_staff ON sales FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());

-- Sale items: via sale
CREATE POLICY sale_items_select_own ON sale_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id 
    AND (s.pharmacy_id IS NULL OR s.pharmacy_id = public.user_pharmacy_id())
  ));
CREATE POLICY sale_items_insert_staff ON sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id 
    AND (s.pharmacy_id IS NULL OR s.pharmacy_id = public.user_pharmacy_id())
  ));

-- Prescriptions: filtered by pharmacy
CREATE POLICY prescriptions_select_own ON prescriptions FOR SELECT TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY prescriptions_insert_staff ON prescriptions FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());
CREATE POLICY prescriptions_update_own ON prescriptions FOR UPDATE TO authenticated
  USING (pharmacy_id IS NULL OR pharmacy_id = public.user_pharmacy_id());

-- Drug interactions & dosage limits: all read; ADMIN manage
CREATE POLICY drug_interactions_select ON drug_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY drug_interactions_admin ON drug_interactions FOR ALL TO authenticated USING (public.user_role() = 'ADMIN');
CREATE POLICY dosage_limits_select ON dosage_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY dosage_limits_admin ON dosage_limits FOR ALL TO authenticated USING (public.user_role() = 'ADMIN');

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER pharmacies_updated_at BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER drugs_updated_at BEFORE UPDATE ON drugs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER inventory_batches_updated_at BEFORE UPDATE ON inventory_batches
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Auto-create profile on signup (requires Supabase dashboard: Database > Extensions or run as superuser)
-- If you get "permission denied for schema auth", skip this block and create profiles manually or via API.
-- To enable: Supabase Dashboard > Database > Triggers > "on_auth_user_created" or run in SQL with elevated role.
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'STAFF');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/
