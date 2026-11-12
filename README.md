# OBIX NET-LAB — Hacker Extreme Edition
**NETWORK INTELLIGENCE // DIAGNOSTICS // ANALYSIS**

Open-source network diagnostics workstation. React + TypeScript + Vite frontend, Vercel serverless functions backend, no database, no paid services.

> **Status:** v0.1 scaffold. The initial release has been validated with `npm install`, `npm run typecheck`, `npm test` (49 passing), and `npm run build`.

## Screenshots
Add your own after first run: `docs/screenshot-desktop.png`, `docs/screenshot-mobile.png`.

## Features
- **Overview** – public IPv4/IPv6, ISP, ASN, approximate location (5-min cache, source + timestamp shown), diagnostics summary, latency chart, live terminal.
- **DNS** – A/AAAA/CNAME/MX/NS/TXT/SOA over DNS-over-HTTPS (Google, Cloudflare, or side-by-side compare), TTLs, copy record, export JSON.
- **Latency Lab** – HTTP time-to-response via `performance.now()`, min/max/avg/median/jitter, success/failure counts, CORS status, stop button. *HTTP latency is not ICMP ping; no packet loss is reported.*
- **HTTP Diagnostics** – server-side GET/HEAD with redirect chain, headers, status, duration (SSRF-protected).
- **Route** – paste traceroute/tracert/mtr text, parse hops, table + bars, export JSON/CSV.
- **System** – backend health check, history, JSON/CSV export, clear history, settings (versioned LocalStorage with recovery).

Not included in v0.1: TLS metadata, IP-type classification, Tailwind/Framer Motion/Recharts (plain CSS + SVG used to keep the bundle tiny), ESLint/Prettier, Playwright E2E.

## Architecture
```
Browser (React) ──► DoH resolvers (dns.google, cloudflare-dns.com)
        │       ──► ipify / ipwho.is (fallback when no backend)
        └──► /api/health | /api/ip | /api/inspect-url  (Vercel Functions)
                                       └──► validated + IP-pinned outbound request
```
```
api/            health.ts ip.ts inspect-url.ts  _lib/ssrf.ts _lib/rate.ts
src/            App.tsx  modules/  components/  lib/  types.ts  styles.css
tests/          unit/  integration/
```

## Local installation
```bash
npm install
npm run typecheck
npm test
npm run dev          # frontend only (backend calls fall back or show "API not available")
npx vercel dev       # frontend + /api functions (needed for HTTP Diagnostics)
npm run build
```

## Environment variables
See `.env.example`. `INSPECT_RATE_LIMIT` (default 10 requests/min/IP). No secrets required.

## Deploy to Vercel
```bash
git init
git add .
git commit -m "feat: initial OBIX NET-LAB release"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY
git push -u origin main
```
Then on vercel.com: **Add New → Project → Import** the repository. Framework preset: *Vite* (build `npm run build`, output `dist`). Deploy. Check current Hobby plan limits (function duration, invocations) at vercel.com/docs/limits.

## API
| Endpoint | Description |
|---|---|
| `GET /api/health` | `{status, application, timestamp}` |
| `GET /api/ip` | `{ip, ipVersion, provider, country, region, city, asn, source, timestamp}` for the caller (via ipwho.is) |
| `POST /api/inspect-url` | body `{url, method: "GET"\|"HEAD"}` → `{requestedUrl, finalUrl, statusCode, responseTimeMs, responseHeaders, redirectChain, timestamp}` |

Errors: `{ "error": { "code", "message" } }` with 400/403/405/429/502/504. No stack traces are returned.

## Security limitations
See `SECURITY.md`. Rate limiting is in-memory per function instance (best effort). The IP-metadata provider (ipwho.is) is free but its terms and limits can change.

## Troubleshooting
- *HTTP Diagnostics says API not available* → use `npx vercel dev` or deploy.
- *Latency test fails on http:// URL* → browsers block mixed content from https pages.
- *CORS blocked* → the server is reachable but does not allow cross-origin reads; timing is still measured.
- *Import errors in api/ at runtime* → relative imports in `api/` must keep the `.js` extension.

## Contributing / License
See `CONTRIBUTING.md`. MIT License.
