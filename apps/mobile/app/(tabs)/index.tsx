import { useEffect, useRef } from "react";
import { ScrollView, View, Text, TouchableOpacity, Pressable, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { useDeadline } from "@prepsde/hooks";

const TODAY_TASKS = [
  { id: "1", label: "Solve NeetCode — Stack (7 problems)", done: false, estimate: "45 min" },
  { id: "2", label: "Read: Caching & CDNs", done: true, estimate: "20 min" },
  { id: "3", label: "Write STAR story #4", done: false, estimate: "15 min" },
];

const DUE_REVIEWS = [
  { id: "1", name: "Two Sum", tag: "Day 7 review" },
  { id: "2", name: "Valid Parentheses", tag: "Day 15 review" },
];

// Bento metric cards
const METRICS = [
  {
    label: "Day Streak",
    value: "42",
    unit: "days",
    icon: "🔥",
    extra: "streak",
  },
  {
    label: "Due Reviews",
    value: "2",
    unit: "cards",
    icon: "↩",
    progress: { current: 0, total: 2 },
  },
  {
    label: "Problems",
    value: "42",
    unit: "solved",
    icon: "</>",
    segments: { filled: 4, total: 14 }, // 42/150 NeetCode ≈ 4 of 14 segments
  },
  {
    label: "Avg Accuracy",
    value: "78",
    unit: "%",
    icon: "✓",
    progress: { current: 78, total: 100 },
  },
];

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.1, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: "#22c55e",
          opacity,
          transform: [{ scale }],
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" }} />
    </View>
  );
}

