// dataAlert.jsx
import { showMessage } from "react-native-flash-message";

// Throttle timers (ms)
const ALERT_THROTTLE = 15000; // 15 seconds

// Last alert times
const lastAlertTime = {
  heartRate: 0,
  O2Sat: 0,
  temperature: 0,
};

/**
 * Thresholds
 */
const thresholds = {
  heartRate: {
    criticallyHigh: 180,
    high: 120,
    low: 50,
    criticallyLow: 30,
  },
  O2Sat: {
    low: 95,
    criticallyLow: 90,
  },
  tempC: {
    high: 38,
    low: 35,
  },
  tempF: {
    high: 100.4,
    low: 95,
  },
};

/**
 * Runs vital alerts safely.
 */
export function runVitalAlerts({ heartRate, O2Sat, temperature, isCelsius }) {
  const now = Date.now();

  // ---------------- O₂ Saturation ----------------
  if (O2Sat !== null && !isNaN(O2Sat)) {
    if (now - lastAlertTime.O2Sat > ALERT_THROTTLE) {
      if (O2Sat <= thresholds.O2Sat.criticallyLow) {
        showMessage({
          message: "Critically Low O₂",
          description: `SpO₂: ${O2Sat}%`,
          type: "danger",
          duration: 3000,
          icon: "danger",
        });
      } else if (O2Sat < thresholds.O2Sat.low) {
        showMessage({
          message: "Low O₂",
          description: `SpO₂: ${O2Sat}%`,
          type: "warning",
          duration: 3000,
          icon: "warning",
        });
      }
      lastAlertTime.O2Sat = now;
    }
  }

  // ---------------- Heart Rate ----------------
  if (heartRate !== null && !isNaN(heartRate)) {
    if (now - lastAlertTime.heartRate > ALERT_THROTTLE) {
      if (heartRate >= thresholds.heartRate.criticallyHigh) {
        showMessage({
          message: "Critically High HR",
          description: `Heart Rate: ${heartRate} bpm`,
          type: "danger",
          duration: 3000,
          icon: "danger",
        });
      } else if (heartRate >= thresholds.heartRate.high) {
        showMessage({
          message: "High HR",
          description: `Heart Rate: ${heartRate} bpm`,
          type: "warning",
          duration: 3000,
          icon: "warning",
        });
      } else if (heartRate < thresholds.heartRate.criticallyLow) {
        showMessage({
          message: "Critically Low HR",
          description: `Heart Rate: ${heartRate} bpm`,
          type: "danger",
          duration: 3000,
          icon: "danger",
        });
      } else if (heartRate < thresholds.heartRate.low) {
        showMessage({
          message: "Low HR",
          description: `Heart Rate: ${heartRate} bpm`,
          type: "warning",
          duration: 3000,
          icon: "warning",
        });
      }
      lastAlertTime.heartRate = now;
    }
  }

  // ---------------- Temperature ----------------
  if (temperature !== null && !isNaN(temperature)) {
    const tempVal = isCelsius ? temperature : (temperature * 9) / 5 + 32;
    const tempThresholds = isCelsius ? thresholds.tempC : thresholds.tempF;

    if (now - lastAlertTime.temperature > ALERT_THROTTLE) {
      if (tempVal >= tempThresholds.high) {
        showMessage({
          message: "High Body Temperature",
          description: `Temperature: ${tempVal.toFixed(1)}°${isCelsius ? "C" : "F"}`,
          type: "danger",
          duration: 3000,
          icon: "danger",
        });
      } else if (tempVal <= tempThresholds.low) {
        showMessage({
          message: "Low Body Temperature",
          description: `Temperature: ${tempVal.toFixed(1)}°${isCelsius ? "C" : "F"}`,
          type: "danger",
          duration: 3000,
          icon: "danger",
        });
      }
      lastAlertTime.temperature = now;
    }
  }
}
