import { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RATINGS = [
  { value: 1, emoji: "😫", label: "Rough" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😊", label: "Great" },
  { value: 5, emoji: "🔥", label: "Crushed it" },
];

const PAST = [
  { date: "Jun 13", label: "Surface",   color: "#f59e0b" },
  { date: "Jun 12", label: "Deep Work", color: "#22c55e" },
  { date: "Jun 11", label: "Lazy",      color: "#ef4444" },
];

export default function ReflectScreen() {
  const [rating, setRating]       = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>Reflect</Text>
        <Text style={s.pageTitle}>June 14, 2026</Text>

        {/* Rating */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>How was today?</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            {RATINGS.map((r) => (
              <TouchableOpacity key={r.value} onPress={() => setRating(r.value)} style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: rating === r.value ? 30 : 22 }}>{r.emoji}</Text>
                <Text style={[s.ratingLabel, rating === r.value && { color: "#638688" }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inputs */}
        {[
          { label: "What did you accomplish?",  placeholder: "Problems solved, topics studied..." },
          { label: "What did you struggle with?", placeholder: "Concepts that didn't click..." },
          { label: "Plan for tomorrow?",          placeholder: "3 problems, read system design..." },
        ].map((f) => (
          <View key={f.label} style={s.card}>
            <Text style={s.sectionLabel}>{f.label}</Text>
            <TextInput
              multiline
              placeholder={f.placeholder}
              placeholderTextColor="#555"
              style={s.textInput}
              textAlignVertical="top"
            />
          </View>
        ))}

        <TouchableOpacity style={s.submitBtn} onPress={() => setSubmitted(true)}>
          <Text style={s.submitBtnText}>Submit Reflection</Text>
        </TouchableOpacity>

        {submitted && (
          <View style={[s.card, { borderColor: "rgba(99,134,136,0.2)" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={[s.badge, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                <Text style={{ color: "#22c55e", fontSize: 12, fontWeight: "500" }}>● Deep Work</Text>
              </View>
              <Text style={s.cardMeta}>AI Coach Feedback</Text>
            </View>
            <Text style={s.bodyText}>
              Nice work today, Roshan. You stayed consistent and tackled a hard problem without giving up.
              Keep the momentum going — focus on DP patterns tomorrow.
            </Text>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)", paddingTop: 16, marginTop: 4 }}>
          <Text style={[s.sectionLabel, { marginBottom: 12 }]}>Past Reflections</Text>
          {PAST.map((p, i) => (
            <View key={i}>
              {i > 0 && <View style={s.divider} />}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                <Text style={s.cardMeta}>{p.date}</Text>
                <View style={[s.badge, { backgroundColor: `${p.color}20` }]}>
                  <Text style={{ color: p.color, fontSize: 11, fontWeight: "500" }}>● {p.label}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#0d0d0d" },
  eyebrow:      { color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  pageTitle:    { color: "#f0f0f0", fontSize: 20, fontWeight: "700", marginBottom: 20 },
  card:         { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 12 },
  sectionLabel: { color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" },
  ratingLabel:  { color: "#555", fontSize: 10 },
  textInput:    { color: "#f0f0f0", fontSize: 14, minHeight: 72, marginTop: 10 },
  submitBtn:    { backgroundColor: "#638688", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  submitBtnText:{ color: "#fff", fontSize: 15, fontWeight: "600" },
  badge:        { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  cardMeta:     { color: "#9a9a9a", fontSize: 12 },
  bodyText:     { color: "#f0f0f0", fontSize: 14, lineHeight: 22 },
  divider:      { height: 1, backgroundColor: "rgba(255,255,255,0.04)" },
});
