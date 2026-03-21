// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SADAD Webhook Verification Middleware
 *
 * Provides utilities for verifying SADAD webhook signatures in Next.js
 * middleware or custom API route wrappers.
 *
 * Usage with Next.js middleware (middleware.ts at project root):
 *   import { verifySadadWebhookSignature } from '@louis-innovations/sadad-nextjs/server';
 *
 * Usage as a route wrapper:
 *   import { withSadadWebhookVerification } from '@louis-innovations/sadad-nextjs/server';
 *   export const POST = withSadadWebhookVerification(myHandler);
 */

import { NextRequest, NextResponse } from 'next/server.js';
import { SignatureVerifier } from '@louis-innovations/sadad-js-sdk';

// ---------------------------------------------------------------------------
// Low-level signature verification
// ---------------------------------------------------------------------------

/**
 * Verify a SADAD webhook checksumhash.
 *
 * @param payload    Parsed JSON payload from SADAD
 * @param secretKey  SADAD merchant secret key (from env vars)
 * @returns          `true` if the signature is valid
 * @throws           SignatureError if verification fails
 */
export function verifySadadWebhookSignature(
  payload: Record<string, unknown>,
  secretKey: string,
): boolean {
  SignatureVerifier.verifyWebhook(payload, secretKey);
  return true;
}

/**
 * Safely verify a SADAD webhook checksumhash without throwing.
 *
 * @param payload    Parsed JSON payload from SADAD
 * @param secretKey  SADAD merchant secret key
 * @returns          `true` if valid, `false` otherwise
 */
export function safeVerifySadadWebhookSignature(
  payload: Record<string, unknown>,
  secretKey: string,
): boolean {
  try {
    SignatureVerifier.verifyWebhook(payload, secretKey);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route handler wrapper
// ---------------------------------------------------------------------------

type RouteHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a Next.js App Router route handler with SADAD webhook signature
 * verification.
 *
 * The wrapper reads the request body once, verifies the checksumhash against
 * `SADAD_SECRET_KEY` from environment variables, and either calls the inner
 * handler (with the parsed body attached to `req.headers` as
 * `x-sadad-parsed-body`) or returns HTTP 401 on verification failure.
 *
 * @param handler    The inner route handler to wrap
 * @returns          A new route handler with verification applied
 *
 * @example
 * // app/api/sadad/webhook/route.ts
 * import { withSadadWebhookVerification } from '@louis-innovations/sadad-nextjs/server';
 *
 * async function handler(req: NextRequest) {
 *   const payload = JSON.parse(req.headers.get('x-sadad-parsed-body') ?? '{}');
 *   // ... process payload
 *   return NextResponse.json({ status: 'success' });
 * }
 *
 * export const POST = withSadadWebhookVerification(handler);
 */
export function withSadadWebhookVerification(handler: RouteHandler): RouteHandler {
  return async function verifiedHandler(req: NextRequest): Promise<NextResponse> {
    const secretKey = process.env['SADAD_SECRET_KEY'];

    if (!secretKey) {
      console.error('[sadad-nextjs] SADAD_SECRET_KEY environment variable is not set.');
      return NextResponse.json(
        { error: 'Webhook verification misconfigured.' },
        { status: 500 },
      );
    }

    let payload: Record<string, unknown>;
    let rawBody: string;

    try {
      rawBody = await req.text();
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload.' },
        { status: 400 },
      );
    }

    const isValid = safeVerifySadadWebhookSignature(payload, secretKey);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed.' },
        { status: 401 },
      );
    }

    // Forward the pre-parsed body to the inner handler via a custom header
    // so it does not need to re-read the (already consumed) body stream.
    const modifiedReq = new NextRequest(req.url, {
      method: req.method,
      headers: (() => {
        const h = new Headers();
        req.headers.forEach((value, key) => h.set(key, value));
        h.set('x-sadad-parsed-body', rawBody);
        h.set('x-sadad-verified', '1');
        return h;
      })(),
    });

    return handler(modifiedReq);
  };
}

// ---------------------------------------------------------------------------
// IP allowlist helper
// ---------------------------------------------------------------------------

/**
 * Known SADAD gateway IP ranges (update as SADAD publishes new ranges).
 *
 * This list is provided as a convenience — always consult the official
 * SADAD developer documentation for the authoritative and up-to-date list.
 */
export const SADAD_GATEWAY_IPS: readonly string[] = [
  '149.3.224.0/24',
  '149.3.225.0/24',
] as const;

/**
 * Check whether a request IP is in the allowed SADAD gateway IP list.
 *
 * In Next.js the real IP is available on `req.headers.get('x-forwarded-for')`.
 * This is a best-effort check — ensure your reverse proxy sets this header.
 *
 * @param req        Incoming Next.js request
 * @param allowedIps List of allowed IPs (exact match, no CIDR parsing)
 * @returns          `true` if the IP matches an entry in `allowedIps`
 */
export function isSadadGatewayRequest(
  req: NextRequest,
  allowedIps: readonly string[] = SADAD_GATEWAY_IPS,
): boolean {
  const forwardedFor = req.headers.get('x-forwarded-for') ?? '';
  const remoteIp = forwardedFor.split(',')[0]?.trim() ?? '';

  if (!remoteIp) return false;

  return allowedIps.some((allowed) => {
    // Exact IP match (CIDR ranges are not evaluated — extend as needed)
    return allowed === remoteIp;
  });
}
