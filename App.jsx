import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FlashMessage from "react-native-flash-message";

import HomePage from "./screens/HomePage";
import DeviceModal from "./screens/DeviceModal";
import Dashboard from "./screens/Dashboard";

import { BLEProvider } from "./BLEProvider";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <BLEProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Stack.Screen name="Home" component={HomePage} />
          <Stack.Screen name="DeviceModal" component={DeviceModal} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
        </Stack.Navigator>

        <FlashMessage position="top" floating />
      </NavigationContainer>
    </BLEProvider>
  );
}
