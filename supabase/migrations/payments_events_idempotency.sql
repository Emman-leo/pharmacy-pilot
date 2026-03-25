-- Paystack payment events for idempotency / audit
-- Ensures webhook + verify flows cannot double-apply subscription updates.

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('webhook', 'verify')),
  event_type TEXT,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  months INTEGER,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only process a given payment reference once
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_reference_unique ON payment_events(reference);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

