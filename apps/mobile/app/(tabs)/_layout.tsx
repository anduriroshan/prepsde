import { Tabs } from "expo-router";
import { Text } from "react-native";

const TAB_ICON: Record<string, string> = {
  index: "⌂",
  dsa: "</>",
  reflect: "✎",
  progress: "▦",
  profile: "◯",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopColor: "rgba(255,255,255,0.06)",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#638688",
        tabBarInactiveTintColor: "#555555",
        tabBarLabelStyle: {
          fontFamily: "Roboto",
          fontSize: 11,
          fontWeight: "500",
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>
            {TAB_ICON[route.name] ?? "·"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index"    options={{ title: "Home" }} />
      <Tabs.Screen name="dsa"      options={{ title: "DSA" }} />
      <Tabs.Screen name="reflect"  options={{ title: "Reflect" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="profile"  options={{ title: "Profile" }} />
    </Tabs>
  );
}
