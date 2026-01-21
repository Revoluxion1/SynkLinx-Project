import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Easing } from "react-native";

const PulseIndicator = ({
  size = 50,
  speedFactor = 1,
  color = "red",
  intensity = 0.3,          // how much the circle grows
  darkenAmount = 0.25,      // how much the color darkens
  opacityRange = [0.25, 1] // [minOpacity, maxOpacity]
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 1000 / speedFactor;

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1 + intensity,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false, // scale uses native driver
          }),
          Animated.timing(colorAnim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false, // color cannot use native driver
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(colorAnim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  }, [speedFactor, intensity]);

  const animatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [color, darkenColor(color, darkenAmount)]
  });

  const animatedOpacity = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [opacityRange[1], opacityRange[0]] // fades as it expands
  });

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: animatedColor,
          transform: [{ scale: scaleAnim }],
          opacity: animatedOpacity,
        },
      ]}
    />
  );
};

// Helper to darken an RGB or named color
function darkenColor(baseColor, amount = 0.2) {
  const match = baseColor.match(/\d+/g);
  if (!match) return baseColor;
  const [r, g, b] = match.map(Number);

  const newR = Math.max(0, r * (1 - amount));
  const newG = Math.max(0, g * (1 - amount));
  const newB = Math.max(0, b * (1 - amount));

  return `rgb(${newR}, ${newG}, ${newB})`;
}

export default PulseIndicator;

const styles = StyleSheet.create({
  circle: {
    marginVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
});
