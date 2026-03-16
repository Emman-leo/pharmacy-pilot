ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Set yourself as super admin (replace with your actual email)
UPDATE profiles
  SET is_super_admin = true
  WHERE email = 'your@email.com';
