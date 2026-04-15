import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.TOKEN_SECRET;
if (!SECRET) {
  console.warn('⚠️  TOKEN_SECRET env var is not set — document serving tokens will be insecure!');
}

/**
 * Signs a storagePath + expiry into an HMAC-SHA256 token.
 *
 * Token format: `<b64url-payload>.<hex-signature>`
 * Payload:      base64url(`<storagePath>|<expiryMs>`)
 *
 * Unlike a plain base64 token, this token cannot be forged or modified
 * without knowing the TOKEN_SECRET — the signature will not match.
 */
export function signToken(storagePath: string, expiresInSeconds: number): string {
  const expiry = Date.now() + expiresInSeconds * 1000;
  const raw = `${storagePath}|${expiry}`;
  const payload = Buffer.from(raw).toString('base64url');
  const sig = createHmac('sha256', SECRET || 'insecure-fallback')
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verifies an HMAC token and returns the storagePath if valid.
 * Throws an Error with a descriptive message on any failure.
 */
export function verifyToken(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Malformed token');

  const [payload, sig] = parts;

  // Constant-time comparison to prevent timing attacks
  const expectedSig = createHmac('sha256', SECRET || 'insecure-fallback')
    .update(payload)
    .digest();
  const actualSig = Buffer.from(sig, 'hex');

  if (
    actualSig.length !== expectedSig.length ||
    !timingSafeEqual(actualSig, expectedSig)
  ) {
    throw new Error('Invalid token signature');
  }

  const raw = Buffer.from(payload, 'base64url').toString('utf-8');
  const [storagePath, expiryStr] = raw.split('|');

  if (!storagePath || !expiryStr) throw new Error('Malformed token payload');
  if (Date.now() > parseInt(expiryStr, 10)) throw new Error('Token has expired');

  return storagePath;
}
