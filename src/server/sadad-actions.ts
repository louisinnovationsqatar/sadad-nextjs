'use server';
// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SADAD Next.js Server Actions
 *
 * Import these into your Next.js App Router server components or pass them
 * as action props to client components.
 *
 * All secrets (secretKey) are read from environment variables and never
 * leave the server boundary.
 *
 * Required environment variables:
 *   SADAD_MERCHANT_ID    - 7-digit merchant ID
 *   SADAD_SECRET_KEY     - SADAD secret key
 *   SADAD_WEBSITE        - website identifier registered with SADAD
 *   SADAD_ENVIRONMENT    - 'test' | 'live'  (default: 'test')
 *   SADAD_LANGUAGE       - 'eng' | 'arb'    (default: 'eng')
 *   SADAD_CALLBACK_URL   - absolute URL for payment callback
 *   SADAD_WEBHOOK_URL    - absolute URL for payment webhook
 */

import { SadadClient, SadadConfig } from '@louis-innovations/sadad-js-sdk';
import type { OrderData } from '@louis-innovations/sadad-js-sdk';
import type {
  CheckoutVersion,
  SadadCheckoutActionResult,
  SadadCallbackActionResult,
  SadadRefundActionResult,
  CallbackPayload,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Internal helpers
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

/**
 * Flatten nested checkout params into a Record<string, string> suitable for
 * use as hidden form fields.  Array entries are expanded to
 * `key[index][field]` notation matching SADAD's expected format.
 */
function flattenParams(
  params: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const fieldName = prefix === '' ? key : `${prefix}[${key}]`;

    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          Object.assign(out, flattenParams(item as Record<string, unknown>, `${fieldName}[${i}]`));
        } else {
          out[`${fieldName}[${i}]`] = String(item ?? '');
        }
      });
    } else if (value !== null && typeof value === 'object') {
      Object.assign(out, flattenParams(value as Record<string, unknown>, fieldName));
    } else {
      out[fieldName] = String(value ?? '');
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Create a SADAD checkout session.
 *
 * Returns the gateway URL and a flat params map that can be POSTed as hidden
 * form fields via a client-side form submit.
 *
 * @param orderData       Order details (order_id, amount, items, etc.)
 * @param version         Checkout version — 'v1.1' | 'v2.1' | 'v2.2'
 * @returns               { success, url, params } | { success: false, error }
 *
 * @example
 * const result = await createSadadCheckout({ order_id: 'ORD-001', amount: 50.00 });
 * if (result.success) {
 *   // result.url  = 'https://sadadqa.com/webpurchase'
 *   // result.params = { merchant_id: '...', signature: '...', ... }
 * }
 */
export async function createSadadCheckout(
  orderData: OrderData,
  version: CheckoutVersion = 'v1.1',
): Promise<SadadCheckoutActionResult> {
  try {
    const client = buildClient();
    const checkoutResult = client.checkout(orderData, version);

    return {
      success: true,
      url: checkoutResult.url,
      params: flattenParams(checkoutResult.params as Record<string, unknown>),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

/**
 * Process a SADAD payment callback (POST redirect back from the gateway).
 *
 * Call this from an API route or a server action bound to the callback URL.
 * The `postData` map should contain all fields from the incoming POST body.
 *
 * @param postData    Raw POST body fields
 * @param version     Callback version — 'v1.1' | 'v2.1' | 'v2.2'
 * @returns           CallbackResult fields + { success } flag
 *
 * @throws SignatureError  When signature/checksum verification fails
 *
 * @example
 * // app/api/sadad/callback/route.ts
 * export async function POST(req: Request) {
 *   const body = await req.formData();
 *   const postData = Object.fromEntries(body.entries());
 *   const result = await handleSadadCallback(postData as CallbackPayload);
 *   if (result.success) { ... }
 * }
 */
export async function handleSadadCallback(
  postData: CallbackPayload,
  version: CheckoutVersion = 'v1.1',
): Promise<SadadCallbackActionResult> {
  try {
    const client = buildClient();
    const result = client.handleCallback(postData as Record<string, unknown>, version);

    return {
      success: result.isSuccess,
      orderNumber: result.orderNumber,
      transactionNumber: result.transactionNumber,
      amount: result.amount,
      responseCode: result.responseCode,
      responseMessage: result.responseMessage,
      status: result.status,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

/**
 * Issue a full refund for a successfully completed SADAD transaction.
 *
 * @param transactionNumber   The SADAD transaction_number to refund
 * @returns                   { success, refundDetails } | { success: false, error }
 *
 * @example
 * const result = await processRefund('TXN-123456');
 * if (result.success) {
 *   console.log('Refund issued:', result.refundDetails);
 * }
 */
export async function processRefund(
  transactionNumber: string,
): Promise<SadadRefundActionResult> {
  try {
    const client = buildClient();
    const response = await client.refund(transactionNumber);

    if (!response['success']) {
      return {
        success: false,
        error: String(response['error'] ?? 'Refund request failed.'),
      };
    }

    return {
      success: true,
      refundDetails: (response['refund_details'] as Record<string, unknown>) ?? {},
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
