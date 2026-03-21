'use client';
// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SadadEmbeddedCheckout
 *
 * Renders the SADAD v2.2 secure embedded checkout inside an <iframe>.
 *
 * The component:
 * 1. Calls `createSadadCheckout` server action with version='v2.2'
 * 2. Injects a hidden POST form targeting the iframe
 * 3. Submits the form to load the secure checkout inside the iframe
 * 4. Exposes `onPaymentComplete` callback for iframe postMessage events
 *
 * @example
 * import { SadadEmbeddedCheckout } from '@louis-innovations/sadad-nextjs';
 * import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';
 *
 * export default function CheckoutPage() {
 *   return (
 *     <SadadEmbeddedCheckout
 *       orderData={{ order_id: 'ORD-001', amount: 150.00 }}
 *       checkoutAction={createSadadCheckout}
 *       onPaymentComplete={(event) => console.log('Payment event:', event)}
 *     />
 *   );
 * }
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSadadContext } from './SadadProvider.js';
import type { SadadCheckoutActionResult } from '../types/index.js';
import type { OrderData } from '@louis-innovations/sadad-js-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SadadEmbeddedCheckoutProps {
  /** Order data for the checkout */
  orderData: OrderData;
  /**
   * The `createSadadCheckout` server action.
   * Import from `@louis-innovations/sadad-nextjs/server`.
   */
  checkoutAction: (
    orderData: OrderData,
    version: 'v2.2',
  ) => Promise<SadadCheckoutActionResult>;
  /** iframe width. Defaults to '100%'. */
  width?: string | number;
  /** iframe height. Defaults to '600px'. */
  height?: string | number;
  /** Extra className applied to the iframe wrapper div */
  className?: string;
  /** Inline styles applied to the iframe wrapper div */
  style?: React.CSSProperties;
  /**
   * Called when a message is received from the SADAD iframe (postMessage).
   * The raw MessageEvent is forwarded — inspect `event.data` for status.
   */
  onPaymentComplete?: (event: MessageEvent) => void;
  /**
   * Called if the server action or frame setup fails.
   */
  onError?: (error: string) => void;
  /** Content to show while the checkout is loading */
  loadingContent?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const IFRAME_NAME = 'sadad-embedded-checkout-frame';

/**
 * SADAD v2.2 embedded checkout iframe component.
 */
export function SadadEmbeddedCheckout({
  orderData,
  checkoutAction,
  width = '100%',
  height = '600px',
  className,
  style,
  onPaymentComplete,
  onError,
  loadingContent,
}: SadadEmbeddedCheckoutProps): React.JSX.Element {
  const ctx = useSadadContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Listen for postMessage events from the SADAD iframe
  useEffect(() => {
    if (!onPaymentComplete) return;

    const listener = (event: MessageEvent) => {
      // Only process messages from the SADAD gateway domains
      if (
        typeof event.origin === 'string' &&
        (event.origin.includes('sadadqa.com') || event.origin.includes('sadad.qa'))
      ) {
        onPaymentComplete(event);
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onPaymentComplete]);

  // Initiate the checkout on mount
  const initCheckout = useCallback(async () => {
    ctx.setLoading(true);
    ctx.setCheckoutResult(null);
    setHasError(false);

    try {
      const result = await checkoutAction(orderData, 'v2.2');
      ctx.setCheckoutResult(result);

      if (!result.success || !result.url || !result.params) {
        const message = result.error ?? 'Embedded checkout initialisation failed.';
        setHasError(true);
        if (onError) {
          onError(message);
        } else {
          console.error('[SadadEmbeddedCheckout]', message);
        }
        return;
      }

      // Build a hidden form targeting the named iframe and submit it
      if (formRef.current) {
        const form = formRef.current;
        form.action = result.url;
        form.method = 'POST';
        form.target = IFRAME_NAME;

        // Clear any existing inputs
        while (form.firstChild) form.removeChild(form.firstChild);

        for (const [name, value] of Object.entries(result.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }

        form.submit();
        setIsReady(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setHasError(true);
      if (onError) {
        onError(message);
      } else {
        console.error('[SadadEmbeddedCheckout]', message);
      }
    } finally {
      ctx.setLoading(false);
    }
  }, [ctx, orderData, checkoutAction, onError]);

  useEffect(() => {
    initCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className} style={style}>
      {/* Hidden form targets the named iframe */}
      <form
        ref={formRef}
        style={{ display: 'none' }}
        method="POST"
        target={IFRAME_NAME}
      />

      {/* Loading state */}
      {ctx.isLoading && !isReady && (
        <div aria-live="polite" aria-label="Loading SADAD checkout">
          {loadingContent ?? <p>Loading secure checkout...</p>}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div role="alert" aria-label="Checkout error">
          <p>Failed to load the SADAD checkout. Please try again.</p>
        </div>
      )}

      {/* The embedded checkout iframe */}
      <iframe
        ref={iframeRef}
        name={IFRAME_NAME}
        title="SADAD Secure Checkout"
        width={width}
        height={height}
        style={{ border: 'none', display: isReady ? 'block' : 'none' }}
        sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
        aria-label="SADAD Secure Payment Checkout"
      />
    </div>
  );
}
