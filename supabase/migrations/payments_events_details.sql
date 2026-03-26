-- Payment event details used for invoice + payment history UI

ALTER TABLE payment_events
  ADD COLUMN IF NOT EXISTS amount_ghs DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT;

