import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import {
  checkoutValidators,
  loginValidators,
  onboardingCompleteValidators,
  paymentsVerifyValidators,
} from '../src/validators/criticalRoutes.js';

async function runValidators(reqShape, validators) {
  const req = {
    body: reqShape.body ?? {},
    params: reqShape.params ?? {},
    query: reqShape.query ?? {},
  };
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
}

describe('critical route validators', () => {
  it('login: rejects invalid email', async () => {
    const r = await runValidators({ body: { email: 'nope', password: 'x' } }, loginValidators);
    assert.equal(r.isEmpty(), false);
  });

  it('login: accepts valid payload', async () => {
    const r = await runValidators(
      { body: { email: 'a@b.co', password: 'secret123' } },
      loginValidators,
    );
    assert.equal(r.isEmpty(), true);
  });

  it('checkout: rejects empty items', async () => {
    const r = await runValidators(
      { body: { items: [], payment_method: 'cash' } },
      checkoutValidators,
    );
    assert.equal(r.isEmpty(), false);
  });

  it('checkout: accepts valid line', async () => {
    const r = await runValidators(
      {
        body: {
          items: [{ drug_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
          payment_method: 'momo',
        },
      },
      checkoutValidators,
    );
    assert.equal(r.isEmpty(), true);
  });

  it('onboarding: requires pharmacy_name length', async () => {
    const r = await runValidators({ body: { pharmacy_name: 'x' } }, onboardingCompleteValidators);
    assert.equal(r.isEmpty(), false);
  });

  it('payments verify param: rejects short reference', async () => {
    const r = await runValidators({ params: { reference: 'abc' } }, paymentsVerifyValidators);
    assert.equal(r.isEmpty(), false);
  });
});
