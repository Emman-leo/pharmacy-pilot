-- Add subscription management columns to pharmacies table
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at DATE,
  ADD COLUMN IF NOT EXISTS tier pharmacy_tier NOT NULL DEFAULT 'starter';

-- Add is_active column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
