import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

const toNumber = (value) => Number(value) || 0;

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeCow = (doc) => ({
  id: doc.id,
  ...doc,
  farm_id: doc.farm_id ?? doc.farmId ?? null,
  name: doc.name || '',
  breed: doc.breed || '',
  gender: doc.gender || '',
  age_months: toNumber(doc.age_months ?? doc.ageMonths),
  weight_kg: toNumber(doc.weight_kg ?? doc.weightKg),
});

const normalizeCost = (doc, cowName = '') => ({
  id: doc.id,
  ...doc,
  cow_id: doc.cow_id ?? doc.cowId ?? null,
  cowName,
  type: doc.type || 'other',
  amount: toNumber(doc.amount),
  date: doc.cost_date ?? doc.date ?? null,
  cost_date: doc.cost_date ?? null,
  note: doc.note || '',
});

const today = () => new Date().toISOString().split('T')[0];
const fmt   = (n) => `৳${(n || 0).toLocaleString('bn-BD')}`;

const COST_TYPES = [
  // { key: 'purchase', label: 'ক্রয়',       emoji: '🛒', color: '#6A1B9A' },
  { key: 'feed',     label: 'খাবার',       emoji: '🌾', color: '#2E7D32' },
  { key: 'medicine', label: 'ওষুধ',        emoji: '💊', color: '#C62828' },
  { key: 'labor',    label: 'শ্রমিক',      emoji: '👷', color: '#E65100' },
  { key: 'other',    label: 'অন্যান্য',   emoji: '📦', color: '#37474F' },
];

const FEED_GROUPS = [
  { key: 'গাভী',   label: 'গাভী',   emoji: '🐄', gender: 'female', color: '#1565C0' },
  { key: 'ষাঁড়', label: 'ষাঁড়',  emoji: '🐂', gender: 'male',   color: '#6A1B9A' },
  { key: 'বাছুর', label: 'বাছুর',  emoji: '🐮', gender: null,     color: '#E65100' },
];

function getCostType(key) {
  return COST_TYPES.find(t => t.key === key) || COST_TYPES[4];
}

