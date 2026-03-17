-- 1. Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new columns to inventory_batches
ALTER TABLE public.inventory_batches
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN supplier_invoice TEXT,
  ADD COLUMN received_quantity INTEGER;

-- 3. Backfill received_quantity from current quantity for existing batches
UPDATE public.inventory_batches
SET received_quantity = quantity
WHERE received_quantity IS NULL;

-- 4. RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pharmacy_members_select_suppliers"
ON public.suppliers FOR SELECT
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "pharmacy_admins_insert_suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "pharmacy_admins_update_suppliers"
ON public.suppliers FOR UPDATE
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  )
);
