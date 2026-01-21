import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  withRepeat,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useBLEContext } from "../BLEProvider";

const DeviceModal = () => {
  const navigation = useNavigation();
  const { devices, connectToDevice, scanning, scanForPeripherals, stopScanning } =
    useBLEContext();
  const [connectingId, setConnectingId] = useState(null);

  const glow = useSharedValue(0.4);

  // ---------- Pulse animation ----------
  useEffect(() => {
    glow.value = scanning
      ? withRepeat(withTiming(1, { duration: 900 }), -1, true)
      : withTiming(0.4, { duration: 300 });
  }, [scanning]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  // ---------- Auto scan on mount ----------
  useEffect(() => {
    scanForPeripherals({ autoRetry: true });
    return () => stopScanning();
  }, []);

  // ---------- Connect ----------
  const handleConnect = async (device) => {
    setConnectingId(device.id);
    try {
      await connectToDevice(device);
      navigation.navigate("Dashboard");
    } catch (error) {
      console.log("Connection failed:", error);
      alert(`Failed to connect to ${device.name || "device"}.`);
    } finally {
      setConnectingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const isConnecting = connectingId === item.id;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceItem,
          pressed && { backgroundColor: "rgba(0,0,0,0.05)" },
          isConnecting && { opacity: 0.5 },
        ]}
        onPress={() => handleConnect(item)}
        disabled={isConnecting}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>{item.name}</Text>
        </View>
        {isConnecting && <ActivityIndicator size="small" color="#12ed3e" />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fullscreen}>
        <Animated.View
          entering={SlideInUp.springify().damping(12).stiffness(120)}
          exiting={SlideOutDown}
          style={styles.contentContainer}
        >
          <Text style={styles.title}>Available Devices</Text>

          {scanning && (
            <View style={styles.scanningRow}>
              <Animated.View style={[styles.scanDot, glowStyle]} />
              <Text style={styles.scanningText}>Scanning…</Text>
            </View>
          )}

          {devices.length === 0 && !scanning ? (
            <Text style={styles.empty}>
              No devices found. Please make sure your SynkLinx device is on.
            </Text>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
              style={{ width: "100%" }}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => scanForPeripherals({ autoRetry: true })}
              disabled={scanning}
            >
              <Text style={styles.scanButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate("Home")}>
              <Text style={styles.closeButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default DeviceModal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  fullscreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentContainer: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#000", marginBottom: 12 },
  scanningRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  scanDot: { width: 10, height: 10, backgroundColor: "#3d3a45ff", borderRadius: 10, marginRight: 8 },
  scanningText: { fontSize: 16, color: "#555" },
  empty: { fontSize: 16, color: "#888", marginVertical: 20, textAlign: "center" },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    marginBottom: 10,
  },
  deviceName: { fontSize: 17, fontWeight: "600", color: "#000" },
  buttonRow: { flexDirection: "row", marginTop: 15, marginBottom: 0 },
  scanButton: { backgroundColor: "#12ed3e", paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10 },
  scanButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  closeButton: { marginLeft: 10, backgroundColor: "#d32121", paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10 },
  closeButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
