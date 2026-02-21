-- Restrict pharmacies SELECT: pharmacy users see only their pharmacy; super admins (no pharmacy) see all
DROP POLICY IF EXISTS pharmacies_select_auth ON pharmacies;
CREATE POLICY pharmacies_select_pharmacy ON pharmacies FOR SELECT TO authenticated
  USING (public.user_pharmacy_id() IS NULL OR id = public.user_pharmacy_id());
v