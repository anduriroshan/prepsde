import { ScrollView, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOPICS = [
  { name: "Arrays",       pct: 100 },
  { name: "Two Pointers", pct: 75 },
  { name: "Stack",        pct: 55 },
  { name: "Trees",        pct: 25 },
  { name: "Graphs",       pct: 10 },
  { name: "DP",           pct: 0 },
];

const WEEKS = [
  { label: "Week 4 (Jun 9–15)", problems: 11, sd: 3, reflection: "surface",  deadlineChange: "none" },
  { label: "Week 3 (Jun 2–8)",  problems: 8,  sd: 2, reflection: "surface",  deadlineChange: "+1 day" },
  { label: "Week 2 (May 26–1)", problems: 10, sd: 2, reflection: "deepwork", deadlineChange: "none" },
];

// 7 cols x 8 rows heatmap (8 weeks)
const HEATMAP = Array.from({ length: 8 }, (_, week) =>
  Array.from({ length: 7 }, (_, day) => {
    const rand = Math.random();
    if (rand > 0.6) return 3;
    if (rand > 0.35) return 2;
    if (rand > 0.15) return 1;
    return 0;
  })
);

const HEATMAP_COLORS = [
  "#242424",
  "rgba(99,134,136,0.3)",
  "rgba(99,134,136,0.6)",
  "#638688",
];

const VERDICT_COLOR: Record<string, string> = {
  deepwork: "#22c55e",
  surface: "#f59e0b",
  lazy: "#ef4444",
};
const VERDICT_LABEL: Record<string, string> = {
  deepwork: "Deep Work",
  surface: "Surface",
  lazy: "Lazy",
};

export default function ProgressScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0d0d0d]">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">Progress</Text>
        <Text className="text-[#f0f0f0] text-[20px] font-bold mb-5">Analytics</Text>

        {/* Phase progress */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-[#f0f0f0] text-[14px] font-semibold">Phase 1 — Foundation Reset</Text>
            <Text className="text-[#9a9a9a] text-[12px] font-mono">Week 4/6</Text>
          </View>
          <View className="bg-[#242424] h-[4px] mb-1">
            <View className="bg-[#638688] h-full" style={{ width: "66%" }} />
          </View>
          <Text className="text-[#555555] text-[11px] font-mono">Gate: 60 problems + 4 weeks of reflections</Text>
        </View>

        {/* Heatmap */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <Text className="text-[#f0f0f0] text-[15px] font-semibold mb-3">Activity</Text>
          <View className="gap-1">
            {HEATMAP.map((row, wi) => (
              <View key={wi} className="flex-row gap-1">
                {row.map((intensity, di) => (
                  <View
                    key={di}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: HEATMAP_COLORS[intensity],
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
          <View className="flex-row gap-2 mt-3 items-center">
            <Text className="text-[#555555] text-[10px]">Less</Text>
            {HEATMAP_COLORS.map((c, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
            ))}
            <Text className="text-[#555555] text-[10px]">More</Text>
          </View>
        </View>

        {/* Topic mastery */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <Text className="text-[#f0f0f0] text-[15px] font-semibold mb-3">Topic Mastery</Text>
          {TOPICS.map((t) => (
            <View key={t.name} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-[#9a9a9a] text-[13px]">{t.name}</Text>
                <Text className="text-[#9a9a9a] text-[12px] font-mono">{t.pct}%</Text>
              </View>
              <View className="bg-[#242424] h-[4px]">
                <View
                  className="h-full"
                  style={{
                    width: `${t.pct}%`,
                    backgroundColor: t.pct === 100 ? "#22c55e" : "#638688",
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Weekly summaries */}
        <Text className="text-[#9a9a9a] text-[12px] font-medium tracking-widest uppercase mb-3">Weekly Summaries</Text>
        {WEEKS.map((w, i) => (
          <View key={i} className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[#f0f0f0] text-[14px] font-semibold">{w.label}</Text>
              <View
                className="rounded-tight px-2 py-0.5"
                style={{ backgroundColor: `${VERDICT_COLOR[w.reflection]}20` }}
              >
                <Text className="text-[11px] font-medium" style={{ color: VERDICT_COLOR[w.reflection] }}>
                  ● {VERDICT_LABEL[w.reflection]}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-4">
              <Text className="text-[#9a9a9a] text-[12px]">
                Problems: <Text className="text-[#f0f0f0] font-mono">{w.problems}</Text>
              </Text>
              <Text className="text-[#9a9a9a] text-[12px]">
                SD: <Text className="text-[#f0f0f0] font-mono">{w.sd}</Text>
              </Text>
              <Text className="text-[#9a9a9a] text-[12px]">
                Deadline: <Text
                  className="font-mono"
                  style={{ color: w.deadlineChange === "none" ? "#555555" : "#f59e0b" }}
                >
                  {w.deadlineChange}
                </Text>
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
