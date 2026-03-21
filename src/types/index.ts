// Built by Louis Innovations (www.louis-innovations.com)

import type { Environment, Language } from '@louis-innovations/sadad-js-sdk';

// ---------------------------------------------------------------------------
// Re-exported SDK types
// ---------------------------------------------------------------------------
export type {
  SadadConfigOptions,
  Environment,
  Language,
} from '@louis-innovations/sadad-js-sdk';

export type { OrderData, OrderItem } from '@louis-innovations/sadad-js-sdk';

export type {
  CreateInvoiceData,
  InvoiceDetail,
  InvoiceFilters,
} from '@louis-innovations/sadad-js-sdk';

// ---------------------------------------------------------------------------
// Next.js package-specific types
// ---------------------------------------------------------------------------

/** Options forwarded to the SadadConfig constructor plus the checkout version */
export interface SadadNextConfig {
  /** 7-digit SADAD merchant ID */
  merchantId: string;
  /** SADAD secret key */
  secretKey: string;
  /** Merchant website identifier registered with SADAD */
  website: string;
  /** 'test' | 'live' — defaults to 'test' */
  environment?: Environment;
  /** 'eng' | 'arb' — defaults to 'eng' */
  language?: Language;
  /** Absolute URL that SADAD will POST the payment result back to */
  callbackUrl?: string;
  /** Absolute URL that SADAD will POST the payment webhook to */
  webhookUrl?: string;
  /** Default checkout version — 'v1.1' | 'v2.1' | 'v2.2' (defaults to 'v1.1') */
  checkoutVersion?: CheckoutVersion;
}

export type CheckoutVersion = 'v1.1' | 'v2.1' | 'v2.2';

// ---------------------------------------------------------------------------
// Server-action result shapes
// ---------------------------------------------------------------------------

export interface SadadCheckoutActionResult {
  /** Whether the action succeeded */
  success: boolean;
  /** SADAD gateway URL to POST to */
  url?: string;
  /** Hidden form fields to post (flat key/value pairs) */
  params?: Record<string, string>;
  /** Error message when success is false */
  error?: string;
}

export interface SadadCallbackActionResult {
  /** Whether the payment was successful (RESPCODE === 1) */
  success: boolean;
  /** Merchant order number */
  orderNumber?: string;
  /** SADAD transaction number */
  transactionNumber?: string;
  /** Transaction amount */
  amount?: number;
  /** Raw response code from SADAD */
  responseCode?: string;
  /** Human-readable status message */
  responseMessage?: string;
  /** Transaction status string */
  status?: string;
  /** Error message when the action itself fails */
  error?: string;
}

export interface SadadRefundActionResult {
  /** Whether the refund request succeeded */
  success: boolean;
  /** Raw refund details from SADAD */
  refundDetails?: Record<string, unknown>;
  /** Error message when success is false */
  error?: string;
}

// ---------------------------------------------------------------------------
// Webhook / callback API-route payloads
// ---------------------------------------------------------------------------

export interface WebhookPayload {
  transactionStatus?: number | string;
  message?: string;
  transaction_number?: string;
  ORDER_ID?: string;
  TXN_AMOUNT?: number | string;
  merchant_id?: string;
  isTestMode?: boolean | string;
  invoiceNumber?: string;
  checksumhash?: string;
  [key: string]: unknown;
}

export interface CallbackPayload {
  ORDERID?: string;
  transaction_number?: string;
  TXNAMOUNT?: number | string;
  RESPCODE?: string | number;
  RESPMSG?: string;
  STATUS?: string;
  checksumhash?: string;
  signature?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Provider context
// ---------------------------------------------------------------------------

export interface SadadContextValue {
  /** Next.js package config (without secrets — safe to read client-side) */
  config: Omit<SadadNextConfig, 'secretKey'>;
  /** Whether a payment action is in-flight */
  isLoading: boolean;
  /** Most recent checkout action result */
  checkoutResult: SadadCheckoutActionResult | null;
  /** Most recent callback action result */
  callbackResult: SadadCallbackActionResult | null;
  /** Most recent refund action result */
  refundResult: SadadRefundActionResult | null;
  /** Update the loading state (used internally by hooks) */
  setLoading: (loading: boolean) => void;
  /** Store the latest checkout result */
  setCheckoutResult: (result: SadadCheckoutActionResult | null) => void;
  /** Store the latest callback result */
  setCallbackResult: (result: SadadCallbackActionResult | null) => void;
  /** Store the latest refund result */
  setRefundResult: (result: SadadRefundActionResult | null) => void;
}
