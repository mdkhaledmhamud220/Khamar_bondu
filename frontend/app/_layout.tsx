import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { FarmProvider } from "../context/FarmContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FarmProvider>
        <Stack
          initialRouteName="splash"
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#fff",
            },
          }}
        >
          <Stack.Screen name="splash" />
          <Stack.Screen name="index" />
        </Stack>
      </FarmProvider>
    </SafeAreaProvider>
  );
}