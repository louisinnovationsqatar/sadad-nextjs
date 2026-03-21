// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SADAD API Route Handlers
 *
 * Drop-in handler factories for Next.js App Router API routes.
 * Export the returned handler functions directly from your route files.
 *
 * Usage — app/api/sadad/webhook/route.ts:
 *   import { createWebhookHandler } from '@louis-innovations/sadad-nextjs/server';
 *   export const POST = createWebhookHandler({
 *     onSuccess: async (result) => { ... },
 *     onFailure: async (result) => { ... },
 *   });
 *
 * Usage — app/api/sadad/callback/route.ts:
 *   import { createCallbackHandler } from '@louis-innovations/sadad-nextjs/server';
 *   export const POST = createCallbackHandler({
 *     version: 'v1.1',
 *     onSuccess: async (result) => { redirect('/success') },
 *     onFailure: async (result) => { redirect('/failure') },
 *   });
 */

import { NextRequest, NextResponse } from 'next/server.js';
import { SadadClient, SadadConfig } from '@louis-innovations/sadad-js-sdk';
import type { WebhookResult, CallbackResult } from '@louis-innovations/sadad-js-sdk';
import type { CheckoutVersion, WebhookPayload, CallbackPayload } from '../types/index.js';

// ---------------------------------------------------------------------------
// Internal helpers (duplicated from sadad-actions to avoid server-action
// directive contamination — this module must NOT be tagged 'use server')
// ---------------------------------------------------------------------------

function buildClient(): SadadClient {
  const merchantId = process.env['SADAD_MERCHANT_ID'];
  const secretKey = process.env['SADAD_SECRET_KEY'];
  const website = process.env['SADAD_WEBSITE'];

  if (!merchantId || !secretKey || !website) {
    throw new Error(
      'Missing required SADAD environment variables: SADAD_MERCHANT_ID, SADAD_SECRET_KEY, SADAD_WEBSITE',
    );
  }

  const config = new SadadConfig({
    merchantId,
    secretKey,
    website,
    environment: (process.env['SADAD_ENVIRONMENT'] as 'test' | 'live') ?? 'test',
    language: (process.env['SADAD_LANGUAGE'] as 'eng' | 'arb') ?? 'eng',
    callbackUrl: process.env['SADAD_CALLBACK_URL'] ?? null,
    webhookUrl: process.env['SADAD_WEBHOOK_URL'] ?? null,
  });

  return new SadadClient(config);
}

// ---------------------------------------------------------------------------
// Webhook handler factory
// ---------------------------------------------------------------------------

export interface WebhookHandlerOptions {
  /**
   * Called when the webhook payload is valid and the payment succeeded
   * (transactionStatus === 3).
   */
  onSuccess?: (result: WebhookResult, req: NextRequest) => Promise<NextResponse | void>;
  /**
   * Called when the webhook payload is valid but the payment did NOT succeed.
   */
  onFailure?: (result: WebhookResult, req: NextRequest) => Promise<NextResponse | void>;
  /**
   * Called when signature verification or JSON parsing fails.
   * Defaults to returning HTTP 400.
   */
  onError?: (error: Error, req: NextRequest) => Promise<NextResponse | void>;
}

/**
 * Create a Next.js App Router POST handler for SADAD payment webhooks.
 *
 * The handler:
 * 1. Parses the incoming JSON body
 * 2. Verifies the checksumhash signature via the SADAD SDK
 * 3. Routes to `onSuccess` or `onFailure` based on transactionStatus
 * 4. Returns `{ status: 'success' }` to acknowledge receipt (as SADAD requires)
 *
 * @example
 * // app/api/sadad/webhook/route.ts
 * import { createWebhookHandler } from '@louis-innovations/sadad-nextjs/server';
 * export const POST = createWebhookHandler({
 *   onSuccess: async (result) => {
 *     await db.orders.updateStatus(result.orderNumber, 'paid');
 *   },
 * });
 */
