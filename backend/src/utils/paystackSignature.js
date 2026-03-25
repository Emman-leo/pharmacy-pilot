import { createHmac } from 'node:crypto';

/**
 * Paystack signs the raw request body with HMAC-SHA512 using the secret key.
 * @param {Buffer} rawBody
 * @param {string} secret
 * @param {string | undefined} signatureHeader
 */
export function verifyPaystackSignature(rawBody, secret, signatureHeader) {
  if (!secret || !signatureHeader || !rawBody || !Buffer.isBuffer(rawBody)) {
    return false;
  }
  const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
  return hash === signatureHeader;
}
