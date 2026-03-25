import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { isDuplicateKeyError } from '../src/utils/supabaseErrors.js';

describe('isDuplicateKeyError', () => {
  it('detects Postgres 23505', () => {
    assert.equal(isDuplicateKeyError({ code: '23505' }), true);
  });

  it('detects duplicate in message', () => {
    assert.equal(isDuplicateKeyError({ message: 'duplicate key value' }), true);
  });

  it('detects unique constraint in details', () => {
    assert.equal(isDuplicateKeyError({ details: 'unique constraint payment_events_reference_unique' }), true);
  });

  it('returns false for unrelated errors', () => {
    assert.equal(isDuplicateKeyError({ message: 'connection refused' }), false);
    assert.equal(isDuplicateKeyError(null), false);
  });
});
