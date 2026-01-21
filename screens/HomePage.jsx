import React, { useRef, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Logo from "../assets/Logos/SynkLinx_Logo.png";

const HomePage = () => {
  const navigation = useNavigation();

  // Animations for each section
  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  const logoSlide = useRef(new Animated.Value(20)).current;
  const textSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo appears first
      Animated.parallel([
        Animated.timing(logoFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(logoSlide, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),

      // Title + subtitle together
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(subtitleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),

      // Button fades last
      Animated.timing(buttonFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);
  

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.centerContent}>
        {/* Logo Animation */}
        <Animated.View
          style={{ opacity: logoFade, transform: [{ translateY: logoSlide }] }}
        >
          <Image source={Logo} style={styles.logo} />
        </Animated.View>

        {/* Text Animation */}
        <Animated.View
          style={{ opacity: titleFade, transform: [{ translateY: textSlide }] }}
        >
          <Text style={styles.title}>The World's First Smart Necklace</Text>
        </Animated.View>

        <Animated.View
          style={{ opacity: subtitleFade, transform: [{ translateY: textSlide }] }}
        >
          <Text style={styles.subtitle}>Click Start to begin!</Text>
        </Animated.View>
      </View>

      {/* Button stays bottom-ish and fades in */}
      <Animated.View style={[styles.buttonWrapper, { opacity: buttonFade }]}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("DeviceModal")}
>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Ensures proper centering on all screen sizes
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  logo: {
    width: 260,
    height: 260,
    resizeMode: "contain",
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },

  // Keeps Start button from floating too high
  buttonWrapper: {
    alignItems: "center",
    marginBottom: 40,
  },

  // 🔥 Updated Orange + Larger Button
  button: {
    backgroundColor: "#FF7A00",       // strong orange
    paddingVertical: 20,              // bigger height
    paddingHorizontal: 60,            // bigger width
    borderRadius: 14,                 // smoother, modern shape
  },

  buttonText: {
    color: "#fff",
    fontSize: 20,                     // larger text
    fontWeight: "bold",
  },
});
