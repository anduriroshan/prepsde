import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATS = [
  { label: "Days Left",      value: "184" },
  { label: "Day Streak",     value: "42"  },
  { label: "Cards Reviewed", value: "312" },
];

const PLAN_ROWS = [
  ["Target",       "SDE2 @ Google"],
  ["Duration",     "24 weeks"],
  ["Start",        "Jun 16, 2026"],
  ["Deadline",     "Dec 15, 2026"],
  ["Adjustments",  "+3 / -1 days"],
];

const NOTIFS = [
  { label: "Daily reminder", time: "9:00 PM" },
  { label: "Weekly summary", time: "Sunday"  },
  { label: "Pod updates",    time: ""         },
];

export default function ProfileScreen() {
  const [notifStates, setNotifStates] = useState([true, true, true]);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>Profile</Text>

        {/* User card */}
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>AR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>Roshan A.</Text>
            <Text style={s.userEmail}>anduri.roshan@accenture.com</Text>
            <Text style={s.mono}>Member since Jun 2026</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          {STATS.map((stat) => (
            <View key={stat.label} style={[s.card, s.statTile]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={[s.cardMeta, { textAlign: "center" }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Plan */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={s.cardTitle}>Your Plan</Text>
            <TouchableOpacity><Text style={{ color: "#638688", fontSize: 13 }}>Edit →</Text></TouchableOpacity>
          </View>
          {PLAN_ROWS.map(([label, value], i) => (
            <View key={label} style={[s.planRow, i < PLAN_ROWS.length - 1 && s.divider]}>
              <Text style={s.cardMeta}>{label}</Text>
              <Text style={s.mono}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Pod */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={s.cardTitle}>Accountability Pod</Text>
            <TouchableOpacity><Text style={{ color: "#638688", fontSize: 13 }}>View →</Text></TouchableOpacity>
          </View>
          <Text style={s.cardMeta}>"DSA Grinders" · 4 members</Text>
          <Text style={[s.cardMeta, { marginTop: 4 }]}>This week's leader: <Text style={{ color: "#f0f0f0" }}>Priya 🔥</Text></Text>
        </View>

        {/* Notifications */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 12 }]}>Notifications</Text>
          {NOTIFS.map((n, i) => (
            <View key={n.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View>
                <Text style={{ color: "#f0f0f0", fontSize: 14 }}>{n.label}</Text>
                {n.time ? <Text style={s.mono}>{n.time}</Text> : null}
              </View>
              <Switch
                value={notifStates[i]}
                onValueChange={(v) => setNotifStates((prev) => prev.map((val, idx) => idx === i ? v : val))}
                trackColor={{ false: "#242424", true: "rgba(99,134,136,0.4)" }}
                thumbColor={notifStates[i] ? "#638688" : "#555"}
              />
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={[s.card, { padding: 0, overflow: "hidden" }]}>
          {["Export Data", "Log Out"].map((label, i) => (
            <TouchableOpacity key={label} style={[s.actionRow, s.divider]}>
              <Text style={{ color: "#f0f0f0", fontSize: 14 }}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.actionRow}>
            <Text style={{ color: "#ef4444", fontSize: 14 }}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: "#0d0d0d" },
  eyebrow:   { color: "#9a9a9a", fontSize: 11, fontWeight: "500", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 },
  card:      { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, marginBottom: 12 },
  cardTitle: { color: "#f0f0f0", fontSize: 15, fontWeight: "600" },
  cardMeta:  { color: "#9a9a9a", fontSize: 13 },
  mono:      { color: "#555", fontSize: 12, fontFamily: "monospace", marginTop: 2 },
  avatar:    { width: 56, height: 56, borderRadius: 28, backgroundColor: "#638688", alignItems: "center", justifyContent: "center" },
  avatarText:{ color: "#fff", fontSize: 20, fontWeight: "700" },
  userName:  { color: "#f0f0f0", fontSize: 18, fontWeight: "700" },
  userEmail: { color: "#9a9a9a", fontSize: 13, marginTop: 2 },
  statTile:  { flex: 1, alignItems: "center", paddingVertical: 14 },
  statValue: { color: "#638688", fontSize: 24, fontWeight: "900", fontFamily: "monospace" },
  planRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  divider:   { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  actionRow: { paddingHorizontal: 14, paddingVertical: 14 },
});
