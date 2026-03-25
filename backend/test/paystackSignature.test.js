import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { verifyPaystackSignature } from '../src/utils/paystackSignature.js';

describe('verifyPaystackSignature', () => {
  it('accepts valid HMAC-SHA512 over raw bytes', () => {
    const secret = 'sk_test_abc';
    const raw = Buffer.from('{"event":"charge.success"}', 'utf8');
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    assert.equal(verifyPaystackSignature(raw, secret, sig), true);
  });

  it('rejects wrong secret', () => {
    const raw = Buffer.from('{}', 'utf8');
    const sig = createHmac('sha512', 'good').update(raw).digest('hex');
    assert.equal(verifyPaystackSignature(raw, 'bad', sig), false);
  });

  it('rejects non-buffer body', () => {
    assert.equal(verifyPaystackSignature(/** @type {any} */ ({}), 's', 'x'), false);
  });
});
