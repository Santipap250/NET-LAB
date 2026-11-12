package com.obix.netlab;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.telephony.CellIdentityLte;
import android.telephony.CellIdentityNr;
import android.telephony.CellInfo;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoNr;
import android.telephony.CellSignalStrengthLte;
import android.telephony.CellSignalStrengthNr;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PermissionState;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;
import java.util.Locale;
import android.telephony.TelephonyCallback;

@CapacitorPlugin(
    name = "SignalRadar",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(alias = "nearbyWifi", strings = { Manifest.permission.NEARBY_WIFI_DEVICES }),
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "telephony", strings = { Manifest.permission.READ_PHONE_STATE, Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class SignalRadarPlugin extends Plugin {
    private WifiManager wifiManager;
    private BluetoothLeScanner bleScanner;
    private ScanCallback bleCallback;
    private BroadcastReceiver wifiReceiver;
    private TelephonyManager telephonyManager;

    @Override
    public void load() {
        Context context = getContext();
        wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter != null && (Build.VERSION.SDK_INT < 31 || hasBluetoothPermission())) {
                try { bleScanner = adapter.getBluetoothLeScanner(); } catch (SecurityException ignored) { bleScanner = null; }
            }
        }
        telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("apiLevel", Build.VERSION.SDK_INT);
        result.put("wifi", wifiManager != null);
        result.put("ble", bleScanner != null);
        result.put("cellular", telephonyManager != null);
        result.put("supportsTelephonyCallback", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String alias = call.getString("alias", "location");
        if (getPermissionState(alias) == PermissionState.GRANTED) {
            JSObject result = new JSObject(); result.put("alias", alias); result.put("granted", true); call.resolve(result); return;
        }
        requestPermissionForAlias(alias, call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        String alias = call.getString("alias", "location");
        JSObject result = new JSObject(); result.put("alias", alias); result.put("granted", getPermissionState(alias) == PermissionState.GRANTED); call.resolve(result);
    }

    @PluginMethod
    public void startWifiScan(PluginCall call) {
        if (wifiManager == null) { call.reject("Wi-Fi is unavailable on this device"); return; }
        if (!hasLocationPermission()) { call.reject("Location permission is required for Wi-Fi scan", "PERMISSION_REQUIRED"); return; }
        if (Build.VERSION.SDK_INT >= 33 && !hasNearbyWifiPermission()) { call.reject("Nearby Wi-Fi permission is required", "PERMISSION_REQUIRED"); return; }
        wifiReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                boolean updated = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false);
                JSObject result = new JSObject(); result.put("updated", updated); result.put("scannedAt", System.currentTimeMillis());
                JSArray networks = new JSArray();
                try {
                    for (android.net.wifi.ScanResult item : wifiManager.getScanResults()) networks.put(wifiResult(item));
                    result.put("networks", networks); notifyListeners("wifiScan", result); call.resolve(result);
                } catch (SecurityException error) { call.reject("Android denied Wi-Fi scan results", "PERMISSION_DENIED"); }
                try { context.unregisterReceiver(this); } catch (Exception ignored) { }
                wifiReceiver = null;
            }
        };
        getContext().registerReceiver(wifiReceiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        try { if (!wifiManager.startScan()) { getContext().unregisterReceiver(wifiReceiver); wifiReceiver = null; call.reject("Android throttled or rejected the Wi-Fi scan", "SCAN_REJECTED"); } }
        catch (SecurityException error) { call.reject("Android denied Wi-Fi scan", "PERMISSION_DENIED"); }
    }

    @PluginMethod
    public void stopWifiScan(PluginCall call) {
        if (wifiReceiver != null) { try { getContext().unregisterReceiver(wifiReceiver); } catch (Exception ignored) { } wifiReceiver = null; }
        call.resolve();
    }

    private JSObject wifiResult(android.net.wifi.ScanResult item) {
        JSObject result = new JSObject(); result.put("ssid", item.SSID == null ? "" : item.SSID); result.put("bssid", item.BSSID == null ? "" : item.BSSID); result.put("rssiDbm", item.level); result.put("frequencyMhz", item.frequency); result.put("channel", channelForFrequency(item.frequency)); result.put("band", bandForFrequency(item.frequency)); result.put("security", securityForCapabilities(item.capabilities)); result.put("seenAt", item.timestamp); return result;
    }

    @PluginMethod
    public void startBleScan(PluginCall call) {
        if (bleScanner == null) {
            try {
                BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
                BluetoothAdapter adapter = manager == null ? null : manager.getAdapter();
                if (adapter != null) bleScanner = adapter.getBluetoothLeScanner();
            } catch (SecurityException ignored) { bleScanner = null; }
        }
        if (bleScanner == null) { call.reject("Bluetooth LE is unavailable on this device"); return; }
        if (Build.VERSION.SDK_INT >= 31 && !hasBluetoothPermission()) { call.reject("Bluetooth scan permission is required", "PERMISSION_REQUIRED"); return; }
        stopBleInternal();
        bleCallback = new ScanCallback() {
            @Override public void onScanResult(int callbackType, ScanResult scanResult) { notifyListeners("bleAdvertisement", bleResult(scanResult)); }
            @Override public void onScanFailed(int errorCode) { JSObject result = new JSObject(); result.put("errorCode", errorCode); notifyListeners("bleScanError", result); }
        };
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        try { bleScanner.startScan(null, settings, bleCallback); call.resolve(); } catch (SecurityException error) { call.reject("Android denied BLE scan", "PERMISSION_DENIED"); }
    }

    @PluginMethod
    public void stopBleScan(PluginCall call) { stopBleInternal(); call.resolve(); }
    private void stopBleInternal() { if (bleScanner != null && bleCallback != null) { try { bleScanner.stopScan(bleCallback); } catch (SecurityException ignored) { } bleCallback = null; } }

    private JSObject bleResult(ScanResult item) {
        JSObject result = new JSObject(); String address = item.getDevice() == null ? "" : item.getDevice().getAddress(); result.put("deviceId", address); result.put("name", item.getDevice() == null ? null : item.getDevice().getName()); result.put("rssiDbm", item.getRssi()); result.put("seenAt", System.currentTimeMillis()); result.put("manufacturerData", item.getScanRecord() == null ? null : item.getScanRecord().getBytes()); return result;
    }

    @PluginMethod
    public void getCellularInfo(PluginCall call) {
        if (telephonyManager == null) { call.reject("Cellular information is unavailable on this device"); return; }
        if (!hasTelephonyPermission()) { call.reject("Phone state and location permissions are required", "PERMISSION_REQUIRED"); return; }
        try {
            JSObject result = new JSObject(); result.put("carrier", telephonyManager.getNetworkOperatorName()); result.put("networkType", networkTypeName(telephonyManager.getDataNetworkType())); result.put("simState", telephonyManager.getSimState()); result.put("apiLevel", Build.VERSION.SDK_INT); result.put("seenAt", System.currentTimeMillis());
            JSArray cells = new JSArray(); List<CellInfo> infos = telephonyManager.getAllCellInfo(); if (infos != null) for (CellInfo info : infos) cells.put(cellResult(info)); result.put("cells", cells); call.resolve(result);
        } catch (SecurityException error) { call.reject("Android denied cellular information", "PERMISSION_DENIED"); }
    }

    private JSObject cellResult(CellInfo info) {
        JSObject result = new JSObject(); result.put("registered", info.isRegistered());
        if (info instanceof CellInfoLte) { CellSignalStrengthLte s = ((CellInfoLte) info).getCellSignalStrength(); result.put("technology", "LTE"); result.put("rssiDbm", s.getDbm()); result.put("rsrpDbm", s.getRsrp()); result.put("rsrqDb", s.getRsrq()); CellIdentityLte id = ((CellInfoLte) info).getCellIdentity(); result.put("pci", id.getPci()); result.put("tac", id.getTac()); result.put("arfcn", id.getEarfcn()); }
        else if (Build.VERSION.SDK_INT >= 29 && info instanceof CellInfoNr) { CellSignalStrengthNr s = (CellSignalStrengthNr) ((CellInfoNr) info).getCellSignalStrength(); result.put("technology", "NR"); result.put("rssiDbm", s.getDbm()); result.put("rsrpDbm", s.getSsRsrp()); result.put("rsrqDb", s.getSsRsrq()); result.put("sinrDb", s.getSsSinr()); CellIdentityNr id = (CellIdentityNr) ((CellInfoNr) info).getCellIdentity(); result.put("pci", id.getPci()); result.put("tac", id.getTac()); result.put("arfcn", id.getNrarfcn()); }
        else result.put("technology", "unknown"); return result;
    }

    private boolean hasLocationPermission() { return getPermissionState("location") == PermissionState.GRANTED; }
    private boolean hasNearbyWifiPermission() { return Build.VERSION.SDK_INT < 33 || getPermissionState("nearbyWifi") == PermissionState.GRANTED; }
    private boolean hasBluetoothPermission() { return Build.VERSION.SDK_INT < 31 || getPermissionState("bluetooth") == PermissionState.GRANTED; }
    private boolean hasTelephonyPermission() { return getPermissionState("telephony") == PermissionState.GRANTED; }
    private String bandForFrequency(int f) { if (f >= 5925) return "6 GHz"; if (f >= 4900) return "5 GHz"; return "2.4 GHz"; }
    private int channelForFrequency(int f) { if (f >= 2412 && f <= 2484) return (f - 2407) / 5; if (f >= 5000) return (f - 5000) / 5; return 0; }
    private String securityForCapabilities(String c) { String x = c == null ? "" : c.toUpperCase(Locale.US); if (x.contains("SAE")) return "WPA3"; if (x.contains("WPA") || x.contains("WEP")) return "WPA/WEP"; return "Open"; }
    private String networkTypeName(int type) { switch (type) { case TelephonyManager.NETWORK_TYPE_NR: return "5G NR"; case TelephonyManager.NETWORK_TYPE_LTE: return "4G LTE"; case TelephonyManager.NETWORK_TYPE_HSPAP: case TelephonyManager.NETWORK_TYPE_HSPA: return "3G"; case TelephonyManager.NETWORK_TYPE_EDGE: case TelephonyManager.NETWORK_TYPE_GPRS: return "2G"; default: return "unknown"; } }
}
