# Changelog

All notable changes to `@louis-innovations/sadad-nextjs` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-21

### Added

- Initial release wrapping `@louis-innovations/sadad-js-sdk`
- `createSadadCheckout` server action
- `handleSadadCallback` server action
- `processRefund` server action
- `createWebhookHandler` App Router webhook handler factory
- `createCallbackHandler` App Router callback handler factory
- `withSadadWebhookVerification` middleware wrapper
- `verifySadadWebhookSignature` and `safeVerifySadadWebhookSignature` utilities
- `isSadadGatewayRequest` IP allowlist helper
- `SadadProvider` React context provider
- `SadadCheckoutButton` client component (auto-submit POST form)
- `SadadEmbeddedCheckout` iframe component for v2.2
- `useSadad` React hook
- Full TypeScript types for all SADAD data structures
- Support for checkout versions v1.1, v2.1, and v2.2
- Compatible with Next.js 13, 14, and 15 (App Router)