// ── Add Cost Modal ─────────────────────────────────────────────────────────
function AddCostModal({ visible, cows, onClose, onSaved }) {
    const [type,          setType]          = useState('feed');
  const [feedGroup,     setFeedGroup]     = useState('');   // গাভী | ষাঁড় | বাছুর
  const [selectedIds,   setSelectedIds]   = useState([]);   // selected cow ids
  const [amount,        setAmount]        = useState('');
  const [date,          setDate]          = useState(today());
  const [note,          setNote]          = useState('');
  const [loading,       setLoading]       = useState(false);

  // cows filtered by feed group (only for feed type)
  const filteredCows = type === 'feed' && feedGroup
    ? feedGroup === 'বাছুর'
      ? cows.filter(c => c.age_months <= 12)
      : cows.filter(c => {
          const g = FEED_GROUPS.find(fg => fg.key === feedGroup);
          return g ? c.gender === g.gender : true;
        })
    : cows;

  const reset = () => {
    setType('feed'); setFeedGroup(''); setSelectedIds([]);
    setAmount(''); setDate(today()); setNote('');
  };
// feed group select করলে সেই group এর সব গরু auto-select হবে
  const handleFeedGroupSelect = (gKey) => {
    setFeedGroup(gKey);
    const g = FEED_GROUPS.find(fg => fg.key === gKey);
    let matching = [];
    if (gKey === 'বাছুর') {
      matching = cows.filter(c => c.age_months <= 12).map(c => c.id);
    } else if (g?.gender) {
      matching = cows.filter(c => c.gender === g.gender).map(c => c.id);
    }
    setSelectedIds(matching);
  };

  // individual toggle
  const toggleCow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // select all / deselect all (for filtered list)
  const toggleAll = () => {
    const allIds = filteredCows.map(c => c.id);
    const allSelected = allIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const perCow = selectedIds.length > 0 && amount
    ? (parseFloat(amount) / selectedIds.length).toFixed(0)
    : 0;

  const handleSave = async () => {
    if (type === 'feed' && !feedGroup)
      return Alert.alert('ত্রুটি', 'খাবারের গ্রুপ নির্বাচন করুন।');
    if (selectedIds.length === 0)
      return Alert.alert('ত্রুটি', 'কমপক্ষে একটি গরু নির্বাচন করুন।');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
      return Alert.alert('ত্রুটি', 'সঠিক মোট পরিমাণ দিন।');

    setLoading(true);
    try {
      const amountEach = parseFloat(amount) / selectedIds.length;
      await Promise.all(
        selectedIds.map((id) =>
          addDoc(collection(db, 'costs'), {
            cow_id: id,
            type,
            amount: parseFloat(amountEach.toFixed(2)),
            cost_date: date,
            note: note || (type === 'feed' ? `খাবার — ${feedGroup} গ্রুপ` : undefined),
          }),
        ),
      );
      Alert.alert(
        '✅ সফল',
        `${selectedIds.length}টি গরুতে মোট ${fmt(parseFloat(amount))} খরচ যোগ হয়েছে।\nপ্রতিটিতে: ${fmt(parseFloat(amountEach.toFixed(2)))}`
      );
      reset();
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert('ত্রুটি', e.userMessage || 'খরচ যোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const ct = getCostType(type);
  const allFilteredSelected =
    filteredCows.length > 0 &&
    filteredCows.every(c => selectedIds.includes(c.id));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>খরচ যোগ করুন</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#6A1B9A" />
              : <Text style={styles.modalSave}>সেভ</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Cost type ── */}
          <Text style={styles.fieldLabel}>খরচের ধরন *</Text>
          <View style={styles.typeGrid}>
            {COST_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, type === t.key && { borderColor: t.color, backgroundColor: t.color + '12' }]}
                onPress={() => { setType(t.key); setFeedGroup(''); setSelectedIds([]); }}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, type === t.key && { color: t.color, fontWeight: '700' }]}>
                  {t.label}
                </Text>
                {type === t.key && (
                  <View style={[styles.typeCheck, { backgroundColor: t.color }]}>
                    <Ionicons name="checkmark" size={10} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Feed sub-group (only for feed) ── */}
          {type === 'feed' && (
            <>
              <Text style={styles.fieldLabel}>খাবারের গ্রুপ *</Text>
              <Text style={styles.fieldHint}>
                গ্রুপ বেছে নিলে সেই ধরনের সব গরু স্বয়ংক্রিয়ভাবে নির্বাচিত হবে
              </Text>
              <View style={styles.groupRow}>
                {FEED_GROUPS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.groupCard,
                      feedGroup === g.key && { borderColor: g.color, backgroundColor: g.color + '12' },
                    ]}
                    onPress={() => handleFeedGroupSelect(g.key)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.groupEmoji}>{g.emoji}</Text>
                    <Text style={[styles.groupLabel, feedGroup === g.key && { color: g.color, fontWeight: '700' }]}>
                      {g.label}
                    </Text>
                    {/* count badge */}
                    <View style={[styles.groupCount, feedGroup === g.key && { backgroundColor: g.color }]}>
                      <Text style={[styles.groupCountText, feedGroup === g.key && { color: '#fff' }]}>
                        {g.key === 'বাছুর'
                          ? cows.filter(c => c.age_months <= 12).length
                          : cows.filter(c => c.gender === g.gender).length}
                      </Text>
                    </View>
                    {feedGroup === g.key && (
                      <View style={[styles.typeCheck, { backgroundColor: g.color, top: 5, right: 5 }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Cow multi-select ── */}
          {(type !== 'feed' || feedGroup !== '') && (
            <>
              <View style={styles.cowHeaderRow}>
                <Text style={styles.fieldLabel}>গরু নির্বাচন করুন *</Text>
                {filteredCows.length > 0 && (
                  <TouchableOpacity style={styles.selectAllBtn} onPress={toggleAll}>
                    <Ionicons
                      name={allFilteredSelected ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'}
                      size={16}
                      color={allFilteredSelected ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.selectAllText, allFilteredSelected && { color: Colors.primary }]}>
                      {allFilteredSelected ? 'সব বাতিল' : 'সব নির্বাচন'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {filteredCows.length === 0 ? (
                <View style={styles.noCowBox}>
                  <Text style={styles.noCowText}>
                    {type === 'feed'
                      ? `এই গ্রুপে (${feedGroup}) কোনো গরু নেই।`
                      : 'কোনো গরু যোগ করা হয়নি।'}
                  </Text>
                </View>
              ) : (
                <View style={styles.cowGrid}>
                  {filteredCows.map(c => {
                    const selected = selectedIds.includes(c.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.cowGridCard, selected && styles.cowGridCardActive]}
                        onPress={() => toggleCow(c.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cowGridEmoji}>
                          {c.gender === 'female' ? '🐄' : '🐂'}
                        </Text>
                        <Text style={[styles.cowGridName, selected && styles.cowGridNameActive]} numberOfLines={1}>
                          {c.name || c.breed}
                        </Text>
                        <Text style={styles.cowGridSub} numberOfLines={1}>
                          {c.age_months}মা • {c.weight_kg}কেজি
                        </Text>
                        {selected && (
                          <View style={styles.cowGridCheck}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── Amount ── */}
          <Text style={styles.fieldLabel}>মোট পরিমাণ (৳) *</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.typeEmojiSm, { color: ct.color }]}>{ct.emoji}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="মোট খরচ লিখুন"
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>টাকা</Text>
          </View>

          {/* Per-cow split preview */}
          {selectedIds.length > 0 && amount !== '' && !isNaN(amount) && parseFloat(amount) > 0 && (
            <View style={styles.splitBox}>
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>নির্বাচিত গরু</Text>
                <Text style={styles.splitValue}>{selectedIds.length}টি</Text>
              </View>
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>মোট খরচ</Text>
                <Text style={styles.splitValue}>{fmt(parseFloat(amount))}</Text>
              </View>
              <View style={[styles.splitRow, styles.splitTotal]}>
                <Text style={styles.splitLabelBold}>প্রতিটি গরুতে ভাগ</Text>
                <Text style={styles.splitAmount}>{fmt(parseFloat(perCow))}</Text>
              </View>
            </View>
          )}

          {/* ── Date ── */}
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

          {/* ── Note ── */}
          <Text style={styles.fieldLabel}>নোট (ঐচ্ছিক)</Text>
          <TextInput
            style={[styles.inputRow, styles.textarea]}
            value={note}
            onChangeText={setNote}
            placeholder="খরচের বিবরণ লিখুন..."
            multiline
            numberOfLines={3}
          />

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Cost Card ──────────────────────────────────────────────────────────────
function CostCard({ cost, cowName }) {
  const ct = getCostType(cost.type);
  return (
    <View style={styles.costCard}>
      <View style={[styles.costIcon, { backgroundColor: ct.color + '15' }]}>
        <Text style={styles.costIconEmoji}>{ct.emoji}</Text>
      </View>
      <View style={styles.costInfo}>
        <Text style={styles.costType}>{ct.label}</Text>
        <Text style={styles.costCow}>🐄 {cowName}</Text>
        {cost.note ? <Text style={styles.costNote}>{cost.note}</Text> : null}
        <Text style={styles.costDate}>{cost.date}</Text>
      </View>
      <Text style={[styles.costAmount, { color: ct.color }]}>{fmt(cost.amount)}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function AddCostScreen() {
  const router = useRouter();
  const [costs,     setCosts]     = useState([]);
  const [cows,      setCows]      = useState([]);
  const [totals,    setTotals]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { farmId } = useLocalSearchParams();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('ত্রুটি', 'অনুগ্রহ করে আগে লগইন করুন।');
        setCows([]);
        setCosts([]);
        return;
      }

      const userSnap = await getDocs(
        query(collection(db, 'users'), where('firebase_uid', '==', currentUser.uid)),
      );
      const userDoc = userSnap.docs[0];
      const userId = userDoc?.id || currentUser.uid;
      const resolvedFarmId = Array.isArray(farmId) ? farmId[0] : farmId;

      const farmIds = resolvedFarmId
        ? [String(resolvedFarmId)]
        : (await getDocs(query(collection(db, 'farms'), where('farmer_id', '==', userId)))).docs.map((doc) => doc.id);

      const cowSnapshots = await Promise.all(
        farmIds.map((farm) => getDocs(query(collection(db, 'cows'), where('farm_id', '==', farm)))),
      );

      const myCows = cowSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => normalizeCow({ id: doc.id, ...doc.data() })),
      );

      setCows(myCows);

      const costSnapshots = await Promise.all(
        myCows.map((cow) =>
          getDocs(query(collection(db, 'costs'), where('cow_id', '==', cow.id))),
        ),
      );

      const allCosts = costSnapshots
        .flatMap((snapshot, index) => {
          const cow = myCows[index];
          return snapshot.docs.map((doc) => normalizeCost({ id: doc.id, ...doc.data() }, cow.name || cow.breed));
        })
        .sort((a, b) => {
          const aTime = toDate(a.cost_date)?.getTime() || 0;
          const bTime = toDate(b.cost_date)?.getTime() || 0;
          return bTime - aTime;
        });

      setCosts(allCosts);

      // totals calculation
      const t = {};
      COST_TYPES.forEach(ct => {
        t[ct.key] = allCosts
          .filter(c => c.type === ct.key)
          .reduce((s, c) => s + c.amount, 0);
      });

      t.total = allCosts.reduce((s, c) => s + c.amount, 0);

      setTotals(t);
    } catch (e) {
      console.error(e);
      Alert.alert('ত্রুটি', 'খরচের তথ্য লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [farmId]);


  useEffect(() => { loadData(); }, [loadData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4A148C', '#6A1B9A']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>খরচ ট্র্যাকার</Text>
        <Text style={styles.headerSub}>গ্রুপ ভিত্তিক খরচের হিসাব</Text>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>মোট খরচ</Text>
          <Text style={styles.totalValue}>{fmt(totals.total)}</Text>
          <View style={styles.totalBreakdown}>
            {COST_TYPES.map(ct => (
              <View key={ct.key} style={styles.totalItem}>
                <Text style={styles.totalItemEmoji}>{ct.emoji}</Text>
                <Text style={styles.totalItemValue}>{fmt(totals[ct.key])}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6A1B9A" />
        </View>
      ) : (
        <FlatList
          data={costs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <CostCard cost={item} cowName={item.cowName} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyText}>এখনো কোনো খরচ নেই</Text>
              <Text style={styles.emptyHint}>নিচের + বোতাম দিয়ে যোগ করুন</Text>
            </View>
          }
          ListHeaderComponent={
            costs.length > 0
              ? <Text style={styles.listHeader}>সর্বশেষ {costs.length}টি লেনদেন</Text>
              : null
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.9}>
        <LinearGradient colors={['#6A1B9A', '#4A148C']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <AddCostModal
        visible={showModal}
        cows={cows}
        onClose={() => setShowModal(false)}
        onSaved={loadData}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { paddingTop: 54, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, overflow: 'hidden' },
  circle1:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -50 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSub:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.lg },
  totalBox:       { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  totalLabel:     { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },
  totalValue:     { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.white, marginBottom: Spacing.sm },
  totalBreakdown: { flexDirection: 'row', gap: Spacing.md },
  totalItem:      { alignItems: 'center', gap: 2 },
  totalItemEmoji: { fontSize: 18 },
  totalItemValue: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  list:       { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  listHeader: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },

  costCard:     { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  costIcon:     { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  costIconEmoji:{ fontSize: 24 },
  costInfo:     { flex: 1 },
  costType:     { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  costCow:      { fontSize: FontSize.sm, color: Colors.textMuted },
  costNote:     { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  costDate:     { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  costAmount:   { fontSize: FontSize.lg, fontWeight: '800' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyText:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyHint:  { fontSize: FontSize.sm, color: Colors.textMuted },

  fab:     { position: 'absolute', bottom: 24, right: 24 },
  fabGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', ...Shadow.lg },

  // ── Modal ──
  modal:       { flex: 1, backgroundColor: Colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingTop: Spacing.xl + 8 },
  modalTitle:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  modalSave:   { fontSize: FontSize.md, fontWeight: '700', color: '#6A1B9A' },
  modalScroll: { flex: 1, padding: Spacing.lg },

  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  fieldHint:  { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, lineHeight: 18 },

  // Cost type grid
  typeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  typeCard:  { width: '22%', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 4, position: 'relative' },
  typeEmoji: { fontSize: 22 },
  typeLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  typeCheck: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typeEmojiSm:{ fontSize: 20 },

  // Feed group cards
  groupRow:       { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  groupCard:      { flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center', gap: 6, position: 'relative', backgroundColor: Colors.white },
  groupEmoji:     { fontSize: 30 },
  groupLabel:     { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  groupCount:     { backgroundColor: Colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  groupCountText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },

  // Cow multi-select grid
  cowHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, marginBottom: 6 },
  selectAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectAllText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },

  cowGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cowGridCard:     { width: '30%', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 3, position: 'relative', backgroundColor: Colors.white },
  cowGridCardActive:{ borderColor: Colors.primary, backgroundColor: Colors.accentPale },
  cowGridEmoji:    { fontSize: 24 },
  cowGridName:     { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  cowGridNameActive:{ color: Colors.primary },
  cowGridSub:      { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  cowGridCheck:    { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  noCowBox:  { backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  noCowText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Input
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, backgroundColor: Colors.white, marginBottom: 4 },
  input:      { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  inputSuffix:{ fontSize: FontSize.sm, color: Colors.textMuted },
  textarea:   { minHeight: 80, alignItems: 'flex-start', paddingTop: Spacing.sm },

  // Split preview
  splitBox:   { backgroundColor: Colors.accentPale, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm, gap: 8, borderWidth: 1, borderColor: Colors.border },
  splitRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  splitTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  splitLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  splitLabelBold: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  splitValue: { fontSize: FontSize.sm, color: Colors.textSecondary },
  splitAmount:{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
});