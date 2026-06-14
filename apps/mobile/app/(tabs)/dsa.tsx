import { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTERS = ["All", "Due Today", "Mastered"];
const PATTERNS = ["Arrays", "Two Pointers", "Stack", "Trees", "Graphs", "DP", "Heap"];

const PROBLEMS = [
  { id: "1", name: "Two Sum", difficulty: "easy", pattern: "Arrays", nextReview: "Tomorrow", reviews: 2, mastered: false },
  { id: "2", name: "Valid Parentheses", difficulty: "medium", pattern: "Stack", nextReview: "Jun 18", reviews: 1, mastered: false },
  { id: "3", name: "Binary Search", difficulty: "easy", pattern: "Binary Search", nextReview: "Mastered", reviews: 3, mastered: true },
  { id: "4", name: "Merge Intervals", difficulty: "medium", pattern: "Arrays", nextReview: "Jun 20", reviews: 0, mastered: false },
  { id: "5", name: "Word Break", difficulty: "hard", pattern: "DP", nextReview: "Today", reviews: 0, mastered: false },
];

const DIFF_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  hard:   { label: "Hard",   color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function DSAScreen() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activePattern, setActivePattern] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0d0d]">
      {/* App Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <Text className="text-[#f0f0f0] text-[20px] font-bold">DSA Tracker</Text>
        <TouchableOpacity className="bg-[#638688] rounded-tight px-3 py-1.5">
          <Text className="text-white text-[13px] font-semibold">+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View className="px-4 pt-3 pb-2">
          <View className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-card flex-row items-center px-3 py-2 gap-2">
            <Text className="text-[#555555] text-[16px]">⌕</Text>
            <TextInput
              placeholder="Search problems..."
              placeholderTextColor="#555555"
              className="flex-1 text-[#f0f0f0] text-[14px]"
            />
          </View>
        </View>

        {/* Filter tabs */}
        <View className="flex-row px-4 gap-2 mb-3">
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              className="px-3 py-1.5 rounded-pill border"
              style={{
                backgroundColor: activeFilter === f ? "rgba(99,134,136,0.12)" : "transparent",
                borderColor: activeFilter === f ? "#638688" : "rgba(255,255,255,0.06)",
              }}
            >
              <Text
                className="text-[12px] font-medium"
                style={{ color: activeFilter === f ? "#638688" : "#9a9a9a" }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pattern chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 pl-4">
          {PATTERNS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setActivePattern(activePattern === p ? null : p)}
              className="mr-2 px-3 py-1 rounded-pill border"
              style={{
                backgroundColor: activePattern === p ? "rgba(99,134,136,0.12)" : "transparent",
                borderColor: activePattern === p ? "#638688" : "rgba(255,255,255,0.06)",
              }}
            >
              <Text
                className="text-[12px]"
                style={{ color: activePattern === p ? "#638688" : "#9a9a9a" }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Problem list */}
        <View className="px-4 gap-2 pb-4">
          {PROBLEMS.map((p) => {
            const diff = DIFF_STYLE[p.difficulty];
            return (
              <Pressable
                key={p.id}
                className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 active:bg-[#242424]"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-[#f0f0f0] text-[15px] font-semibold flex-1 mr-2">
                    {p.name}
                  </Text>
                  <View className="rounded-tight px-2 py-0.5" style={{ backgroundColor: diff.bg }}>
                    <Text className="text-[11px] font-medium" style={{ color: diff.color }}>
                      {diff.label}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[#9a9a9a] text-[12px]">Pattern: {p.pattern}</Text>
                  <Text
                    className="text-[12px] font-mono"
                    style={{ color: p.mastered ? "#22c55e" : "#9a9a9a" }}
                  >
                    {p.mastered ? "✓ Mastered" : `Next: ${p.nextReview}`}
                  </Text>
                </View>
                {/* Review dots */}
                <View className="flex-row gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: i < p.reviews ? "#638688" : "#242424" }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky stats bar */}
      <View className="bg-[#1a1a1a] border-t border-[rgba(255,255,255,0.06)] px-4 py-3 flex-row justify-between">
        <Text className="text-[#9a9a9a] text-[13px]">
          Total: <Text className="text-[#f0f0f0] font-semibold font-mono">42</Text>
        </Text>
        <Text className="text-[#9a9a9a] text-[13px]">
          Mastered: <Text className="text-[#638688] font-semibold font-mono">12</Text>
        </Text>
        <Text className="text-[#9a9a9a] text-[13px]">
          NeetCode: <Text className="text-[#f0f0f0] font-semibold font-mono">42/150</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
