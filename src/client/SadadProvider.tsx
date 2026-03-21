'use client';
// Built by Louis Innovations (www.louis-innovations.com)

/**
 * SadadProvider
 *
 * Wrap your Next.js root layout (or a subtree) with this provider to give
 * all descendant client components access to SADAD configuration and
 * shared payment state via the `useSadad` hook.
 *
 * @example
 * // app/layout.tsx
 * import { SadadProvider } from '@louis-innovations/sadad-nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SadadProvider
 *           config={{
 *             merchantId: process.env.NEXT_PUBLIC_SADAD_MERCHANT_ID!,
 *             website: process.env.NEXT_PUBLIC_SADAD_WEBSITE!,
 *             environment: 'live',
 *             language: 'eng',
 *             callbackUrl: '/api/sadad/callback',
 *             webhookUrl: '/api/sadad/webhook',
 *             checkoutVersion: 'v1.1',
 *           }}
 *         >
 *           {children}
 *         </SadadProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  SadadNextConfig,
  SadadContextValue,
  SadadCheckoutActionResult,
  SadadCallbackActionResult,
  SadadRefundActionResult,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SadadContext = createContext<SadadContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface SadadProviderProps {
  /**
   * Public SADAD configuration.
   * Do NOT include `secretKey` here — it must only live in server-side
   * environment variables.
   */
  config: Omit<SadadNextConfig, 'secretKey'>;
  children: ReactNode;
}

/**
 * Context provider for SADAD payment integration.
 * Must be rendered in a Client Component tree (add "use client" to layout if needed).
 */
export function SadadProvider({ config, children }: SadadProviderProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<SadadCheckoutActionResult | null>(null);
  const [callbackResult, setCallbackResult] = useState<SadadCallbackActionResult | null>(null);
  const [refundResult, setRefundResult] = useState<SadadRefundActionResult | null>(null);

  const setLoading = useCallback((loading: boolean) => setIsLoading(loading), []);

  const value = useMemo<SadadContextValue>(
    () => ({
      config,
      isLoading,
      checkoutResult,
      callbackResult,
      refundResult,
      setLoading,
      setCheckoutResult,
      setCallbackResult,
      setRefundResult,
    }),
    [config, isLoading, checkoutResult, callbackResult, refundResult, setLoading],
  );

  return <SadadContext.Provider value={value}>{children}</SadadContext.Provider>;
}

// ---------------------------------------------------------------------------
// Internal hook (used by useSadad.ts and components)
// ---------------------------------------------------------------------------

/**
 * Returns the raw SadadContextValue.
 * @throws Error if called outside a <SadadProvider>.
 */
export function useSadadContext(): SadadContextValue {
  const ctx = useContext(SadadContext);
  if (!ctx) {
    throw new Error(
      'useSadad / SadadCheckoutButton must be rendered inside a <SadadProvider>.',
    );
  }
  return ctx;
}
