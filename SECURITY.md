# Security Policy

## Reporting a vulnerability
Open a private security advisory on the GitHub repository (Security tab). Do not file public issues for vulnerabilities.

## Scope of `/api/inspect-url`
This is the only endpoint that makes outbound requests on behalf of a user. Protections: http/https only, ports 80/443 only, no credentials in URL, localhost/loopback/private/link-local/multicast/reserved/metadata ranges blocked (IPv4 and IPv6), DNS resolved server-side and validated, the validated IP is pinned for the outbound connection (DNS-rebinding protection), every redirect is re-validated (max 5), 10 s total deadline, response bodies are never read or returned, `Set-Cookie` is stripped, per-IP rate limiting.

## Known limitations
- Rate limiting is in-memory per serverless instance (best effort). For hard limits, use Vercel Firewall or a shared store.
- Do not point this tool at systems you do not own or have permission to test.
