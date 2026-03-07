-- Rename unit_price to cost_price for clarity
ALTER TABLE inventory_batches 
  RENAME COLUMN unit_price TO cost_price;

-- Add selling_price column
ALTER TABLE inventory_batches
  ADD COLUMN selling_price DECIMAL(10,2);

-- Seed existing batches so nothing breaks
UPDATE inventory_batches 
  SET selling_price = cost_price 
  WHERE selling_price IS NULL;
