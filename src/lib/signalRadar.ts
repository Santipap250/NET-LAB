import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type SignalQuality = "excellent" | "good" | "fair" | "weak" | "unknown";
export interface RadarCapabilities { native: boolean; apiLevel: number | null; wifi: boolean; ble: boolean; cellular: boolean; supportsTelephonyCallback: boolean; }
export interface WifiObservation { ssid: string; bssid: string; rssiDbm: number; frequencyMhz: number; channel: number; band: string; security: string; seenAt: number; }
export interface BleObservation { deviceId: string; name: string | null; rssiDbm: number; manufacturerData?: number[] | null; seenAt: number; }
export interface CellObservation { registered: boolean; technology: string; rssiDbm?: number; rsrpDbm?: number; rsrqDb?: number; sinrDb?: number; pci?: number; tac?: number; arfcn?: number; }
export interface CellularSnapshot { carrier: string; networkType: string; simState: number; apiLevel: number; seenAt: number; cells: CellObservation[]; }
interface SignalRadarPlugin { getCapabilities(): Promise<RadarCapabilities>; requestPermission(options: { alias: string }): Promise<{ alias: string; granted: boolean }>; startWifiScan(): Promise<{ updated: boolean; scannedAt: number; networks: WifiObservation[] }>; stopWifiScan(): Promise<void>; startBleScan(): Promise<void>; stopBleScan(): Promise<void>; getCellularInfo(): Promise<CellularSnapshot>; addListener(eventName: "bleAdvertisement", listener: (event: BleObservation) => void): Promise<PluginListenerHandle>; addListener(eventName: "bleScanError", listener: (event: { errorCode: number }) => void): Promise<PluginListenerHandle>; }
export const SignalRadar = registerPlugin<SignalRadarPlugin>("SignalRadar");
export const isNativeRadar = () => Capacitor.isNativePlatform();
export const browserCapabilities: RadarCapabilities = { native: false, apiLevel: null, wifi: false, ble: false, cellular: false, supportsTelephonyCallback: false };
export function maskIdentifier(value: string): string { if (!value) return "—"; if (value.includes(":")) return value.split(":").slice(0, 3).join(":") + ":••:••:••"; return value.length <= 6 ? "••••" : `${value.slice(0, 3)}••••${value.slice(-2)}`; }
export function signalQuality(dbm: number | null | undefined): SignalQuality { if (dbm == null || !Number.isFinite(dbm)) return "unknown"; if (dbm >= -55) return "excellent"; if (dbm >= -67) return "good"; if (dbm >= -75) return "fair"; return "weak"; }
export function qualityLabel(q: SignalQuality, thai: boolean): string { const labels: Record<SignalQuality, [string, string]> = { excellent: ["ยอดเยี่ยม", "Excellent"], good: ["ดี", "Good"], fair: ["ปานกลาง", "Fair"], weak: ["อ่อน", "Weak"], unknown: ["ไม่ทราบ", "Unknown"] }; return labels[q][thai ? 0 : 1]; }
export async function safeCapabilities(): Promise<RadarCapabilities> { if (!isNativeRadar()) return browserCapabilities; try { return await SignalRadar.getCapabilities(); } catch { return { ...browserCapabilities, native: true }; } }
export async function requestRadarPermission(alias: "location" | "nearbyWifi" | "bluetooth" | "telephony"): Promise<boolean> { if (!isNativeRadar()) return false; try { return (await SignalRadar.requestPermission({ alias })).granted; } catch { return false; } }
export function formatOptional(value: number | undefined, unit: string): string { return value == null || !Number.isFinite(value) ? "—" : `${value} ${unit}`; }
export { type PluginListenerHandle };
