/** Detect unique-violation / duplicate key from PostgREST / Supabase client errors. */
export function isDuplicateKeyError(err) {
  if (!err) return false;
  if (err.code === '23505') return true;
  const text = `${err.message || ''} ${err.details || ''}`.toLowerCase();
  return (
    text.includes('duplicate') ||
    text.includes('unique constraint') ||
    text.includes('already exists')
  );
}
