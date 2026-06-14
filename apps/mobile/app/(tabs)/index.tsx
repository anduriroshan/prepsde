import { ScrollView, View, Text, TouchableOpacity, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDeadline } from "@prepsde/hooks";

const TODAY_TASKS = [
  { id: "1", label: "Solve NeetCode — Stack (7 problems)", done: false, estimate: "45 min" },
  { id: "2", label: "Read: Caching & CDNs", done: true, estimate: "20 min" },
  { id: "3", label: "Write STAR story #4", done: false, estimate: "15 min" },
];

const PACE = [
  { label: "Problems", current: 8, target: 10 },
  { label: "Sys Design", current: 3, target: 5 },
  { label: "Reflections", current: 5, target: 5 },
];

const DUE_REVIEWS = [
  { id: "1", name: "Two Sum", tag: "Day 7 review" },
  { id: "2", name: "Valid Parentheses", tag: "Day 15 review" },
];

export default function HomeScreen() {
  const { daysLeft } = useDeadline("2026-12-15");

  return (
    <SafeAreaView className="flex-1 bg-[#0d0d0d]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Bar */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[#9a9a9a] text-[12px] font-medium tracking-widest uppercase">
              PrepSDE
            </Text>
            <Text className="text-[#f0f0f0] text-[20px] font-bold">
              Hey, Roshan
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-pill px-3 py-1 flex-row items-center gap-1">
              <Text className="text-[14px]">🔥</Text>
              <Text className="text-[#f0f0f0] text-[13px] font-semibold">12</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-[#638688] items-center justify-center">
              <Text className="text-white text-[13px] font-bold">AR</Text>
            </View>
          </View>
        </View>

        {/* Deadline Hero Card */}
        <View className="bg-[#1a1a1a] border border-[rgba(99,134,136,0.2)] rounded-large p-6 mb-4">
          <Text className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">
            Days to Interview
          </Text>
          <Text className="text-[#f0f0f0] font-black mb-1" style={{ fontSize: 64, lineHeight: 68 }}>
            {daysLeft}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-[#9a9a9a] text-[13px]">Target: Dec 15, 2026</Text>
            <View className="bg-[rgba(34,197,94,0.12)] rounded-tight px-2 py-1">
              <Text className="text-[#22c55e] text-[11px] font-medium">● On Track</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View className="mt-4 bg-[#242424] h-[3px] rounded-flat overflow-hidden">
            <View className="bg-[#638688] h-full" style={{ width: "36%" }} />
          </View>
          <Text className="text-[#555555] text-[11px] mt-1 font-mono">
            36% of prep complete
          </Text>
        </View>

        {/* Today's Tasks */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card mb-4 overflow-hidden">
          <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
            <Text className="text-[#f0f0f0] text-[15px] font-semibold">Today's Tasks</Text>
            <Text className="text-[#9a9a9a] text-[12px]">
              {TODAY_TASKS.filter((t) => !t.done).length} remaining
            </Text>
          </View>
          {TODAY_TASKS.map((task, i) => (
            <View key={task.id}>
              {i > 0 && <View className="h-[1px] bg-[rgba(255,255,255,0.04)] mx-4" />}
              <Pressable className="flex-row items-center px-4 py-3 gap-3 active:bg-[#242424]">
                <View
                  className="w-[3px] self-stretch rounded-pill"
                  style={{ backgroundColor: task.done ? "#555555" : "#638688" }}
                />
                <View className="flex-1">
                  <Text
                    className={`text-[14px] ${task.done ? "text-[#555555] line-through" : "text-[#f0f0f0]"}`}
                  >
                    {task.label}
                  </Text>
                </View>
                <View className="bg-[#242424] rounded-tight px-2 py-0.5">
                  <Text className="text-[#9a9a9a] text-[11px] font-mono">{task.estimate}</Text>
                </View>
              </Pressable>
            </View>
          ))}
          <View className="h-4" />
        </View>

        {/* Weekly Pace */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <Text className="text-[#f0f0f0] text-[15px] font-semibold mb-3">Weekly Pace</Text>
          {PACE.map((item) => (
            <View key={item.label} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-[#9a9a9a] text-[12px]">{item.label}</Text>
                <Text className="text-[#9a9a9a] text-[12px] font-mono">
                  {item.current}/{item.target}
                </Text>
              </View>
              <View className="bg-[#242424] h-[4px]">
                <View
                  className="bg-[#638688] h-full"
                  style={{ width: `${(item.current / item.target) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Spaced Repetition Due */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#f0f0f0] text-[15px] font-semibold">Due for Review</Text>
            <View className="bg-[rgba(239,68,68,0.12)] rounded-tight px-2 py-0.5">
              <Text className="text-[#ef4444] text-[11px] font-medium">{DUE_REVIEWS.length} due</Text>
            </View>
          </View>
          {DUE_REVIEWS.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <View className="h-[1px] bg-[rgba(255,255,255,0.04)] my-2" />}
              <TouchableOpacity className="flex-row justify-between items-center py-1">
                <Text className="text-[#f0f0f0] text-[14px]">{r.name}</Text>
                <Text className="text-[#9a9a9a] text-[12px] font-mono">{r.tag}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
