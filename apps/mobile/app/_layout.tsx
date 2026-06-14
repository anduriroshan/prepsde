import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0d0d0d" />
      {Platform.OS === "web" ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            backgroundColor: "#060609",
            minHeight: "100vh" as any,
          }}
        >
          <View style={{ width: "100%", maxWidth: 430, flex: 1, backgroundColor: "#0d0d0d" }}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </>
  );
}
