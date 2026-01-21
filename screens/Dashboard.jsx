import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBLEContext } from "../BLEProvider";
import PulseIndicator from "../PulseIndicator";
import { runVitalAlerts } from "../dataAlert";

import Heart_Rate from "../assets/Heart_Rate.png";
import O2_Sat from "../assets/O2_Sat.png";
import Body_Temp from "../assets/Body_Temp.png";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PULSE_SIZE = SCREEN_HEIGHT / 8;

const Dashboard = () => {
  const navigation = useNavigation();
  const {
    connectedDevice,
    disconnect,
    heartRate = 0,
    O2Sat = 0,
    temperature = 0,
  } = useBLEContext();

  const [isCelsius, setIsCelsius] = useState(true);

  // Animated button pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Run vital alerts
  useEffect(() => {
    if (connectedDevice) {
      runVitalAlerts({ heartRate, O2Sat, temperature, isCelsius });
    }
  }, [heartRate, O2Sat, temperature, connectedDevice]);

  // ---------- Display helper ----------
  const displayValue = (val, unit) =>
    val === null || val === undefined || val === 0 || isNaN(val) ? "--" : `${val}${unit}`;

  // ------------------ Pulse Speeds ------------------
  const getHeartRateSpeed = (hr) => {
    if (!hr || isNaN(hr)) return 0.5;
    if (hr <= 59) return 1;      // slow
    if (hr <= 90) return 2;      // moderate
    if (hr <= 130) return 4;     // fast
    return 6;                     // super fast
  };

  const getO2Speed = (o2) => {
    if (!o2 || isNaN(o2) || o2 < 50) return 0.5;
    return 1 + ((Math.min(Math.max(o2, 50), 100) - 50) / 50); // 1-2 range
  };

  const getO2Color = (o2) => {
    if (!o2 || isNaN(o2)) return "rgb(210,180,255)";
    const normalized = Math.min(Math.max((o2 - 50) / 50, 0), 1);
    const r = 200 - normalized * 100;
    const g = 150 - normalized * 150;
    const b = 255 - normalized * 55;
    return `rgb(${r},${g},${b})`;
  };

  const convertTemp = (temp) => {
    if (!temp || isNaN(temp) || temp === 0) return "--";
    return isCelsius ? temp.toFixed(1) : ((temp * 9) / 5 + 32).toFixed(1);
  };

  const getTempColor = (temp) => {
    if (!temp || isNaN(temp) || temp === 0) return "rgba(168, 255, 255, 1)";
    if (temp <= 34.4) return "rgba(0, 255, 255, 1)";
    if (temp <= 37.2) return "rgba(62, 173, 37, 1)";
    if (temp <= 38.3) return "rgba(220, 111, 10, 1)";
    return "red";
  };

  const getTempSpeed = (temp) => {
    if (!temp || isNaN(temp) || temp === 0) return 0.5;
    if (temp <= 34.4) return 0.5;
    if (temp <= 37.2) return 2;
    if (temp <= 38.3) return 4;
    return 8;
  };

  // ------------------ Render Metric ------------------
  const renderMetric = (pulseSize, speed, color, icon, label, valueContent, toggle = false) => (
    <View style={styles.metricWrapper}>
      <View style={{ justifyContent: "center", alignItems: "center" }}>
        <PulseIndicator
          size={pulseSize}
          speedFactor={speed}
          color={color}
          intensity={0.3}
          darkenAmount={0.25}
          opacityRange={[0.2, 0.8]}
        />
        <Image
          source={icon}
          style={{ width: pulseSize * 0.75, height: pulseSize * 0.75, position: "absolute" }}
        />
      </View>
      <View style={styles.metricTextWrapper}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueContent}</Text>
        {toggle && (
          <TouchableOpacity onPress={() => setIsCelsius(!isCelsius)} style={styles.singleToggleButton}>
            <Text style={styles.singleToggleText}>Show {isCelsius ? "°F" : "°C"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dataContainer}>
        <View style={styles.dataWrapper}>
          {connectedDevice ? (
            <>
              {renderMetric(
                PULSE_SIZE,
                getHeartRateSpeed(heartRate),
                "rgba(240, 20, 105, 0.9)",
                Heart_Rate,
                "Heart Rate",
                displayValue(heartRate, " bpm")
              )}
              {renderMetric(
                PULSE_SIZE,
                getO2Speed(O2Sat),
                getO2Color(O2Sat),
                O2_Sat,
                "O₂ Saturation",
                displayValue(O2Sat, "%")
              )}
              {renderMetric(
                PULSE_SIZE,
                getTempSpeed(temperature),
                getTempColor(temperature),
                Body_Temp,
                "Body Temperature",
                `${convertTemp(temperature)}°${isCelsius ? "C" : "F"}`,
                true
              )}
            </>
          ) : (
            <Text style={styles.value}>Disconnected. Please connect a device.</Text>
          )}
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: connectedDevice ? "red" : "limegreen" }]}
          onPress={() => {
            if (connectedDevice) disconnect();
            navigation.navigate("DeviceModal");
          }}
        >
          <Text style={styles.buttonText}>{connectedDevice ? "Disconnect" : "Search Devices"}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  dataContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 10 },
  dataWrapper: { flex: 1, justifyContent: "space-evenly", alignItems: "center", width: "100%" },
  metricWrapper: { alignItems: "center", justifyContent: "center", width: "100%" },
  metricTextWrapper: { marginTop: 10, alignItems: "center" },
  label: { fontSize: 20, fontWeight: "500", textAlign: "center" },
  value: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginTop: 2 },
  button: {
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
  },
  buttonText: { fontSize: 18, color: "white", fontWeight: "bold" },
  singleToggleButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#ffbb00ff",
    borderRadius: 5,
  },
  singleToggleText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default Dashboard;
