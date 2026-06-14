import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOPICS = [
  { name: "Arrays",       pct: 100 },
  { name: "Two Pointers", pct: 75  },
  { name: "Stack",        pct: 55  },
  { name: "Trees",        pct: 25  },
  { name: "Graphs",       pct: 10  },
  { name: "DP",           pct: 0   },
];

const WEEKS = [
  { label: "Week 4 (Jun 9–15)", problems: 11, sd: 3, verdict: "surface",  verdictLabel: "Surface",   verdictColor: "#f59e0b", change: "none"    },
  { label: "Week 3 (Jun 2–8)",  problems: 8,  sd: 2, verdict: "surface",  verdictLabel: "Surface",   verdictColor: "#f59e0b", change: "+1 day"  },
  { label: "Week 2 (May 26–1)", problems: 10, sd: 2, verdict: "deepwork", verdictLabel: "Deep Work", verdictColor: "#22c55e", change: "none"    },
];

const HEATMAP_COLORS = ["#242424", "rgba(99,134,136,0.3)", "rgba(99,134,136,0.6)", "#638688"];
const HEATMAP = Array.from({ length: 8 }, () =>
  Array.from({ length: 7 }, () => {
    const r = Math.random();
    return r > 0.6 ? 3 : r > 0.35 ? 2 : r > 0.15 ? 1 : 0;
  })
);

export default function ProgressScreen() {
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>Progress</Text>
        <Text style={s.pageTitle}>Analytics</Text>

        {/* Phase progress */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.cardTitle}>Phase 1 — Foundation Reset</Text>
            <Text style={s.mono}>Week 4/6</Text>
          </View>
          <View style={s.track}><View style={[s.fill, { width: "66%" }]} /></View>
          <Text style={[s.cardMeta, { marginTop: 4 }]}>Gate: 60 problems + 4 weeks reflections</Text>
        </View>

        {/* Heatmap */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 12 }]}>Activity</Text>
          <View style={{ gap: 3 }}>
            {HEATMAP.map((row, wi) => (
              <View key={wi} style={{ flexDirection: "row", gap: 3 }}>
                {row.map((intensity, di) => (
                  <View key={di} style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: HEATMAP_COLORS[intensity] }} />
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 10, alignItems: "center" }}>
            <Text style={s.cardMeta}>Less</Text>
            {HEATMAP_COLORS.map((c, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
            ))}
            <Text style={s.cardMeta}>More</Text>
          </View>
        </View>

        {/* Topic mastery */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 12 }]}>Topic Mastery</Text>
          {TOPICS.map((t) => (
            <View key={t.name} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={s.cardMeta}>{t.name}</Text>
                <Text style={s.mono}>{t.pct}%</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${t.pct}%`, backgroundColor: t.pct === 100 ? "#22c55e" : "#638688" }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Weekly summaries */}
        <Text style={[s.eyebrow, { marginBottom: 12 }]}>Weekly Summaries</Text>
        {WEEKS.map((w, i) => (
          <View key={i} style={[s.card, { marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={s.cardTitle}>{w.label}</Text>
              <View style={[s.badge, { backgroundColor: `${w.verdictColor}20` }]}>
                <Text style={{ color: w.verdictColor, fontSize: 11, fontWeight: "500" }}>● {w.verdictLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Text style={s.cardMeta}>Problems: <Text style={{ color: "#f0f0f0" }}>{w.problems}</Text></Text>
              <Text style={s.cardMeta}>SD: <Text style={{ color: "#f0f0f0" }}>{w.sd}</Text></Text>
              <Text style={s.cardMeta}>Deadline: <Text style={{ color: w.change === "none" ? "#555" : "#f59e0b" }}>{w.change}</Text></Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: "#0d0d0d" },
  eyebrow:   { color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  pageTitle: { color: "#f0f0f0", fontSize: 20, fontWeight: "700", marginBottom: 20 },
  card:      { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 12 },
  cardTitle: { color: "#f0f0f0", fontSize: 14, fontWeight: "600" },
  cardMeta:  { color: "#9a9a9a", fontSize: 12 },
  mono:      { color: "#9a9a9a", fontSize: 12, fontFamily: "monospace" },
  track:     { backgroundColor: "#242424", height: 4 },
  fill:      { backgroundColor: "#638688", height: "100%" },
  badge:     { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
});
