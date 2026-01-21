// useBLEMock.js
export default function useBLE() {
  return {
    scanForPeripherals: () => {},
    stopScanning: () => {},
    connectToDevice: () => {},
    disconnect: () => {},
    devices: [{ id: "wearable", name: "Demo Device" }],
    connectedDevice: { id: "wearable", name: "Mock Device" },
    heartRate: 70,
    O2Sat: 99,
    temperature: 37.0,
    scanning: false,
  };
}
