import { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RATINGS = [
  { value: 1, emoji: "😫", label: "Rough" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😊", label: "Great" },
  { value: 5, emoji: "🔥", label: "Crushed it" },
];

const PAST = [
  { date: "Jun 13", verdict: "surface",  label: "Surface",   color: "#f59e0b" },
  { date: "Jun 12", verdict: "deepwork", label: "Deep Work", color: "#22c55e" },
  { date: "Jun 11", verdict: "lazy",     label: "Lazy",      color: "#ef4444" },
];

export default function ReflectScreen() {
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0d0d]">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-5">
          <Text className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">Reflect</Text>
          <Text className="text-[#f0f0f0] text-[20px] font-bold">June 14, 2026</Text>
        </View>

        {/* Rating */}
        <View className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
          <Text className="text-[#9a9a9a] text-[12px] font-medium tracking-widest uppercase mb-4">How was today?</Text>
          <View className="flex-row justify-between">
            {RATINGS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRating(r.value)}
                className="items-center gap-1"
              >
                <Text style={{ fontSize: rating === r.value ? 32 : 24 }}>{r.emoji}</Text>
                <Text className="text-[10px]" style={{ color: rating === r.value ? "#638688" : "#555555" }}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input fields */}
        {[
          { label: "What did you accomplish?", placeholder: "Problems solved, topics studied, breakthroughs..." },
          { label: "What did you struggle with?", placeholder: "Concepts that didn't click, distractions..." },
          { label: "Plan for tomorrow?", placeholder: "3 problems, read system design chapter..." },
        ].map((field) => (
          <View key={field.label} className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 mb-4">
            <Text className="text-[#9a9a9a] text-[12px] font-medium tracking-widest uppercase mb-3">
              {field.label}
            </Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder={field.placeholder}
              placeholderTextColor="#555555"
              className="text-[#f0f0f0] text-[14px]"
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
          </View>
        ))}

        {/* Submit */}
        <TouchableOpacity
          onPress={() => setSubmitted(true)}
          className="bg-[#638688] rounded-card py-4 items-center mb-4"
        >
          <Text className="text-white text-[15px] font-semibold">Submit Reflection</Text>
        </TouchableOpacity>

        {/* AI Feedback (shown after submit) */}
        {submitted && (
          <View className="bg-[#1a1a1a] border border-[rgba(99,134,136,0.2)] rounded-card p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-[rgba(34,197,94,0.12)] rounded-tight px-2 py-1">
                <Text className="text-[#22c55e] text-[12px] font-medium">● Deep Work</Text>
              </View>
              <Text className="text-[#9a9a9a] text-[12px]">AI Coach Feedback</Text>
            </View>
            <Text className="text-[#f0f0f0] text-[14px] leading-6">
              Nice work today, Roshan. You stayed consistent and tackled a hard problem without giving up.
              Keep the momentum going into tomorrow — focus on DP patterns next.
            </Text>
          </View>
        )}

        {/* Past reflections */}
        <View className="border-t border-[rgba(255,255,255,0.04)] pt-4">
          <Text className="text-[#9a9a9a] text-[12px] font-medium tracking-widest uppercase mb-3">Past Reflections</Text>
          {PAST.map((p, i) => (
            <View key={i}>
              {i > 0 && <View className="h-[1px] bg-[rgba(255,255,255,0.04)] my-2" />}
              <TouchableOpacity className="flex-row justify-between items-center py-1">
                <Text className="text-[#9a9a9a] text-[13px] font-mono">{p.date}</Text>
                <View className="rounded-tight px-2 py-0.5" style={{ backgroundColor: `${p.color}20` }}>
                  <Text className="text-[11px] font-medium" style={{ color: p.color }}>● {p.label}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
