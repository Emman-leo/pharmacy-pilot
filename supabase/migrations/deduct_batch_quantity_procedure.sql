CREATE OR REPLACE FUNCTION public.deduct_batch_quantity(
  p_batch_id UUID,
  p_quantity  INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_qty INTEGER;
BEGIN
  UPDATE inventory_batches
  SET quantity   = quantity - p_quantity,
      updated_at = NOW()
  WHERE id       = p_batch_id
    AND quantity >= p_quantity
  RETURNING quantity INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock in batch: %', p_batch_id;
  END IF;

  RETURN v_new_qty;
END;
$$ LANGUAGE plpgsql;
