-- Add tier to pharmacies table
-- Default is 'starter' for safety — upgrade manually when payment confirmed

CREATE TYPE pharmacy_tier AS ENUM ('starter', 'growth', 'pro');

ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS tier pharmacy_tier NOT NULL DEFAULT 'starter';
