

## Evidence update — 2026-11-12

Implemented in commit `31212ff`: Capacitor Android shell, native SignalRadar bridge, browser honesty fallback, permission manifest/rationale, masked identifiers, OLED radar UI, TypeScript adapter, unit tests, Android Gradle workflow and documentation. `npm run lint`, `npm run typecheck`, `npm test` (57/57), `npm run build`, Capacitor sync and `./gradlew :app:assembleDebug --no-daemon` all passed after installing JDK 21 and Android SDK platform 35/build-tools 35.0.0. The debug APK is available from the build output and is intentionally not committed.

Still open: physical-device validation on Android/POCO X6 Pro; carrier/modem-specific dual-SIM and TelephonyCallback behavior; richer historical charts/congestion views; and any release signing/distribution configuration. These require a real device or release credentials and are not claimed as complete.
