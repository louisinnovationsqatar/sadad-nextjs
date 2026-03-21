# @louis-innovations/sadad-nextjs

Next.js 13+ integration package for the SADAD Payment Gateway (Qatar).

Wraps [`@louis-innovations/sadad-js-sdk`](https://github.com/louis-innovations/sadad-js-sdk)
with Next.js App Router server actions, React client components, and drop-in
API route handlers.

Built by [Louis Innovations](https://www.louis-innovations.com).

---

## Features

- **Server Actions** — `createSadadCheckout`, `handleSadadCallback`, `processRefund`
- **API Route Handlers** — `createWebhookHandler`, `createCallbackHandler`
- **React Components** — `SadadProvider`, `SadadCheckoutButton`, `SadadEmbeddedCheckout`
- **React Hook** — `useSadad` for payment state management
- **Middleware** — webhook signature verification utilities
- Full TypeScript support
- Supports Next.js 13, 14, and 15 (App Router)

---

## Installation

```bash
npm install @louis-innovations/sadad-nextjs @louis-innovations/sadad-js-sdk
```

---

## Environment variables

Add these to your `.env.local` (never commit secrets to version control):

```env
# Required
SADAD_MERCHANT_ID=1234567
SADAD_SECRET_KEY=your_secret_key
SADAD_WEBSITE=WEBSITE_ID

# Optional — defaults shown
SADAD_ENVIRONMENT=test
SADAD_LANGUAGE=eng
SADAD_CALLBACK_URL=https://yourdomain.com/api/sadad/callback
SADAD_WEBHOOK_URL=https://yourdomain.com/api/sadad/webhook

# Public config (safe to expose to the browser)
NEXT_PUBLIC_SADAD_MERCHANT_ID=1234567
NEXT_PUBLIC_SADAD_WEBSITE=WEBSITE_ID
```

---

## Setup: SadadProvider in layout.tsx

Wrap your root layout with `SadadProvider` to enable all client components and
the `useSadad` hook. Only public (non-secret) config belongs here.

```tsx
// app/layout.tsx
import { SadadProvider } from '@louis-innovations/sadad-nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SadadProvider
          config={{
            merchantId: process.env.NEXT_PUBLIC_SADAD_MERCHANT_ID!,
            website: process.env.NEXT_PUBLIC_SADAD_WEBSITE!,
            environment: 'live',
            language: 'eng',
            callbackUrl: '/api/sadad/callback',
            checkoutVersion: 'v1.1',
          }}
        >
          {children}
        </SadadProvider>
      </body>
    </html>
  );
}
```

---

## SadadCheckoutButton

The simplest way to start a checkout. The button calls the `createSadadCheckout`
server action and auto-submits a hidden POST form to the SADAD gateway.

```tsx
// app/cart/page.tsx  (server component)
import { SadadCheckoutButton } from '@louis-innovations/sadad-nextjs';
import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';

export default function CartPage() {
  return (
    <SadadCheckoutButton
      orderData={{
        order_id: 'ORD-001',
        amount: 150.00,
        mobile: '97412345678',
        email: 'customer@example.com',
        items: [
          { order_id: 'ITEM-001', amount: 150.00, quantity: 1 },
        ],
      }}
      checkoutAction={createSadadCheckout}
      version="v1.1"
      label="Pay QAR 150 with SADAD"
      loadingLabel="Processing..."
      onError={(err) => console.error('Checkout error:', err)}
      className="btn btn-primary"
    />
  );
}
```

---

## Server Actions

Import server actions in Server Components, or pass them as props to Client
Components. They are never bundled into the client JS.

```ts
// app/checkout/actions.ts
'use server';
import {
  createSadadCheckout,
  handleSadadCallback,
  processRefund,
} from '@louis-innovations/sadad-nextjs/server';

// createSadadCheckout
const result = await createSadadCheckout(
  { order_id: 'ORD-001', amount: 50.00 },
  'v1.1', // 'v1.1' | 'v2.1' | 'v2.2'
);

if (result.success) {
  // result.url    — gateway URL
  // result.params — flat key/value object of hidden form fields
}

// handleSadadCallback
const callback = await handleSadadCallback(postData, 'v1.1');
if (callback.success) {
  console.log('Paid order:', callback.orderNumber);
}

// processRefund
const refund = await processRefund('TXN-123456');
if (refund.success) {
  console.log('Refund details:', refund.refundDetails);
}
```

---

## API Route Setup: Webhook and Callback

### Webhook — app/api/sadad/webhook/route.ts

```ts
import { createWebhookHandler } from '@louis-innovations/sadad-nextjs/server';

export const POST = createWebhookHandler({
  onSuccess: async (result) => {
    // result.orderNumber, result.transactionNumber, result.amount, etc.
    await db.orders.markPaid(result.orderNumber);
    // Return void to send the default { status: 'success' } response
  },
  onFailure: async (result) => {
    await db.orders.markFailed(result.orderNumber);
  },
  onError: async (error) => {
    console.error('Webhook error:', error.message);
    // Return void to send HTTP 400
  },
});
```

### Callback — app/api/sadad/callback/route.ts

```ts
import { createCallbackHandler } from '@louis-innovations/sadad-nextjs/server';
import { NextResponse } from 'next/server';

export const POST = createCallbackHandler({
  version: 'v1.1', // match your checkout version
  onSuccess: async (result, req) => {
    await db.orders.markPaid(result.orderNumber);
    return NextResponse.redirect(new URL('/orders/success', req.url));
  },
  onFailure: async (result, req) => {
    return NextResponse.redirect(new URL('/orders/failed', req.url));
  },
});
```

---

## useSadad Hook

```tsx
'use client';
import { useSadad } from '@louis-innovations/sadad-nextjs';
import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';

export function CustomPayButton({ orderId, amount }: { orderId: string; amount: number }) {
  const { isLoading, checkoutResult, initiateCheckout, reset } = useSadad();

  const handlePay = async () => {
    const result = await initiateCheckout(
      { order_id: orderId, amount },
      createSadadCheckout,
    );

    if (result.success && result.url && result.params) {
      // Manually submit or redirect as needed
    }
  };

  return (
    <div>
      <button onClick={handlePay} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Pay with SADAD'}
      </button>
      {checkoutResult?.error && <p>{checkoutResult.error}</p>}
    </div>
  );
}
```

---

## Embedded Checkout (v2.2)

```tsx
import { SadadEmbeddedCheckout } from '@louis-innovations/sadad-nextjs';
import { createSadadCheckout } from '@louis-innovations/sadad-nextjs/server';

export default function EmbeddedPage() {
  return (
    <SadadEmbeddedCheckout
      orderData={{ order_id: 'ORD-002', amount: 99.50 }}
      checkoutAction={createSadadCheckout}
      width="100%"
      height="700px"
      onPaymentComplete={(event) => {
        console.log('Payment event data:', event.data);
      }}
      onError={(err) => console.error(err)}
    />
  );
}
```

---

## Webhook Verification Middleware

```ts
// app/api/sadad/webhook/route.ts (manual verification approach)
import {
  withSadadWebhookVerification,
} from '@louis-innovations/sadad-nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  const payload = JSON.parse(req.headers.get('x-sadad-parsed-body') ?? '{}');
  // ... process verified payload
  return NextResponse.json({ status: 'success' });
}

export const POST = withSadadWebhookVerification(handler);
```

---

## Checkout Versions

| Version | Description |
|---------|-------------|
| `v1.1`  | Standard web checkout with SHA-256 signature |
| `v2.1`  | Web checkout with AES-128-CBC checksumhash |
| `v2.2`  | Embedded (iframe) secure checkout — use with `SadadEmbeddedCheckout` |

---

## Links

- [SADAD Developer Documentation](https://www.sadadqa.com)
- [sadad-js-sdk](https://github.com/louis-innovations/sadad-js-sdk)
- [Louis Innovations](https://www.louis-innovations.com)
- [Report an issue](https://github.com/louis-innovations/sadad-nextjs/issues)

---

Built by [Louis Innovations](https://www.louis-innovations.com)
