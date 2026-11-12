# OBIX NET-LAB X — Implementation Plan

## Product direction

Three possible directions considered: OLED cyber-operations workstation (0.06), field technician instrument panel (0.08), and minimal developer console (0.04). Chosen: **OLED cyber-operations workstation**.

Design movement: restrained black-ops instrumentation with neon green/cyan signal accents.

Core principles: real measurements only; mobile-first thumb reach; dense but readable technical hierarchy; offline-first utilities with explicit online boundaries.

Color philosophy: OLED black and graphite reduce battery and visual noise; green means verified/healthy, cyan means active measurement, amber means limitation or consent required, red means failure or blocked operation.

Layout paradigm: a command-center flow with a primary status hero, bottom navigation on mobile, and progressive disclosure into diagnostic workbenches rather than a desktop sidebar squeezed onto a phone.

Signature elements: radar mark, measurement signal line, and compact terminal event stream.

Interaction philosophy: one primary action per screen, immediate honest state transitions, no decorative controls without behavior, and explicit Stop/consent/offline states.

Animation: short signal transitions only, pause when hidden, respect prefers-reduced-motion, never flash continuously.

Typography: system sans for headings and UI labels; monospace for measurements, addresses, logs and code-like data.

Brand essence: a portable network command center for Android technicians and curious builders; precise, honest, field-ready.

Brand voice: direct and technical. Example lines: “CONTROL YOUR CONNECTION.” and “REAL SIGNALS. NO FABRICATED DATA.”

Wordmark & logo: OBIX wordmark paired with a circular radar sweep mark.

Signature brand color: #39FF88 neon signal green.

## Implementation

- Preserve existing API endpoints, DNS logic, SSRF validation, IP pinning and legacy diagnostic modules.
- Add schema-versioned LocalStorage fields for language, privacy consent, diagnostic reports and toolkit/doctor history without removing existing events or latency samples.
- Add mobile-first application shell with HOME, DIAGNOSE, DNS, TOOLKIT and HISTORY navigation; retain advanced HTTP/Route/System tools within Diagnose.
- Add real offline Toolkit utilities: IPv4/CIDR, conversion, domain/URL validation, JSON formatting, URL/base64, SHA-256 and HTTP status reference.
- Add deterministic local Connection Doctor rules for Wi-Fi/mobile/VPN symptoms, with Android and POCO X6 Pro guidance.
- Add a real full-diagnostics workflow using `/api/health`, browser HTTP timing, DoH and existing IP availability; no ICMP or fabricated data.
- Gate external IP metadata behind explicit local privacy consent and show approximate-location wording.
- Add PWA manifest, icons, service worker, offline shell caching and update notice; never cache API responses.
- Add Thai default and English switcher with persisted choice for shell and new modules.
- Add GitHub Actions CI and unit tests for new pure utilities.

## Project structure

`src/modules/Toolkit.tsx` owns offline tools; `src/modules/Doctor.tsx` owns local troubleshooting rules; `src/modules/Diagnose.tsx` owns the one-tap real workflow and links to existing HTTP/Route/System workbenches; `src/modules/History.tsx` owns local report/history export and deletion; `src/lib/toolkit.ts`, `doctor.ts`, `diagnostics.ts` contain pure/testable logic; `public/` owns PWA assets; `.github/workflows/ci.yml` owns checks.

## Known platform limits

Browser code cannot run ICMP, cellular-radio measurements, OS traceroute, or Android settings changes. Production Vercel in-memory rate limiting remains best effort without a shared store. Vercel preview/deploy permissions must be verified separately.
