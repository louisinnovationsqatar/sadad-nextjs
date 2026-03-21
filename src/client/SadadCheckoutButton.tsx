'use client';
// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SadadCheckoutButton
 *
 * A "Pay with SADAD" button that calls the `createSadadCheckout` server
 * action, then programmatically POSTs a form to the SADAD gateway.
 *
 * The form is dynamically built from the returned params and submitted
 * immediately, so there is no need for a server-rendered hidden form.
 *
 * @example
 * import { SadadCheckoutButton } from '@louis-innovations/sadad-nextjs';
 * import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';
 *
 * export default function CartPage() {
 *   return (
 *     <SadadCheckoutButton
 *       orderData={{ order_id: 'ORD-001', amount: 150.00 }}
 *       checkoutAction={createSadadCheckout}
 *       version="v1.1"
 *       label="Pay QAR 150 with SADAD"
 *     />
 *   );
 * }
 */

import React, { useCallback, useRef, type ButtonHTMLAttributes } from 'react';
import { useSadadContext } from './SadadProvider.js';
import type { CheckoutVersion, SadadCheckoutActionResult } from '../types/index.js';
import type { OrderData } from '@louis-innovations/sadad-js-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SadadCheckoutButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'onError'> {
  /** Order data to send to the SADAD gateway */
  orderData: OrderData;
  /**
   * The `createSadadCheckout` server action (or a wrapper bound to a
   * specific version).  Import from `@louis-innovations/sadad-nextjs/server`.
   */
  checkoutAction: (
    orderData: OrderData,
    version?: CheckoutVersion,
  ) => Promise<SadadCheckoutActionResult>;
  /** Checkout version — 'v1.1' | 'v2.1' | 'v2.2'. Defaults to 'v1.1'. */
  version?: CheckoutVersion;
  /** Button label. Defaults to 'Pay with SADAD'. */
  label?: string;
  /** Label to show while the action is in-flight. Defaults to 'Processing...'. */
  loadingLabel?: string;
  /**
   * Called when the server action returns an error (before the form is
   * submitted).  If not provided the error is logged to the console.
   */
  onError?: (error: string) => void;
  /**
   * Called just before the auto-submit form is injected into the DOM.
   * Return `false` to abort the redirect (e.g. for custom handling).
   */
  onBeforeRedirect?: (result: SadadCheckoutActionResult) => boolean | void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * "Pay with SADAD" button component.
 *
 * Calls the provided server action, then auto-submits a hidden form to the
 * SADAD gateway with all required parameters.
 */
export function SadadCheckoutButton({
  orderData,
  checkoutAction,
  version = 'v1.1',
  label = 'Pay with SADAD',
  loadingLabel = 'Processing...',
  onError,
  onBeforeRedirect,
  disabled,
  className,
  style,
  children,
  ...rest
}: SadadCheckoutButtonProps): React.JSX.Element {
  const ctx = useSadadContext();
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleClick = useCallback(async () => {
    if (ctx.isLoading) return;

    ctx.setLoading(true);
    ctx.setCheckoutResult(null);

    try {
      const result = await checkoutAction(orderData, version);
      ctx.setCheckoutResult(result);

      if (!result.success || !result.url || !result.params) {
        const message = result.error ?? 'Checkout failed. Please try again.';
        if (onError) {
          onError(message);
        } else {
          console.error('[SadadCheckoutButton]', message);
        }
        return;
      }

      // Allow caller to intercept before redirect
      if (onBeforeRedirect) {
        const proceed = onBeforeRedirect(result);
        if (proceed === false) return;
      }

      // Programmatically build and submit a hidden POST form
      submitCheckoutForm(result.url, result.params);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (onError) {
        onError(message);
      } else {
        console.error('[SadadCheckoutButton]', message);
      }
    } finally {
      ctx.setLoading(false);
    }
  }, [ctx, orderData, checkoutAction, version, onError, onBeforeRedirect]);

  const isDisabled = disabled || ctx.isLoading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      style={style}
      aria-busy={ctx.isLoading}
      aria-label={ctx.isLoading ? loadingLabel : label}
      {...rest}
    >
      {children ?? (ctx.isLoading ? loadingLabel : label)}
      {/* Hidden form anchor — submitted programmatically */}
      <form ref={formRef} style={{ display: 'none' }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Build a hidden form with the given params and auto-submit it to `url`.
 * The form is appended to `document.body` and removed after submission.
 */
function submitCheckoutForm(url: string, params: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();

  // Cleanup after a short delay to allow the browser to start navigation
  setTimeout(() => {
    if (document.body.contains(form)) {
      document.body.removeChild(form);
    }
  }, 500);
}
