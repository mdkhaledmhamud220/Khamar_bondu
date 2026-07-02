import { Stack } from "expo-router";
import { FarmProvider } from "../context/FarmContext";

export default function RootLayout() {
  return (
    <FarmProvider>
      <Stack initialRouteName="splash">
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </FarmProvider>
  );
}