# OBIX SIGNAL RADAR — Android guide

## What is real

The Android shell is a Capacitor application with a native `SignalRadar` plugin. Wi-Fi results come from `WifiManager.getScanResults()`, BLE results come from `BluetoothLeScanner` advertisements, and cellular snapshots come from `TelephonyManager.getAllCellInfo()` and the API fields exposed by the device. The web UI never fills missing values with estimates or random values.

The radar graphic is not a map. Dot placement is deterministic list visualization only. RSSI alone cannot infer direction, distance or coordinates.

## Build

Use a machine with Android Studio/Android SDK, JDK 17 or newer with a working `javac`, and an Android emulator or device:

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew :app:assembleDebug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`. In this branch, `./gradlew :app:assembleDebug --no-daemon` completed successfully after installing JDK 21 and Android SDK platform 35/build-tools 35.0.0. The resulting unsigned debug APK is `android/app/build/outputs/apk/debug/app-debug.apk` (4,171,256 bytes, SHA-256 `78c69ae6c9a6dff23c13dc5db8ecec89890dd550234c9134f735c1abb1e1fe3d`). This repository does not contain a keystore or signing key.

Install for local testing with Android Debug Bridge:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Runtime permissions

The app explains the reason before requesting each permission. Android 12+ uses `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` for BLE advertisements. Wi-Fi uses `ACCESS_FINE_LOCATION` and, on Android 13+, `NEARBY_WIFI_DEVICES` as required by the platform/device. Cellular uses `READ_PHONE_STATE` together with location when the device requires it for cell information.

The app does not request SMS, contacts, call log, microphone, camera or accessibility permissions. BSSID and BLE device IDs are masked by default in the UI. The bridge does not upload BSSID, BLE IDs, manufacturer data or cell information to the server.

## Browser/PWA behavior

The PWA continues to run without the native shell. A browser cannot call Android `WifiManager`, `BluetoothLeScanner` or `TelephonyManager`; the Radar screen therefore states that native hardware access is unavailable and shows empty states instead of fake measurements. Existing DNS, HTTP, route, toolkit and diagnostic features remain available.

## Device/API limitations

Wi-Fi scan results can be throttled by Android and may require system Location to be enabled. BLE advertisements may omit names and manufacturer data. Cellular fields vary by modem, SIM, carrier and Android vendor; the UI displays `—` when Android does not expose a value. Dual-SIM detail, `TelephonyCallback` streaming and some 5G fields require device/API support and are not asserted when unavailable.

Quality labels are approximate engineering thresholds for quick triage, not a carrier-certified standard. Test reports must distinguish TypeScript/Android compilation from physical-device validation. The sandbox verified native Java compilation and APK packaging, but no physical Android device or POCO X6 Pro was attached, so Wi-Fi/BLE/cellular hardware behavior remains unverified here.
