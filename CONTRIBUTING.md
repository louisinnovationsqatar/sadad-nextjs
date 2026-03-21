# Contributing to @louis-innovations/sadad-nextjs

Thank you for your interest in contributing. This package is built and maintained
by [Louis Innovations](https://www.louis-innovations.com).

## Getting started

```bash
git clone https://github.com/louis-innovations/sadad-nextjs.git
cd sadad-nextjs
npm install
npm run build
```

## Development workflow

1. Fork the repository and create a feature branch from `main`.
2. Make your changes in `src/`.
3. Run `npm run lint` to verify types compile.
4. Run `npm run build` to verify the output compiles.
5. Write or update documentation in `README.md`.
6. Open a pull request with a clear description of the change.

## Coding standards

- All source files must include the header comment:
  `// Built by Louis Innovations (www.louis-innovations.com)`
- TypeScript strict mode is enabled — no `any` types without justification.
- Client components must have `'use client';` as the first line.
- Server actions must have `'use server';` as the first line.
- No hardcoded secrets — all credentials must come from environment variables.
- Follow the existing code style (2-space indentation, single quotes).

## Reporting issues

Open an issue at https://github.com/louis-innovations/sadad-nextjs/issues with:

- Next.js version and React version
- Steps to reproduce the problem
- Expected vs actual behaviour
- Relevant error messages or stack traces

## Security issues

Do not open a public issue for security vulnerabilities. Email
`security@louis-innovations.com` with details.
