import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RATINGS = [
  { value: 1, emoji: "😫" },
  { value: 2, emoji: "😐" },
  { value: 3, emoji: "🙂" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "🔥" },
];

// Mock past reflections — will come from API
const PAST_REFLECTIONS = [
  {
    date: "Jun 13",
    content: "Finished BFS/DFS section. Struggled with cycle detection in directed graphs. Tomorrow: finish graph problems.",
    verdict: "surface",
    verdictLabel: "Surface",
    verdictColor: "#f59e0b",
    aiMessage: "Surface-level day. The cycle detection struggle is a real gap — don't move on until it clicks.",
  },
  {
    date: "Jun 12",
    content: "Crushed 5 problems on sliding window. Everything clicked today. Going to do 2 more tomorrow.",
    verdict: "deep_work",
    verdictLabel: "Deep Work",
    verdictColor: "#22c55e",
    aiMessage: "Strong day. Sliding window is pattern-locked for you now. Good intentionality on tomorrow.",
  },
];

type AiResponse = {
  verdict: string;
  verdictLabel: string;
  verdictColor: string;
  message: string;
  microLesson?: { title: string; content: string } | null;
};

export default function ReflectScreen() {
  const [content, setContent]           = useState("");
  const [rating, setRating]             = useState<number | null>(null);
  const [isThinking, setIsThinking]     = useState(false);
  const [aiResponse, setAiResponse]     = useState<AiResponse | null>(null);
  const [submitted, setSubmitted]       = useState(false);
  const scrollRef                       = useRef<ScrollView>(null);
  const thinkingOpacity                 = useRef(new Animated.Value(0)).current;

  function handleSend() {
    if (!content.trim() || isThinking) return;
    setSubmitted(true);
    setIsThinking(true);

    // Animate the thinking dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(thinkingOpacity, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Mock AI response — real call goes to POST /ai/coach
    setTimeout(() => {
      setIsThinking(false);
      setAiResponse({
        verdict: "deep_work",
        verdictLabel: "Deep Work",
        verdictColor: "#22c55e",
        message:
          "Solid session today. Greedy + DP in one sitting shows range. The fact that you can articulate exactly where Word Break broke down (subproblem decomposition) means you're close — revisit it first tomorrow before anything new.",
        microLesson: null,
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 2200);
  }

  const canSend = content.trim().length > 0 && !submitted;

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Reflect</Text>
            <Text style={s.date}>June 14, 2026</Text>
          </View>
          {/* Mood rating — quick tap, not a form field */}
          <View style={s.ratingRow}>
            {RATINGS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRating(r.value)}
                style={[s.ratingBtn, rating === r.value && s.ratingBtnActive]}
              >
                <Text style={{ fontSize: rating === r.value ? 22 : 18 }}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.chatContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Past reflections as conversation history */}
          {PAST_REFLECTIONS.map((r, i) => (
            <View key={i} style={s.conversationBlock}>
              <Text style={s.historyDate}>{r.date}</Text>

              {/* User bubble */}
              <View style={s.userBubbleWrap}>
                <View style={s.userBubble}>
                  <Text style={s.userBubbleText}>{r.content}</Text>
                </View>
              </View>

              {/* AI bubble */}
              <View style={s.aiBubbleWrap}>
                <View style={s.aiAvatar}>
                  <Text style={{ fontSize: 12 }}>✦</Text>
                </View>
                <View style={s.aiBubble}>
                  <View style={[s.verdictPill, { backgroundColor: `${r.verdictColor}18` }]}>
                    <Text style={[s.verdictText, { color: r.verdictColor }]}>● {r.verdictLabel}</Text>
                  </View>
                  <Text style={s.aiBubbleText}>{r.aiMessage}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Today's divider */}
          <View style={s.todayDivider}>
            <View style={s.dividerLine} />
            <Text style={s.todayLabel}>Today</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Today's submission (after send) */}
          {submitted && (
            <View style={s.conversationBlock}>
              <View style={s.userBubbleWrap}>
                <View style={s.userBubble}>
                  <Text style={s.userBubbleText}>{content}</Text>
                </View>
              </View>

              {/* Thinking state */}
              {isThinking && (
                <View style={s.aiBubbleWrap}>
                  <View style={s.aiAvatar}>
                    <Text style={{ fontSize: 12 }}>✦</Text>
                  </View>
                  <Animated.View style={[s.aiBubble, s.thinkingBubble, { opacity: thinkingOpacity }]}>
                    <Text style={s.thinkingText}>thinking  · · ·</Text>
                  </Animated.View>
                </View>
              )}

              {/* AI response */}
              {aiResponse && (
                <View style={s.aiBubbleWrap}>
                  <View style={s.aiAvatar}>
                    <Text style={{ fontSize: 12 }}>✦</Text>
                  </View>
                  <View style={s.aiBubble}>
                    <View style={[s.verdictPill, { backgroundColor: `${aiResponse.verdictColor}18` }]}>
                      <Text style={[s.verdictText, { color: aiResponse.verdictColor }]}>
                        ● {aiResponse.verdictLabel}
                      </Text>
                    </View>
                    <Text style={s.aiBubbleText}>{aiResponse.message}</Text>
                    {aiResponse.microLesson && (
                      <View style={s.microLesson}>
                        <Text style={s.microLessonTitle}>📖 {aiResponse.microLesson.title}</Text>
                        <Text style={s.microLessonBody}>{aiResponse.microLesson.content}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Input area */}
        {!submitted ? (
          <View style={s.inputArea}>
            <TextInput
              style={s.textInput}
              multiline
              value={content}
              onChangeText={setContent}
              placeholder={"What happened today?\nSolved something? Stuck on something? What's next?"}
              placeholderTextColor="#444"
              textAlignVertical="top"
              maxLength={2000}
            />
            <TouchableOpacity
              style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Text style={s.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        ) : (
          !aiResponse && !isThinking ? null : (
            <View style={s.doneBar}>
              <Text style={s.doneText}>Reflection submitted · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          )
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: "#0d0d0d" },
  header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  eyebrow:            { color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase" },
  date:               { color: "#f0f0f0", fontSize: 17, fontWeight: "700", marginTop: 2 },
  ratingRow:          { flexDirection: "row", gap: 2 },
  ratingBtn:          { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  ratingBtnActive:    { backgroundColor: "rgba(99,134,136,0.15)" },

  chatContainer:      { padding: 16, paddingBottom: 8 },

  conversationBlock:  { marginBottom: 20 },
  historyDate:        { color: "#555", fontSize: 11, fontFamily: "monospace", textAlign: "center", marginBottom: 10 },

  userBubbleWrap:     { alignItems: "flex-end", marginBottom: 8 },
  userBubble:         { backgroundColor: "#1e2e2f", borderWidth: 1, borderColor: "rgba(99,134,136,0.25)", borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "85%" },
  userBubbleText:     { color: "#f0f0f0", fontSize: 14, lineHeight: 21 },

  aiBubbleWrap:       { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  aiAvatar:           { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(99,134,136,0.3)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  aiBubble:           { flex: 1, backgroundColor: "#161616", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  aiBubbleText:       { color: "#e0e0e0", fontSize: 14, lineHeight: 22, marginTop: 8 },
  verdictPill:        { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  verdictText:        { fontSize: 11, fontWeight: "600" },

  thinkingBubble:     { paddingVertical: 14 },
  thinkingText:       { color: "#638688", fontSize: 13, letterSpacing: 2 },

  microLesson:        { marginTop: 12, backgroundColor: "rgba(99,134,136,0.08)", borderRadius: 8, padding: 12 },
  microLessonTitle:   { color: "#638688", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  microLessonBody:    { color: "#9a9a9a", fontSize: 12, lineHeight: 18 },

  todayDivider:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, marginTop: 4 },
  dividerLine:        { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  todayLabel:         { color: "#555", fontSize: 11, fontFamily: "monospace" },

  inputArea:          { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "#0d0d0d" },
  textInput:          { flex: 1, backgroundColor: "#141414", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, color: "#f0f0f0", fontSize: 14, lineHeight: 21, maxHeight: 120 },
  sendBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: "#638688", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled:    { backgroundColor: "#242424" },
  sendBtnText:        { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -2 },

  doneBar:            { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  doneText:           { color: "#555", fontSize: 12, fontFamily: "monospace" },
});
