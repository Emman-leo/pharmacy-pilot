-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Void sale with atomic inventory restoration
CREATE OR REPLACE FUNCTION public.void_sale(p_sale_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
BEGIN
  -- Lock and fetch the sale row to prevent race conditions
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  -- Raise exception if sale not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found: %', p_sale_id;
  END IF;

  -- Raise exception if already voided
  IF v_sale.status = 'VOIDED' THEN
    RAISE EXCEPTION 'Sale already voided: %', p_sale_id;
  END IF;

  -- Loop through all sale items and restore inventory quantities
  FOR v_item IN
    SELECT si.batch_id, si.quantity
    FROM sale_items si
    WHERE si.sale_id = p_sale_id
      AND si.batch_id IS NOT NULL
      AND si.quantity > 0
  LOOP
    -- Increment inventory batch quantity atomically
    UPDATE inventory_batches
    SET quantity   = quantity + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.batch_id;

    -- Fail loudly if the batch no longer exists
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory batch not found: %', v_item.batch_id;
    END IF;
  END LOOP;

  -- Mark sale as voided
  UPDATE sales
  SET status = 'VOIDED'
  WHERE id = p_sale_id;

END;
$$ LANGUAGE plpgsql;
