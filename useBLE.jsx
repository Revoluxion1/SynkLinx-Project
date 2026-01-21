import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, Vibration } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

const SYNKLINX_SERVICE = "e5df6019-cf42-49f6-a418-346db96363f6";
const HEART_RATE_CHAR = "3c1f4fe4-c7ce-4c09-a38a-ba166fce06c6";
const O2_CHAR = "9749ccd9-940e-4ad6-bce9-d246a8d30dca";
const TEMP_CHAR = "69b82322-1c56-423e-820e-eb08c3f030d4";

export default function useBLE() {
  // ---------- BLE Manager ----------
  const manager = useRef(new BleManager()).current;

  // ---------- States ----------
  const [devices, setDevices] = useState([]);
  const devicesRef = useRef([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [heartRate, setHeartRate] = useState(0);
  const [O2Sat, setO2Sat] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [scanning, setScanning] = useState(false);

  // ---------- Refs ----------
  const subs = useRef([]);
  const retryTimeout = useRef(null);
  const disconnectDebounce = useRef(false);
  const scanLock = useRef(false);

  // ---------- Cleanup ----------
  useEffect(() => {
    return () => {
      subs.current.forEach((s) => { try { s?.remove?.(); } catch {} });
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      try { manager.destroy(); } catch {}
    };
  }, []);

  // ---------- Parsing ----------
  const parseUInt8 = (char, setter, min = 0, max = 255) => {
    if (!char?.value) return;
    const buf = Buffer.from(char.value, "base64");
    if (buf.length < 1) return;
    const value = buf.readUInt8(0);
    if (value >= min && value <= max) setter(value);
  };

  const parseInt16Temp = (char, setter, min = 30, max = 45) => {
    if (!char?.value) return;
    const buf = Buffer.from(char.value, "base64");
    if (buf.length < 2) return;
    const value = buf.readInt16LE(0) / 100;
    if (value >= min && value <= max) setter(value);
  };

  // ---------- Streaming ----------
  const startStreaming = useCallback((device) => {
    subs.current.forEach((s) => { try { s?.remove?.(); } catch {} });
    subs.current = [];

    try {
      const hrSub = device.monitorCharacteristicForService(
        SYNKLINX_SERVICE,
        HEART_RATE_CHAR,
        (err, char) => { if (!err) parseUInt8(char, setHeartRate, 40, 200); }
      );

      const o2Sub = device.monitorCharacteristicForService(
        SYNKLINX_SERVICE,
        O2_CHAR,
        (err, char) => { if (!err) parseUInt8(char, setO2Sat, 50, 100); }
      );

      const tempSub = device.monitorCharacteristicForService(
        SYNKLINX_SERVICE,
        TEMP_CHAR,
        (err, char) => { if (!err) parseInt16Temp(char, setTemperature, 30, 45); }
      );

      subs.current.push(hrSub, o2Sub, tempSub);
    } catch (err) {
      console.log("Streaming error:", err);
      Alert.alert("Streaming Error", err.message || "Could not start streaming.");
    }
  }, []);

  // ---------- Scan ----------
  const scanForPeripherals = useCallback((options = { autoRetry: true, timeout: 8000 }) => {
    if (scanning || scanLock.current) return;
    scanLock.current = true;

    setDevices([]);
    devicesRef.current = [];
    setScanning(true);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error);
        setScanning(false);
        scanLock.current = false;
        return;
      }

      if (!device || !device.name) return;

      const name = device.name.trim().toLowerCase();
      if (name.includes("synklinx")) {
        if (!devicesRef.current.some(d => d.id === device.id)) {
          devicesRef.current.push(device);
          setDevices(prev => [...prev.filter(d => d.id !== device.id), { id: device.id, name: device.name }]);
        }
      }
    });

    retryTimeout.current = setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
      scanLock.current = false;

      if (options.autoRetry && devicesRef.current.length === 0) {
        console.log("No devices found, retrying scan...");
        scanForPeripherals(options);
      }
    }, options.timeout);
  }, [scanning, manager]);

  const stopScanning = useCallback(() => {
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    try { manager.stopDeviceScan(); } catch {}
    setScanning(false);
    scanLock.current = false;
  }, [manager]);

  // ---------- Connect ----------
  const connectToDevice = useCallback(async (device) => {
    stopScanning();
    const realDevice = devicesRef.current.find(d => d.id === device.id);
    if (!realDevice) return;

    try {
      const conn = await manager.connectToDevice(realDevice.id, { autoConnect: false });
      await conn.discoverAllServicesAndCharacteristics();
      await new Promise(r => setTimeout(r, 500));

      setConnectedDevice(conn);
      setHeartRate(0);
      setO2Sat(0);
      setTemperature(0);

      await startStreaming(conn);

      const dis = manager.onDeviceDisconnected(realDevice.id, () => handleDisconnect(realDevice.id));
      subs.current.push(dis);
    } catch (err) {
      console.log("Connection failed:", err);
      Alert.alert("Error", "Failed to connect to SynkLinx device.");
    }
  }, [manager, stopScanning, startStreaming]);

  // ---------- Disconnect ----------
  const handleDisconnect = useCallback((deviceId) => {
    if (disconnectDebounce.current) return;
    disconnectDebounce.current = true;

    Vibration.vibrate([500, 200, 500]);
    Alert.alert("Disconnected", "SynkLinx device lost connection.");

    setConnectedDevice(null);
    setHeartRate(0);
    setO2Sat(0);
    setTemperature(0);

    subs.current.forEach(s => { try { s?.remove?.(); } catch {} });
    subs.current = [];

    setTimeout(() => { 
      disconnectDebounce.current = false; 
      scanForPeripherals();
    }, 2000);
  }, [scanForPeripherals]);

  const disconnect = useCallback(async () => {
    subs.current.forEach(s => { try { s?.remove?.(); } catch {} });
    subs.current = [];

    if (connectedDevice) {
      try { await manager.cancelDeviceConnection(connectedDevice.id); } catch {}
      setConnectedDevice(null);
      setHeartRate(0);
      setO2Sat(0);
      setTemperature(0);
    }
  }, [connectedDevice, manager]);

  // ---------- Return ----------
  return {
    scanForPeripherals,
    stopScanning,
    connectToDevice,
    disconnect,
    devices,
    connectedDevice,
    heartRate,
    O2Sat,
    temperature,
    scanning,
  };
}
