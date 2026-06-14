import { ScrollView, View, Text, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

const STATS = [
  { label: "Days Left",      value: "184", mono: true },
  { label: "Day Streak",     value: "42",  mono: true },
  { label: "Cards Reviewed", value: "312", mono: true },
];

const NOTIFICATION_SETTINGS = [
  { label: "Daily reminder", time: "9:00 PM" },
  { label: "Weekly summary", time: "Sunday" },
  { label: "Pod updates",    time: "" },
];

export default function ProfileScreen() {
  const [notifs, setNotifs] = useState([true, true, true]);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0d0d]">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">Profile</Text>

        {/* User card */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4 flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-[#638688] items-center justify-center">
            <Text className="text-white text-[22px] font-bold">AR</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#f0f0f0] text-[18px] font-bold">Roshan A.</Text>
            <Text className="text-[#9a9a9a] text-[13px]">anduri.roshan@accenture.com</Text>
            <Text className="text-[#555555] text-[12px] font-mono mt-1">Member since Jun 2026</Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-4">
          {STATS.map((s) => (
            <View key={s.label} className="flex-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-3 items-center">
              <Text className="text-[#638688] text-[24px] font-black font-mono">{s.value}</Text>
              <Text className="text-[#9a9a9a] text-[11px] text-center mt-1">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Plan */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#f0f0f0] text-[15px] font-semibold">Your Plan</Text>
            <TouchableOpacity>
              <Text className="text-[#638688] text-[13px]">Edit →</Text>
            </TouchableOpacity>
          </View>
          {[
            ["Target",   "SDE2 @ Google"],
            ["Duration", "24 weeks"],
            ["Start",    "Jun 16, 2026"],
            ["Deadline", "Dec 15, 2026"],
            ["Adjustments", "+3 / -1 days"],
          ].map(([label, value]) => (
            <View key={label} className="flex-row justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
              <Text className="text-[#9a9a9a] text-[13px]">{label}</Text>
              <Text className="text-[#f0f0f0] text-[13px] font-mono">{value}</Text>
            </View>
          ))}
        </View>

        {/* Pod */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-[#f0f0f0] text-[15px] font-semibold">Accountability Pod</Text>
            <TouchableOpacity>
              <Text className="text-[#638688] text-[13px]">View →</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-[#9a9a9a] text-[13px] mb-1">"DSA Grinders" · 4 members</Text>
          <Text className="text-[#9a9a9a] text-[13px]">
            This week's leader: <Text className="text-[#f0f0f0]">Priya 🔥</Text>
          </Text>
        </View>

        {/* Notifications */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <Text className="text-[#f0f0f0] text-[15px] font-semibold mb-3">Notifications</Text>
          {NOTIFICATION_SETTINGS.map((n, i) => (
            <View key={n.label} className="flex-row justify-between items-center py-2">
              <View>
                <Text className="text-[#f0f0f0] text-[14px]">{n.label}</Text>
                {n.time ? <Text className="text-[#555555] text-[12px] font-mono">{n.time}</Text> : null}
              </View>
              <Switch
                value={notifs[i]}
                onValueChange={(v) => setNotifs((prev) => prev.map((val, idx) => (idx === i ? v : val)))}
                trackColor={{ false: "#242424", true: "rgba(99,134,136,0.4)" }}
                thumbColor={notifs[i] ? "#638688" : "#555555"}
              />
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card overflow-hidden mb-4">
          {["Export Data", "Log Out"].map((label, i) => (
            <TouchableOpacity
              key={label}
              className="px-4 py-4 border-b border-[rgba(255,255,255,0.04)] active:bg-[#242424]"
            >
              <Text className="text-[#f0f0f0] text-[14px]">{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity className="px-4 py-4 active:bg-[#242424]">
            <Text className="text-[#ef4444] text-[14px]">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
