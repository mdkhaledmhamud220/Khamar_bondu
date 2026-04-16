import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

function StatCard({ icon, label, value, color, onPress }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={[styles.statIconWrap, { backgroundColor: (color || Colors.primary) + '18' }]}>
        <Ionicons name={icon} size={22} color={color || Colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FarmDashboard() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   api.get('/farm/dashboard')
  //     .then(r => setData(r.data.data))
  //     .catch(() => {})
  //     .finally(() => setLoading(false));
  // }, []);

  useEffect(() => {
  // fake delay (loading effect)
  setTimeout(() => {
    const mockData = {
      totalCows: 12,
      availableCows: 7,
      soldCows: 5,
      milkIncomeLastMonth: 18500,
      totalInvestment: 250000,
      totalExpectedValue: 320000,
      estimatedProfit: 70000,
    };

    setData(mockData);
    setLoading(false);
  }, 1000); // 1 sec loading দেখাবে
}, []);

  const fmt = (n) => `৳ ${(n || 0).toLocaleString('bn-BD')}`;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const profit = data?.estimatedProfit || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>আমার খামার</Text>
        <Text style={styles.headerSub}>সার্বিক অবস্থা</Text>

        {/* Profit/loss hero */}
        <View style={styles.heroBox}>
          <Text style={styles.heroLabel}>আনুমানিক মুনাফা</Text>
          <Text style={[styles.heroValue, { color: profit >= 0 ? Colors.accentLight : '#FF8A80' }]}>
            {profit >= 0 ? '+' : ''}{fmt(profit)}
          </Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroSub}>বিনিয়োগ: {fmt(data?.totalInvestment)}</Text>
            <Text style={styles.heroDot}>•</Text>
            <Text style={styles.heroSub}>আনুমানিক মূল্য: {fmt(data?.totalExpectedValue)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="paw-outline"         label="মোট গরু"      value={`${data?.totalCows || 0}টি`}    color={Colors.primary} />
          <StatCard icon="checkmark-circle-outline" label="বিক্রির জন্য" value={`${data?.availableCows || 0}টি`} color={Colors.success} />
          <StatCard icon="cart-outline"         label="বিক্রি হয়েছে" value={`${data?.soldCows || 0}টি`}    color={Colors.info} />
          <StatCard icon="water-outline"        label="দুধের আয় (৩০দিন)" value={fmt(data?.milkIncomeLastMonth)} color={Colors.warning} />
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>দ্রুত কাজ</Text>
          <View style={styles.actionGrid}>
            {[
              { icon: 'add-circle-outline',   label: 'গরু যোগ করুন',    route: './../cows/add',        color: Colors.primary },
              { icon: 'list-outline',          label: 'আমার গরুগুলো',    route: './../farm/dashboard',   color: Colors.primaryMid },
              { icon: 'water-outline',         label: 'দুধের লগ',         route: './../farm/milk',       color: Colors.info },
              { icon: 'cash-outline',          label: 'খরচ যোগ করুন',    route: './../farm/costs',      color: Colors.warning },
              { icon: 'analytics-outline',     label: 'মুনাফা বিশ্লেষণ', route: './../farm/profit',     color: Colors.success },
              { icon: 'medkit-outline',        label: 'স্বাস্থ্য ট্র্যাক',route: './../farm/health',     color: Colors.error },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.route)} activeOpacity={0.85}>
                <View style={[styles.actionIcon, { backgroundColor: a.color + '18' }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tip box */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
          <Text style={styles.tipText}>
            নিয়মিত ওজন আপডেট করলে Health Score সঠিক থাকে এবং ভালো দামে গরু বিক্রি হওয়ার সম্ভাবনা বাড়ে।
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { paddingTop: 54, paddingHorizontal: Spacing.lg, paddingBottom: 32, overflow: 'hidden' },
  circle1:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -50 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSub:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.lg },

  heroBox:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroValue: { fontSize: FontSize.xxxl, fontWeight: '800', marginBottom: 8 },
  heroRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroSub:   { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.65)' },
  heroDot:   { color: 'rgba(255,255,255,0.4)' },

  scroll:     { flex: 1 },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.lg, gap: Spacing.md },
  statCard:   { width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  statIconWrap: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLabel:  { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  section:      { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionCard: { width: '30%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  actionIcon: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  actionLabel:{ fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },

  tipBox:  { marginHorizontal: Spacing.lg, backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '40' },
  tipText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
