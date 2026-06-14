import { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTERS = ["All", "Due Today", "Mastered"];
const PATTERNS = ["Arrays", "Two Pointers", "Stack", "Trees", "Graphs", "DP", "Heap"];

const PROBLEMS = [
  { id: "1", name: "Two Sum",           difficulty: "easy",   pattern: "Arrays",         nextReview: "Tomorrow", reviews: 2, mastered: false },
  { id: "2", name: "Valid Parentheses", difficulty: "medium", pattern: "Stack",           nextReview: "Jun 18",   reviews: 1, mastered: false },
  { id: "3", name: "Binary Search",     difficulty: "easy",   pattern: "Binary Search",   nextReview: "Mastered", reviews: 3, mastered: true  },
  { id: "4", name: "Merge Intervals",   difficulty: "medium", pattern: "Arrays",          nextReview: "Jun 20",   reviews: 0, mastered: false },
  { id: "5", name: "Word Break",        difficulty: "hard",   pattern: "DP",              nextReview: "Today",    reviews: 0, mastered: false },
];

const DIFF: Record<string, { color: string; bg: string }> = {
  easy:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  hard:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

export default function DSAScreen() {
  const [activeFilter, setActiveFilter]   = useState("All");
  const [activePattern, setActivePattern] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.appBar}>
        <Text style={s.pageTitle}>DSA Tracker</Text>
        <TouchableOpacity style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <View style={s.searchRow}>
            <Text style={{ color: "#555", fontSize: 16 }}>⌕</Text>
            <TextInput placeholder="Search problems..." placeholderTextColor="#555" style={s.searchInput} />
          </View>
        </View>

        {/* Filter tabs */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 10 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[s.filterChip, activeFilter === f && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pattern chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingLeft: 16 }}>
          {PATTERNS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setActivePattern(activePattern === p ? null : p)}
              style={[s.patternChip, activePattern === p && s.filterChipActive, { marginRight: 8 }]}
            >
              <Text style={[s.filterChipText, activePattern === p && s.filterChipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Problem list */}
        <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 24 }}>
          {PROBLEMS.map((p) => {
            const diff = DIFF[p.difficulty];
            return (
              <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.75}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={[s.cardTitle, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
                  <View style={[s.badge, { backgroundColor: diff.bg }]}>
                    <Text style={[s.badgeText, { color: diff.color }]}>{p.difficulty}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={s.cardMeta}>Pattern: {p.pattern}</Text>
                  <Text style={[s.cardMeta, { color: p.mastered ? "#22c55e" : "#9a9a9a" }]}>
                    {p.mastered ? "✓ Mastered" : `Next: ${p.nextReview}`}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[s.reviewDot, { backgroundColor: i < p.reviews ? "#638688" : "#242424" }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky stats */}
      <View style={s.statsBar}>
        <Text style={s.statText}>Total: <Text style={s.statValue}>42</Text></Text>
        <Text style={s.statText}>Mastered: <Text style={[s.statValue, { color: "#638688" }]}>12</Text></Text>
        <Text style={s.statText}>NeetCode: <Text style={s.statValue}>42/150</Text></Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#0d0d0d" },
  appBar:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  pageTitle:        { color: "#f0f0f0", fontSize: 20, fontWeight: "700" },
  addBtn:           { backgroundColor: "#638688", borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText:       { color: "#fff", fontSize: 13, fontWeight: "600" },
  searchRow:        { backgroundColor: "#141414", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput:      { flex: 1, color: "#f0f0f0", fontSize: 14 },
  filterChip:       { borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: "rgba(99,134,136,0.12)", borderColor: "#638688" },
  filterChipText:   { color: "#9a9a9a", fontSize: 12, fontWeight: "500" },
  filterChipTextActive: { color: "#638688" },
  patternChip:      { borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5 },
  card:             { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14 },
  cardTitle:        { color: "#f0f0f0", fontSize: 15, fontWeight: "600" },
  cardMeta:         { color: "#9a9a9a", fontSize: 12 },
  badge:            { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:        { fontSize: 11, fontWeight: "500" },
  reviewDot:        { width: 8, height: 8, borderRadius: 4 },
  statsBar:         { backgroundColor: "#1a1a1a", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" },
  statText:         { color: "#9a9a9a", fontSize: 13 },
  statValue:        { color: "#f0f0f0", fontWeight: "600" },
});
