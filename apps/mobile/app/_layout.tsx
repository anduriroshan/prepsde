import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0d0d0d" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
