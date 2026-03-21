// Built by Louis Innovations (www.louis-innovations.com)

// ---------------------------------------------------------------------------
// Types (safe to import from either server or client)
// ---------------------------------------------------------------------------
export type {
  SadadNextConfig,
  CheckoutVersion,
  SadadCheckoutActionResult,
  SadadCallbackActionResult,
  SadadRefundActionResult,
  WebhookPayload,
  CallbackPayload,
  SadadContextValue,
  // Re-exported SDK types
  SadadConfigOptions,
  Environment,
  Language,
  OrderData,
  OrderItem,
  CreateInvoiceData,
  InvoiceDetail,
  InvoiceFilters,
} from './types/index.js';

// ---------------------------------------------------------------------------
// Client components and hooks
// Note: 'use server' files (sadad-actions.ts) must be imported from
// '@louis-innovations/sadad-nextjs/server' — they cannot be barrel-exported
// from a shared entry point because the 'use server' directive must be at the
// top of the file that marks the server/client boundary.
// ---------------------------------------------------------------------------
export { SadadProvider } from './client/SadadProvider.js';
export type { SadadProviderProps } from './client/SadadProvider.js';

export { SadadCheckoutButton } from './client/SadadCheckoutButton.js';
export type { SadadCheckoutButtonProps } from './client/SadadCheckoutButton.js';

export { SadadEmbeddedCheckout } from './client/SadadEmbeddedCheckout.js';
export type { SadadEmbeddedCheckoutProps } from './client/SadadEmbeddedCheckout.js';

export { useSadad } from './client/useSadad.js';
export type { UseSadadReturn } from './client/useSadad.js';