function BentoCard({ item }: { item: typeof METRICS[0] }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: 14,
        height: 130,
        justifyContent: "space-between",
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase" }}>
          {item.label}
        </Text>
        <Text style={{ color: "#638688", fontSize: 14 }}>{item.icon}</Text>
      </View>

      {/* Value */}
      <View>
        <Text style={{ color: "#f0f0f0", fontSize: 40, fontWeight: "900", lineHeight: 44 }}>
          {item.value}
          <Text style={{ color: "#9a9a9a", fontSize: 14, fontWeight: "400" }}>{item.unit}</Text>
        </Text>

        {/* Bottom indicator */}
        {item.extra === "streak" && (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#f59e0b" }} />
            ))}
          </View>
        )}
        {item.progress && (
          <View style={{ backgroundColor: "#242424", height: 3, marginTop: 6 }}>
            <View
              style={{
                backgroundColor: "#638688",
                height: "100%",
                width: `${(item.progress.current / item.progress.total) * 100}%`,
              }}
            />
          </View>
        )}
        {item.segments && (
          <View style={{ flexDirection: "row", gap: 2, marginTop: 6 }}>
            {Array.from({ length: item.segments.total }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 1,
                  backgroundColor: i < item.segments!.filled ? "#638688" : "#242424",
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function BurnDownChart() {
  // viewBox 0 0 300 110 — actual path adapted for PrepSDE progress
  const actualPath = "M 0 95 L 40 88 L 90 72 L 130 78 L 175 58 L 220 42 L 220 110 L 0 110 Z";
  const actualLine = "M 0 95 L 40 88 L 90 72 L 130 78 L 175 58 L 220 42";
  const idealLine  = "M 0 95 L 300 10";

  return (
    <View style={{ backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: "#f0f0f0", fontSize: 14, fontWeight: "600" }}>Burn-Down Trajectory</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 12, height: 2, backgroundColor: "#638688", borderRadius: 1 }} />
            <Text style={{ color: "#9a9a9a", fontSize: 10 }}>Actual</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 12, height: 2, backgroundColor: "#555555", borderRadius: 1, borderStyle: "dashed" }} />
            <Text style={{ color: "#9a9a9a", fontSize: 10 }}>Ideal</Text>
          </View>
        </View>
      </View>

      {/* SVG Chart */}
      <Svg width="100%" height={100} viewBox="0 0 300 110" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#638688" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#638688" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Grid lines */}
        {[25, 50, 75].map((y) => (
          <Line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Ideal pace */}
        <Path d={idealLine} fill="none" stroke="#555555" strokeWidth="1.5" strokeDasharray="6,4" />
        {/* Actual fill */}
        <Path d={actualPath} fill="url(#grad)" />
        {/* Actual line */}
        <Path d={actualLine} fill="none" stroke="#638688" strokeWidth="2.5" />
        {/* Current position */}
        <Circle cx="220" cy="42" r="5" fill="#0d0d0d" stroke="#638688" strokeWidth="2" />
        <Circle cx="220" cy="42" r="2" fill="#638688" />
      </Svg>

      {/* X axis labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        {["Start", "Wk 2", "Wk 4", "Wk 6", "Today", "Deadline"].map((label, i) => (
          <Text
            key={label}
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: label === "Today" ? "#638688" : "#555555",
              fontWeight: label === "Today" ? "700" : "400",
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { daysLeft } = useDeadline("2026-12-15");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d0d0d" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Pace indicator pill */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: "rgba(34,197,94,0.10)",
            borderWidth: 1, borderColor: "rgba(34,197,94,0.20)",
            borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 7,
          }}>
            <PulsingDot />
            <Text style={{ color: "#22c55e", fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>
              You are on track
            </Text>
          </View>
        </View>

        {/* App Bar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={{ color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase" }}>
              PrepSDE
            </Text>
            <Text style={{ color: "#f0f0f0", fontSize: 20, fontWeight: "700" }}>Hey, Roshan</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{
              backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
              borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5,
              flexDirection: "row", alignItems: "center", gap: 4,
            }}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={{ color: "#f0f0f0", fontSize: 13, fontWeight: "600" }}>12</Text>
            </View>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#638688", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>AR</Text>
            </View>
          </View>
        </View>

        {/* Deadline Hero Card */}
        <View style={{
          backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(99,134,136,0.2)",
          borderRadius: 12, padding: 20, marginBottom: 12,
        }}>
          <Text style={{ color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
            Days to Interview
          </Text>
          <Text style={{ color: "#f0f0f0", fontSize: 64, fontWeight: "900", lineHeight: 68, marginBottom: 4 }}>
            {daysLeft}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#9a9a9a", fontSize: 13 }}>Target: Dec 15, 2026</Text>
            <View style={{ backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: "#22c55e", fontSize: 11, fontWeight: "500" }}>● On Track</Text>
            </View>
          </View>
          <View style={{ marginTop: 14, backgroundColor: "#242424", height: 3 }}>
            <View style={{ backgroundColor: "#638688", height: "100%", width: "36%" }} />
          </View>
          <Text style={{ color: "#555555", fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
            36% of prep complete
          </Text>
        </View>

        {/* Bento 2×2 metric cards */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <BentoCard item={METRICS[0]} />
          <BentoCard item={METRICS[1]} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <BentoCard item={METRICS[2]} />
          <BentoCard item={METRICS[3]} />
        </View>

        {/* Burn-Down Chart */}
        <BurnDownChart />

        {/* Today's Tasks */}
        <View style={{
          backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
          borderRadius: 8, marginBottom: 12, overflow: "hidden",
        }}>
          <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#f0f0f0", fontSize: 14, fontWeight: "600" }}>Today's Tasks</Text>
            <Text style={{ color: "#9a9a9a", fontSize: 12 }}>
              {TODAY_TASKS.filter((t) => !t.done).length} remaining
            </Text>
          </View>
          {TODAY_TASKS.map((task, i) => (
            <View key={task.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 14 }} />}
              <Pressable style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <View style={{ width: 3, alignSelf: "stretch", borderRadius: 9999, backgroundColor: task.done ? "#555555" : "#638688" }} />
                <Text style={{ flex: 1, fontSize: 13, color: task.done ? "#555555" : "#f0f0f0", textDecorationLine: task.done ? "line-through" : "none" }}>
                  {task.label}
                </Text>
                <View style={{ backgroundColor: "#242424", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: "#9a9a9a", fontSize: 11, fontFamily: "monospace" }}>{task.estimate}</Text>
                </View>
              </Pressable>
            </View>
          ))}
          <View style={{ height: 12 }} />
        </View>

        {/* Due Reviews */}
        <View style={{ backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: "#f0f0f0", fontSize: 14, fontWeight: "600" }}>Due for Review</Text>
            <View style={{ backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "500" }}>{DUE_REVIEWS.length} due</Text>
            </View>
          </View>
          {DUE_REVIEWS.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginVertical: 8 }} />}
              <TouchableOpacity style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }}>
                <Text style={{ color: "#f0f0f0", fontSize: 13 }}>{r.name}</Text>
                <Text style={{ color: "#9a9a9a", fontSize: 11, fontFamily: "monospace" }}>{r.tag}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
