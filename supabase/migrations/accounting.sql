-- ============================================================
-- Accounting: expenses, daily close, payment method on sales
-- ============================================================

CREATE TYPE expense_category AS ENUM (
  'rent',
  'salaries',
  'utilities',
  'transport',
  'licenses',
  'maintenance',
  'miscellaneous'
);

CREATE TYPE payment_method AS ENUM ('cash', 'momo');

-- Add payment_method to sales (required, no default — enforced at app level)
ALTER TABLE sales
  ADD COLUMN payment_method payment_method NOT NULL DEFAULT 'cash';

-- Expenses
CREATE TABLE expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id    UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  amount         DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category       expense_category NOT NULL,
  payment_method payment_method NOT NULL,
  description    TEXT,
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  staff_name     TEXT,
  receipt_url    TEXT,
  recorded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_pharmacy ON expenses(pharmacy_id);
CREATE INDEX idx_expenses_date     ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Daily closes
CREATE TABLE daily_closes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id         UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  close_date          DATE NOT NULL,
  cash_sales          DECIMAL(12,2) NOT NULL DEFAULT 0,
  momo_sales          DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_sales         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_expenses_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_expenses_momo DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_cash       DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cash         DECIMAL(12,2) NOT NULL DEFAULT 0,
  discrepancy         DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  closed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, close_date)
);

CREATE INDEX idx_daily_closes_pharmacy ON daily_closes(pharmacy_id);
CREATE INDEX idx_daily_closes_date     ON daily_closes(close_date);

-- RLS
ALTER TABLE expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closes ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select     ON expenses FOR SELECT TO authenticated
  USING (pharmacy_id = public.user_pharmacy_id());
CREATE POLICY expenses_insert     ON expenses FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id = public.user_pharmacy_id());
CREATE POLICY expenses_update     ON expenses FOR UPDATE TO authenticated
  USING (pharmacy_id = public.user_pharmacy_id());
CREATE POLICY expenses_delete     ON expenses FOR DELETE TO authenticated
  USING (public.user_role() = 'ADMIN');

CREATE POLICY daily_closes_select ON daily_closes FOR SELECT TO authenticated
  USING (pharmacy_id = public.user_pharmacy_id());
CREATE POLICY daily_closes_insert ON daily_closes FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id = public.user_pharmacy_id() AND public.user_role() = 'ADMIN');
CREATE POLICY daily_closes_update ON daily_closes FOR UPDATE TO authenticated
  USING (pharmacy_id = public.user_pharmacy_id() AND public.user_role() = 'ADMIN');
