import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// import api from '../../config/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const fmt   = (n) => `৳${(n || 0).toLocaleString('bn-BD')}`;
const fmtL  = (n) => `${(n || 0).toFixed(1)} লি.`;

// ── Add Log Modal ──────────────────────────────────────────────────────────
function AddLogModal({ visible, cows, onClose, onSaved }) {
  const [cowId,        setCowId]        = useState('');
  const [date,         setDate]         = useState(today());
  const [morning,      setMorning]      = useState('');
  const [evening,      setEvening]      = useState('');
  const [price,        setPrice]        = useState('60');
  const [sold,         setSold]         = useState('');
  const [note,         setNote]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [step,         setStep]         = useState(1); // 1: cow select, 2: data entry

  const totalLiters = (parseFloat(morning) || 0) + (parseFloat(evening) || 0);
  const soldLiters  = parseFloat(sold) || totalLiters;
  const income      = soldLiters * (parseFloat(price) || 60);

  const reset = () => {
    setCowId(''); setDate(today()); setMorning(''); setEvening('');
    setPrice('60'); setSold(''); setNote(''); setStep(1);
  };

  // const handleSave = async () => {
  //   if (!cowId)    return Alert.alert('ত্রুটি', 'গরু নির্বাচন করুন।');
  //   if (!morning)  return Alert.alert('ত্রুটি', 'সকালের দুধের পরিমাণ দিন।');
  //   setLoading(true);
  //   try {
  //     await api.post('/farm/milk', {
  //       cowId, date,
  //       morningLiters: parseFloat(morning),
  //       eveningLiters: parseFloat(evening || 0),
  //       pricePerLiter: parseFloat(price),
  //       soldLiters: parseFloat(sold || totalLiters),
  //       note,
  //     });
  //     Alert.alert('✅ সফল', 'দুধের লগ যোগ হয়েছে।');
  //     reset();
  //     onSaved();
  //     onClose();
  //   } catch (e) {
  //     Alert.alert('ত্রুটি', e.userMessage || 'লগ যোগ করা যায়নি।');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSave = async () => {
    if (!cowId) return Alert.alert('ত্রুটি', 'গরু নির্বাচন করুন।');
    if (!morning) return Alert.alert('ত্রুটি', 'সকালের দুধের পরিমাণ দিন।');

    setLoading(true);

    try {
      const total = (parseFloat(morning) || 0) + (parseFloat(evening) || 0);
      const soldL = parseFloat(sold) || total;
      const priceL = parseFloat(price) || 60;

      const newLog = {
        id: Date.now().toString(),
        cowId,
        cowName: cows.find(c => c.id === cowId)?.name || '',
        date,
        morningLiters: parseFloat(morning),
        eveningLiters: parseFloat(evening || 0),
        totalLiters: total,
        soldLiters: soldL,
        pricePerLiter: priceL,
        income: soldL * priceL,
        note,
      };

      onSaved(newLog); // 🔥 parent এ পাঠাচ্ছি

      Alert.alert('✅ সফল', 'দুধের লগ যোগ হয়েছে।');

      reset();
      onClose();
    } catch (e) {
      Alert.alert('ত্রুটি', 'লগ যোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>দুধের লগ যোগ করুন</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.modalSave}>সেভ</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {/* Cow selector */}
          <Text style={styles.fieldLabel}>গরু নির্বাচন করুন *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cowScroll}>
            {cows.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.cowChip, cowId === c.id && styles.cowChipActive]}
                onPress={() => setCowId(c.id)}
              >
                <Text style={styles.cowChipEmoji}>🐄</Text>
                <Text style={[styles.cowChipText, cowId === c.id && styles.cowChipTextActive]}>
                  {c.name || c.breed}
                </Text>
              </TouchableOpacity>
            ))}
            {cows.length === 0 && (
              <Text style={styles.noCowText}>আগে গরু যোগ করুন</Text>
            )}
          </ScrollView>

          {/* Date */}
          <Text style={styles.fieldLabel}>তারিখ</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* Morning / Evening */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>🌅 সকাল (লিটার) *</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={morning} onChangeText={setMorning} placeholder="0.0" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>🌙 বিকাল (লিটার)</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={evening} onChangeText={setEvening} placeholder="0.0" keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* Price per liter */}
          <Text style={styles.fieldLabel}>প্রতি লিটার দাম (৳)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={18} color={Colors.primary} />
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>

          {/* Sold liters */}
          <Text style={styles.fieldLabel}>বিক্রি করা পরিমাণ (লিটার) — খালি রাখলে সব বিক্রি ধরবে</Text>
          <View style={styles.inputRow}>
            <Ionicons name="water-outline" size={18} color={Colors.primary} />
            <TextInput style={styles.input} value={sold} onChangeText={setSold} placeholder={`${totalLiters.toFixed(1)}`} keyboardType="numeric" />
          </View>

          {/* Income preview */}
          {totalLiters > 0 && (
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>মোট দুধ</Text>
                <Text style={styles.previewValue}>{fmtL(totalLiters)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>বিক্রি</Text>
                <Text style={styles.previewValue}>{fmtL(soldLiters)}</Text>
              </View>
              <View style={[styles.previewRow, styles.previewTotal]}>
                <Text style={styles.previewLabelBold}>আয়</Text>
                <Text style={styles.previewIncome}>{fmt(income)}</Text>
              </View>
            </View>
          )}

          {/* Note */}
          <Text style={styles.fieldLabel}>নোট (ঐচ্ছিক)</Text>
          <TextInput
            style={[styles.inputRow, styles.textarea]}
            value={note}
            onChangeText={setNote}
            placeholder="যেকোনো মন্তব্য..."
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Log Card ───────────────────────────────────────────────────────────────
function LogCard({ log, cowName }) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logLeft}>
        <Text style={styles.logDate}>{log.date}</Text>
        <Text style={styles.logCow}>🐄 {cowName}</Text>
        <View style={styles.logDetails}>
          <View style={styles.logChip}>
            <Text style={styles.logChipText}>🌅 {log.morningLiters}লি.</Text>
          </View>
          {log.eveningLiters > 0 && (
            <View style={styles.logChip}>
              <Text style={styles.logChipText}>🌙 {log.eveningLiters}লি.</Text>
            </View>
          )}
          <View style={styles.logChip}>
            <Text style={styles.logChipText}>মোট {log.totalLiters}লি.</Text>
          </View>
        </View>
      </View>
      <View style={styles.logRight}>
        <Text style={styles.logIncome}>{fmt(log.income)}</Text>
        <Text style={styles.logPriceHint}>৳{log.pricePerLiter}/লি.</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function MilkLogScreen() {
  const router = useRouter();
  const [logs,      setLogs]      = useState([]);
  const [cows,      setCows]      = useState([]);
  const [summary,   setSummary]   = useState({ totalLiters: 0, totalIncome: 0 });
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  //mock data
  const MOCK_COWS = [
    { id: 'c1', name: 'রানি', breed: 'দেশি' },
    { id: 'c2', name: 'মহেশ', breed: 'শাহীওয়াল' },
  ];

  const MOCK_LOGS = [
    {
      id: '1',
      cowId: 'c1',
      cowName: 'রানি',
      date: '2026-04-10',
      morningLiters: 3,
      eveningLiters: 2,
      totalLiters: 5,
      soldLiters: 5,
      pricePerLiter: 60,
      income: 300,
    },
    {
      id: '2',
      cowId: 'c2',
      cowName: 'মহেশ',
      date: '2026-04-09',
      morningLiters: 4,
      eveningLiters: 3,
      totalLiters: 7,
      soldLiters: 6,
      pricePerLiter: 65,
      income: 390,
    },
  ];

  // const loadData = useCallback(async () => {
  //   try {
  //     const [cowsRes] = await Promise.all([
  //       api.get('/cows', { params: { farmerId: 'me' } }),
  //     ]);
  //     const myCows = cowsRes.data.data || [];
  //     setCows(myCows);

  //     // Fetch milk logs for all cows
  //     let allLogs = [];
  //     for (const cow of myCows.slice(0, 5)) {
  //       try {
  //         const r = await api.get(`/farm/milk/${cow.id}`);
  //         const logsWithCow = (r.data.data || []).map(l => ({ ...l, cowName: cow.name || cow.breed }));
  //         allLogs = [...allLogs, ...logsWithCow];
  //       } catch {}
  //     }
  //     allLogs.sort((a, b) => b.date.localeCompare(a.date));
  //     setLogs(allLogs);

  //     const totalLiters = allLogs.reduce((s, l) => s + (l.totalLiters || 0), 0);
  //     const totalIncome = allLogs.reduce((s, l) => s + (l.income || 0), 0);
  //     setSummary({ totalLiters, totalIncome });
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const loadData = useCallback(async () => {
    try {
      setCows(MOCK_COWS);
      setLogs(MOCK_LOGS);

      const totalLiters = MOCK_LOGS.reduce((s, l) => s + l.totalLiters, 0);
      const totalIncome = MOCK_LOGS.reduce((s, l) => s + l.income, 0);

      setSummary({ totalLiters, totalIncome });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#01579B', '#0277BD']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>দুধের লগ</Text>
        <Text style={styles.headerSub}>প্রতিদিনের দুধ ও আয়ের হিসাব</Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalLiters.toFixed(1)} লি.</Text>
            <Text style={styles.summaryLabel}>মোট দুধ (৩০দিন)</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmt(summary.totalIncome)}</Text>
            <Text style={styles.summaryLabel}>মোট আয় (৩০দিন)</Text>
          </View>
        </View>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <LogCard log={item} cowName={item.cowName} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🥛</Text>
              <Text style={styles.emptyText}>এখনো কোনো লগ নেই</Text>
              <Text style={styles.emptyHint}>নিচের + বোতাম দিয়ে যোগ করুন</Text>
            </View>
          }
          ListHeaderComponent={
            logs.length > 0
              ? <Text style={styles.listHeader}>সর্বশেষ {logs.length}টি লগ</Text>
              : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.9}>
        <LinearGradient colors={['#0277BD', '#01579B']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <AddLogModal
        visible={showModal}
        cows={cows}
        onClose={() => setShowModal(false)}
        onSaved={(newLog) => {
          setLogs(prev => [newLog, ...prev]);

          setSummary(prev => ({
            totalLiters: prev.totalLiters + newLog.totalLiters,
            totalIncome: prev.totalIncome + newLog.income,
          }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:     { paddingTop: 54, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, overflow: 'hidden' },
  circle1:    { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -50 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  headerTitle:{ fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSub:  { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.lg },

  summaryRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  summaryCard:   { flex: 1, alignItems: 'center' },
  summaryValue:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  summaryLabel:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: Spacing.md },

  list:       { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  listHeader: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },

  logCard:    { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadow.sm },
  logLeft:    { flex: 1 },
  logDate:    { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: 2 },
  logCow:     { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  logDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  logChip:    { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  logChipText:{ fontSize: FontSize.xs, color: '#1565C0', fontWeight: '600' },
  logRight:   { alignItems: 'flex-end' },
  logIncome:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  logPriceHint:{ fontSize: FontSize.xs, color: Colors.textMuted },

  empty:      { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyText:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyHint:  { fontSize: FontSize.sm, color: Colors.textMuted },

  fab:     { position: 'absolute', bottom: 24, right: 24 },
  fabGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', ...Shadow.lg },

  // Modal
  modal:        { flex: 1, backgroundColor: Colors.white },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingTop: Spacing.xl + 8 },
  modalTitle:   { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  modalSave:    { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  modalScroll:  { flex: 1, padding: Spacing.lg },

  fieldLabel:   { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  cowScroll:    { marginBottom: Spacing.sm },
  cowChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: Spacing.sm },
  cowChipActive:{ borderColor: Colors.primary, backgroundColor: Colors.accentPale },
  cowChipEmoji: { fontSize: 18 },
  cowChipText:  { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  cowChipTextActive: { color: Colors.primary },
  noCowText:    { fontSize: FontSize.sm, color: Colors.textMuted, paddingVertical: Spacing.sm },

  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, backgroundColor: Colors.white, marginBottom: 4 },
  input:      { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  textarea:   { minHeight: 80, alignItems: 'flex-start', paddingTop: Spacing.sm },
  row:        { flexDirection: 'row', gap: Spacing.md },
  half:       { flex: 1 },

  previewBox:   { backgroundColor: Colors.accentPale, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm, gap: 8, borderWidth: 1, borderColor: Colors.border },
  previewRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  previewTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  previewLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  previewLabelBold: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  previewValue: { fontSize: FontSize.sm, color: Colors.textSecondary },
  previewIncome:{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
});