export function createWebhookHandler(options: WebhookHandlerOptions = {}) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    let payload: WebhookPayload;

    try {
      payload = (await req.json()) as WebhookPayload;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Invalid JSON payload');
      if (options.onError) {
        const custom = await options.onError(error, req);
        if (custom) return custom;
      }
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    try {
      const client = buildClient();
      const result = client.handleWebhook(payload as Record<string, unknown>);

      if (result.isSuccess) {
        const custom = options.onSuccess ? await options.onSuccess(result, req) : undefined;
        if (custom) return custom;
      } else {
        const custom = options.onFailure ? await options.onFailure(result, req) : undefined;
        if (custom) return custom;
      }

      return NextResponse.json(SadadClient.webhookSuccessResponse(), { status: 200 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options.onError) {
        const custom = await options.onError(error, req);
        if (custom) return custom;
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Callback handler factory
// ---------------------------------------------------------------------------

export interface CallbackHandlerOptions {
  /** Callback (redirect) version — 'v1.1' | 'v2.1' | 'v2.2'. Defaults to 'v1.1'. */
  version?: CheckoutVersion;
  /**
   * Called when the callback is valid and the payment succeeded (RESPCODE === 1).
   * Return a NextResponse to override the default 200 JSON response (e.g. to
   * perform a server-side redirect).
   */
  onSuccess?: (result: CallbackResult, req: NextRequest) => Promise<NextResponse | void>;
  /**
   * Called when the callback is valid but the payment failed.
   */
  onFailure?: (result: CallbackResult, req: NextRequest) => Promise<NextResponse | void>;
  /**
   * Called when signature verification or body parsing fails.
   */
  onError?: (error: Error, req: NextRequest) => Promise<NextResponse | void>;
}

/**
 * Create a Next.js App Router POST handler for SADAD payment callbacks.
 *
 * SADAD POSTs to this URL after the customer completes (or abandons) payment.
 * The handler verifies the signature and routes to `onSuccess` or `onFailure`.
 *
 * @example
 * // app/api/sadad/callback/route.ts
 * import { createCallbackHandler } from '@louis-innovations/sadad-nextjs/server';
 * import { redirect } from 'next/navigation';
 * export const POST = createCallbackHandler({
 *   version: 'v1.1',
 *   onSuccess: async (result) => {
 *     await db.orders.markPaid(result.orderNumber);
 *     return NextResponse.redirect('/orders/success');
 *   },
 *   onFailure: async () => {
 *     return NextResponse.redirect('/orders/failed');
 *   },
 * });
 */
export function createCallbackHandler(options: CallbackHandlerOptions = {}) {
  const version: CheckoutVersion = options.version ?? 'v1.1';

  return async function POST(req: NextRequest): Promise<NextResponse> {
    let postData: CallbackPayload;

    // SADAD POSTs as application/x-www-form-urlencoded
    try {
      const contentType = req.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        postData = (await req.json()) as CallbackPayload;
      } else {
        const formData = await req.formData();
        const formEntries: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          formEntries[key] = value;
        });
        postData = formEntries as CallbackPayload;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to parse request body');
      if (options.onError) {
        const custom = await options.onError(error, req);
        if (custom) return custom;
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      const client = buildClient();
      const result = client.handleCallback(postData as Record<string, unknown>, version);

      if (result.isSuccess) {
        const custom = options.onSuccess ? await options.onSuccess(result, req) : undefined;
        if (custom) return custom;
      } else {
        const custom = options.onFailure ? await options.onFailure(result, req) : undefined;
        if (custom) return custom;
      }

      return NextResponse.json({
        success: result.isSuccess,
        orderNumber: result.orderNumber,
        transactionNumber: result.transactionNumber,
        amount: result.amount,
        responseCode: result.responseCode,
        status: result.status,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options.onError) {
        const custom = await options.onError(error, req);
        if (custom) return custom;
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  };
}
