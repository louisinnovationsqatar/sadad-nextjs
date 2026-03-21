'use client';
// Built by Louis Innovations (www.louis-innovations.com)

/**
 * useSadad Hook
 *
 * Provides convenient access to SADAD payment state and action helpers.
 * Must be used inside a component tree wrapped by <SadadProvider>.
 *
 * @example
 * 'use client';
 * import { useSadad } from '@louis-innovations/sadad-nextjs';
 * import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';
 *
 * export function PayButton() {
 *   const { isLoading, checkoutResult, initiateCheckout } = useSadad();
 *
 *   return (
 *     <button onClick={() => initiateCheckout({ order_id: '001', amount: 50 })}>
 *       {isLoading ? 'Processing...' : 'Pay with SADAD'}
 *     </button>
 *   );
 * }
 */

import { useCallback } from 'react';
import { useSadadContext } from './SadadProvider.js';
import type {
  SadadCheckoutActionResult,
  SadadCallbackActionResult,
  SadadRefundActionResult,
  SadadContextValue,
  SadadNextConfig,
} from '../types/index.js';
import type { OrderData } from '@louis-innovations/sadad-js-sdk';

export interface UseSadadReturn {
  /** The public SADAD config passed to <SadadProvider> */
  config: Omit<SadadNextConfig, 'secretKey'>;
  /** True while any SADAD action is in-flight */
  isLoading: boolean;
  /** Result from the most recent createSadadCheckout call */
  checkoutResult: SadadCheckoutActionResult | null;
  /** Result from the most recent handleSadadCallback call */
  callbackResult: SadadCallbackActionResult | null;
  /** Result from the most recent processRefund call */
  refundResult: SadadRefundActionResult | null;
  /**
   * Initiate a checkout by calling the provided server action.
   * Automatically manages `isLoading` state and stores the result.
   *
   * @param orderData     Order data to pass to the server action
   * @param serverAction  The `createSadadCheckout` server action (or a wrapper)
   * @returns             The checkout result
   */
  initiateCheckout: (
    orderData: OrderData,
    serverAction: (orderData: OrderData) => Promise<SadadCheckoutActionResult>,
  ) => Promise<SadadCheckoutActionResult>;
  /**
   * Process a payment callback by calling the provided server action.
   * Automatically manages `isLoading` state and stores the result.
   */
  processCallback: (
    postData: Record<string, unknown>,
    serverAction: (postData: Record<string, unknown>) => Promise<SadadCallbackActionResult>,
  ) => Promise<SadadCallbackActionResult>;
  /**
   * Initiate a refund by calling the provided server action.
   * Automatically manages `isLoading` state and stores the result.
   */
  initiateRefund: (
    transactionNumber: string,
    serverAction: (transactionNumber: string) => Promise<SadadRefundActionResult>,
  ) => Promise<SadadRefundActionResult>;
  /** Manually reset all result states */
  reset: () => void;
}

/**
 * Hook for SADAD payment state and action helpers.
 * Requires <SadadProvider> in the component tree.
 */
export function useSadad(): UseSadadReturn {
  const ctx: SadadContextValue = useSadadContext();

  const initiateCheckout = useCallback(
    async (
      orderData: OrderData,
      serverAction: (orderData: OrderData) => Promise<SadadCheckoutActionResult>,
    ): Promise<SadadCheckoutActionResult> => {
      ctx.setLoading(true);
      ctx.setCheckoutResult(null);

      try {
        const result = await serverAction(orderData);
        ctx.setCheckoutResult(result);
        return result;
      } finally {
        ctx.setLoading(false);
      }
    },
    [ctx],
  );

  const processCallback = useCallback(
    async (
      postData: Record<string, unknown>,
      serverAction: (postData: Record<string, unknown>) => Promise<SadadCallbackActionResult>,
    ): Promise<SadadCallbackActionResult> => {
      ctx.setLoading(true);
      ctx.setCallbackResult(null);

      try {
        const result = await serverAction(postData);
        ctx.setCallbackResult(result);
        return result;
      } finally {
        ctx.setLoading(false);
      }
    },
    [ctx],
  );

  const initiateRefund = useCallback(
    async (
      transactionNumber: string,
      serverAction: (transactionNumber: string) => Promise<SadadRefundActionResult>,
    ): Promise<SadadRefundActionResult> => {
      ctx.setLoading(true);
      ctx.setRefundResult(null);

      try {
        const result = await serverAction(transactionNumber);
        ctx.setRefundResult(result);
        return result;
      } finally {
        ctx.setLoading(false);
      }
    },
    [ctx],
  );

  const reset = useCallback(() => {
    ctx.setCheckoutResult(null);
    ctx.setCallbackResult(null);
    ctx.setRefundResult(null);
    ctx.setLoading(false);
  }, [ctx]);

  return {
    config: ctx.config,
    isLoading: ctx.isLoading,
    checkoutResult: ctx.checkoutResult,
    callbackResult: ctx.callbackResult,
    refundResult: ctx.refundResult,
    initiateCheckout,
    processCallback,
    initiateRefund,
    reset,
  };
}
