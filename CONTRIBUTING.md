# Contributing

1. Fork and create a feature branch.
2. `npm install`, then `npm run typecheck && npm test` must pass.
3. Never add fabricated or random diagnostic data. Unavailable data must be shown as unavailable.
4. Any change to `api/_lib/ssrf.ts` needs tests in `tests/unit/ssrf.test.ts`.
5. Open a pull request with a clear description.
