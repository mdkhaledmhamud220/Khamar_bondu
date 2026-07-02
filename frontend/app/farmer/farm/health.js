import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

const today = () => new Date().toISOString().split('T')[0];
const toNumber = (value) => Number(value) || 0;
const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const gradeFromScore = (score) => {
  if (score >= 85) return 'অসাধারণ';
  if (score >= 70) return 'ভালো';
  if (score >= 50) return 'মোটামুটি';
  if (score >= 30) return 'দুর্বল';
  return 'খারাপ';
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
  health_score: toNumber(doc.health_score ?? doc.healthScore),
  status: doc.status || 'draft',
  vaccines: Array.isArray(doc.vaccines) ? doc.vaccines : [],
  medicines: Array.isArray(doc.medicines) ? doc.medicines : [],
});

const normalizeVaccine = (doc) => ({
  id: doc.id,
  ...doc,
  cow_id: doc.cow_id ?? doc.cowId ?? null,
  vaccine_name: doc.vaccine_name ?? doc.name ?? '',
  given_date: doc.given_date ?? doc.givenDate ?? null,
  due_date: doc.due_date ?? doc.dueDate ?? null,
  status: doc.status || 'pending',
  vet_name: doc.vet_name ?? doc.vetName ?? '',
});

const normalizeMedicine = (doc) => ({
  id: doc.id,
  ...doc,
  cow_id: doc.cow_id ?? doc.cowId ?? null,
  medicine_name: doc.medicine_name ?? doc.name ?? '',
  reason: doc.reason ?? '',
  treatment_date: doc.treatment_date ?? doc.date ?? null,
  cost: toNumber(doc.cost),
});

const getCowDetails = (cow, vaccines = [], medicines = []) => {
  const latestWeightKg = cow.weight_kg || 0;
  const ageMonths = cow.age_months || 0;
  const overdueVaccines = vaccines.filter((v) => {
    const dueDate = toDate(v.due_date);
    const givenDate = toDate(v.given_date);
    return !givenDate && dueDate && dueDate < new Date();
  }).length;

  const pendingVaccines = vaccines.filter((v) => !toDate(v.given_date)).length;
  const recentMedicines = medicines.filter((m) => {
    const tDate = toDate(m.treatment_date);
    if (!tDate) return false;
    const diffDays = (Date.now() - tDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const expectedWeightKg = ageMonths > 0 ? Math.round(ageMonths * 8) : 0;
  const weightDelta = expectedWeightKg > 0 ? Math.abs(expectedWeightKg - latestWeightKg) / expectedWeightKg : 0;

  const vaccination = Math.max(0, 30 - overdueVaccines * 6 - pendingVaccines * 2);
  const medicine = Math.max(0, 25 - recentMedicines * 4);
  const weight = expectedWeightKg > 0 ? Math.max(0, 25 - Math.round(weightDelta * 25)) : 15;
  const age = ageMonths > 0 ? Math.min(10, Math.max(4, Math.round(ageMonths / 6))) : 4;
  const feeding = medicines.length > 0 ? 8 : 10;

  const healthDetails = {
    vaccination,
    medicine,
    weight,
    age,
    feeding,
    expectedWeightKg,
  };

  const healthScore = Math.max(0, Math.min(100, vaccination + medicine + weight + age + feeding));

  return {
    healthScore: cow.health_score || healthScore,
    healthGrade: cow.health_score ? gradeFromScore(cow.health_score) : gradeFromScore(healthScore),
    healthDetails,
  };
};

// ── Health Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, grade }) {
  const color =
    score >= 85 ? Colors.healthExcellent :
    score >= 70 ? Colors.healthGood :
    score >= 50 ? Colors.healthAverage :
    score >= 30 ? Colors.healthWeak : Colors.healthBad;

  return (
    <View style={[styles.ring, { borderColor: color }]}>
      <Text style={[styles.ringScore, { color }]}>{score}</Text>
      <Text style={[styles.ringGrade, { color }]}>{grade}</Text>
    </View>
  );
}

// ── Score Bar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={styles.barWrap}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barValue, { color }]}>{value}/{max}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Vaccine/Medicine Modal ─────────────────────────────────────────────────
function AddHealthModal({ visible, cow, mode, onClose, onSaved }) {
  // mode: 'vaccine' | 'medicine'
  const [name,     setName]     = useState('');
  const [date,     setDate]     = useState(today());
  const [dueDate,  setDueDate]  = useState('');
  const [reason,   setReason]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const reset = () => { setName(''); setDate(today()); setDueDate(''); setReason(''); };

  // const handleSave = async () => {
  //   if (!name.trim()) return Alert.alert('ত্রুটি', 'নাম দিন।');
  //   if (!cow) return;

  //   setLoading(true);
  //   try {
  //     // Get current cow data
  //     const cowRes = await api.get(`/cows/${cow.id}`);
  //     const current = cowRes.data.data;

  //     let updateData = {};
  //     if (mode === 'vaccine') {
  //       const newVaccine = { name, givenDate: date, dueDate: dueDate || null };
  //       updateData.vaccines = [...(current.vaccines || []), newVaccine];
  //     } else {
  //       const newMed = { date, reason: name };
  //       updateData.medicines = [...(current.medicines || []), newMed];
  //     }

  //     await api.put(`/cows/${cow.id}`, updateData);
  //     // Recalculate health score
  //     await api.post(`/cows/${cow.id}/health`);

  //     Alert.alert('✅ সফল', `${mode === 'vaccine' ? 'টিকা' : 'ওষুধ'} যোগ হয়েছে। Health Score আপডেট হয়েছে।`);
  //     reset();
  //     onSaved();
  //     onClose();
  //   } catch (e) {
  //     Alert.alert('ত্রুটি', e.userMessage || 'তথ্য সংরক্ষণ করা যায়নি।');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('ত্রুটি', 'নাম দিন।');
    if (!cow) return;

    setLoading(true);
    try {
      if (mode === 'vaccine') {
        await addDoc(collection(db, 'vaccines'), {
          cow_id: cow.id,
          vaccine_name: name.trim(),
          given_date: date,
          due_date: dueDate || null,
          status: date ? 'given' : 'pending',
          vet_name: '',
        });
      } else {
        await addDoc(collection(db, 'medicines'), {
          cow_id: cow.id,
          medicine_name: name.trim(),
          reason: reason.trim() || name.trim(),
          treatment_date: date,
        });
      }

      Alert.alert(
        '✅ সফল',
        `${mode === 'vaccine' ? 'টিকা' : 'ওষুধ'} যোগ হয়েছে।`
      );

      reset();
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('ত্রুটি', 'সংরক্ষণ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const isVaccine = mode === 'vaccine';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isVaccine ? '💉 টিকার তথ্য যোগ করুন' : '💊 ওষুধের তথ্য যোগ করুন'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.modalSave}>সেভ</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {cow && (
            <View style={styles.cowInfoBox}>
              <Text style={styles.cowInfoEmoji}>🐄</Text>
              <View>
                <Text style={styles.cowInfoName}>{cow.name || cow.breed}</Text>
                <Text style={styles.cowInfoSub}>Health Score: {cow.health_score} • {cow.healthGrade}</Text>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>{isVaccine ? 'টিকার নাম *' : 'ওষুধের নাম / কারণ *'}</Text>
          <View style={styles.inputRow}>
            <Ionicons name={isVaccine ? 'shield-checkmark-outline' : 'medkit-outline'} size={18} color={Colors.primary} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={isVaccine ? 'যেমন: FMD vaccine, HS vaccine' : 'যেমন: জ্বর, পেটের সমস্যা'}
            />
          </View>

          <Text style={styles.fieldLabel}>{isVaccine ? 'প্রদানের তারিখ *' : 'তারিখ *'}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          </View>

          {isVaccine && (
            <>
              <Text style={styles.fieldLabel}>পরবর্তী টিকার তারিখ (ঐচ্ছিক)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="alarm-outline" size={18} color={Colors.warning} />
                <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
              </View>
              <Text style={styles.inputHint}>⚠️ তারিখ দিলে সময়মতো reminder পাবেন</Text>
            </>
          )}

          {!isVaccine && (
            <>
              <Text style={styles.fieldLabel}>বিবরণ (ঐচ্ছিক)</Text>
              <TextInput
                style={[styles.inputRow, styles.textarea]}
                value={reason}
                onChangeText={setReason}
                placeholder="চিকিৎসার বিস্তারিত..."
                multiline
                numberOfLines={3}
              />
            </>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.infoText}>
              তথ্য সেভ করার পর Health Score স্বয়ংক্রিয়ভাবে recalculate হবে।
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Cow Health Card ────────────────────────────────────────────────────────
function CowHealthCard({ cow, onAddVaccine, onAddMedicine, expanded, onToggle }) {
  const details = cow.healthDetails || {};
  const color =
    cow.health_score >= 85 ? Colors.healthExcellent :
    cow.health_score >= 70 ? Colors.healthGood :
    cow.health_score >= 50 ? Colors.healthAverage :
    cow.health_score >= 30 ? Colors.healthWeak : Colors.healthBad;

  return (
    <View style={styles.healthCard}>
      {/* Card Header */}
      <TouchableOpacity style={styles.healthCardHeader} onPress={onToggle} activeOpacity={0.8}>
        <ScoreRing score={cow.health_score || 0} grade={cow.healthGrade || 'অজানা'} />
        <View style={styles.healthCardInfo}>
          <Text style={styles.healthCardName}>{cow.name || cow.breed}</Text>
          <Text style={styles.healthCardSub}>
            {cow.breed} • {cow.age_months} মাস • {cow.weight_kg} কেজি
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: color + '18' }]}>
            <View style={[styles.scoreDot, { backgroundColor: color }]} />
            <Text style={[styles.scoreBadgeText, { color }]}>
              {cow.healthGrade || '—'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.healthExpanded}>
          {/* Score breakdown */}
          <Text style={styles.expandedTitle}>স্কোর বিশ্লেষণ</Text>
          <ScoreBar label="💉 টিকা"          value={details.vaccination || 0} max={30} color={Colors.success} />
          <ScoreBar label="💊 ওষুধের ইতিহাস" value={details.medicine || 0}    max={25} color={Colors.info} />
          <ScoreBar label="⚖️ ওজন (বয়স অনুযায়ী)" value={details.weight || 0} max={25} color={Colors.warning} />
          <ScoreBar label="📅 বয়স"           value={details.age || 0}         max={10} color={Colors.primaryMid} />
          <ScoreBar label="🌾 নিয়মিত খাবার" value={details.feeding || 0}     max={10} color={Colors.accent} />

          {details.expectedWeightKg && (
            <Text style={styles.expectedWeight}>
              প্রত্যাশিত ওজন ({cow.breed}): {details.expectedWeightKg} কেজি
            </Text>
          )}

          {/* Vaccine list */}
          {cow.vaccines?.length > 0 && (
            <>
              <Text style={[styles.expandedTitle, { marginTop: Spacing.lg }]}>টিকার ইতিহাস</Text>
              {cow.vaccines.map((v, i) => {
                const isOverdue = v.due_date && !v.given_date && new Date(v.due_date) < new Date();
                return (
                  <View key={i} style={styles.historyRow}>
                    <Ionicons
                      name={v.given_date ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time-outline'}
                      size={16}
                      color={v.given_date ? Colors.success : isOverdue ? Colors.error : Colors.warning}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyName}>{v.vaccine_name}</Text>
                      <Text style={styles.historyDate}>
                        {v.given_date ? `দেওয়া হয়েছে: ${v.given_date}` : ''}
                        {v.due_date ? ` • পরবর্তী: ${v.due_date}` : ''}
                      </Text>
                    </View>
                    {isOverdue && <Text style={styles.overdueTag}>মেয়াদ শেষ</Text>}
                  </View>
                );
              })}
            </>
          )}

          {/* Medicine list */}
          {cow.medicines?.length > 0 && (
            <>
              <Text style={[styles.expandedTitle, { marginTop: Spacing.lg }]}>ওষুধের ইতিহাস</Text>
              {cow.medicines.slice(-5).map((m, i) => (
                <View key={i} style={styles.historyRow}>
                  <Ionicons name="medkit-outline" size={16} color={Colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{m.medicine_name}</Text>
                    <Text style={styles.historyDate}>{m.treatment_date}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onAddVaccine(cow)}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>টিকা যোগ করুন</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => onAddMedicine(cow)}>
              <Ionicons name="medkit-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>ওষুধ যোগ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function HealthTrackScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams();
  const [cows,        setCows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedId,  setExpandedId]  = useState(null);
  const [modalCow,    setModalCow]    = useState(null);
  const [modalMode,   setModalMode]   = useState('vaccine');

  // const loadCows = useCallback(async () => {
  //   try {
  //     const res = await api.get('/cows', { params: { farmerId: 'me' } });
  //     setCows(res.data.data || []);
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);
  const loadCows = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('ত্রুটি', 'অনুগ্রহ করে আগে লগইন করুন।');
        setCows([]);
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
        : (await getDocs(
            query(collection(db, 'farms'), where('farmer_id', '==', userId)),
          )).docs.map((doc) => doc.id);

      if (farmIds.length === 0) {
        setCows([]);
        return;
      }

      const cowSnapshots = await Promise.all(
        farmIds.map((farm) =>
          getDocs(query(collection(db, 'cows'), where('farm_id', '==', farm))),
        ),
      );

      const cowsList = cowSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => normalizeCow({ id: doc.id, ...doc.data() })),
      );

      const cowsWithHealth = await Promise.all(
        cowsList.map(async (cow) => {
          const [vaccineSnap, medicineSnap] = await Promise.all([
            getDocs(query(collection(db, 'vaccines'), where('cow_id', '==', cow.id))),
            getDocs(query(collection(db, 'medicines'), where('cow_id', '==', cow.id))),
          ]);

          const vaccines = vaccineSnap.docs
            .map((doc) => normalizeVaccine({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const aTime = toDate(a.given_date || a.due_date)?.getTime() || 0;
              const bTime = toDate(b.given_date || b.due_date)?.getTime() || 0;
              return bTime - aTime;
            });

          const medicines = medicineSnap.docs
            .map((doc) => normalizeMedicine({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const aTime = toDate(a.treatment_date)?.getTime() || 0;
              const bTime = toDate(b.treatment_date)?.getTime() || 0;
              return bTime - aTime;
            });

          const health = getCowDetails(cow, vaccines, medicines);

          return {
            ...cow,
            health_score: health.healthScore,
            healthGrade: health.healthGrade,
            healthDetails: health.healthDetails,
            vaccines,
            medicines,
          };
        }),
      );

      setCows(cowsWithHealth);
    } catch (e) {
      console.error(e);
      Alert.alert('ত্রুটি', 'স্বাস্থ্য তথ্য লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [farmId]);
  useEffect(() => { loadCows(); }, [loadCows]);

  const avgScore = cows.length
    ? Math.round(cows.reduce((s, c) => s + (c.health_score || 0), 0) / cows.length)
    : 0;

  const gradeCount = { অসাধারণ: 0, ভালো: 0, মোটামুটি: 0, দুর্বল: 0, খারাপ: 0 };
  cows.forEach(c => {
    if (gradeCount[c.healthGrade] !== undefined) gradeCount[c.healthGrade]++;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#004D40', '#00695C']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>স্বাস্থ্য ট্র্যাকার</Text>
        <Text style={styles.headerSub}>টিকা, ওষুধ ও Health Score</Text>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avgScore}>{avgScore}</Text>
            <Text style={styles.avgLabel}>গড় Health Score</Text>
          </View>
          <View style={styles.summaryRight}>
            {Object.entries(gradeCount).filter(([, v]) => v > 0).map(([g, v]) => (
              <Text key={g} style={styles.gradeCount}>
                {g}: {v}টি
              </Text>
            ))}
            {cows.length === 0 && <Text style={styles.gradeCount}>কোনো গরু নেই</Text>}
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00695C" />
        </View>
      ) : (
        <FlatList
          data={cows}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CowHealthCard
              cow={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onAddVaccine={(c) => { setModalCow(c); setModalMode('vaccine'); }}
              onAddMedicine={(c) => { setModalCow(c); setModalMode('medicine'); }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text style={styles.emptyText}>কোনো গরু নেই</Text>
              <Text style={styles.emptyHint}>আগে গরু যোগ করুন</Text>
            </View>
          }
          ListHeaderComponent={
            cows.length > 0
              ? <Text style={styles.listHeader}>গরু ট্যাপ করে বিস্তারিত দেখুন</Text>
              : null
          }
        />
      )}

      <AddHealthModal
        visible={!!modalCow}
        cow={modalCow}
        mode={modalMode}
        onClose={() => setModalCow(null)}
        onSaved={loadCows}
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

  summaryBox:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center' },
  summaryLeft:  { alignItems: 'center', paddingRight: Spacing.lg, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.25)', marginRight: Spacing.lg },
  avgScore:     { fontSize: 48, fontWeight: '800', color: Colors.white },
  avgLabel:     { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  summaryRight: { flex: 1, gap: 4 },
  gradeCount:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },

  list:       { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  listHeader: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },

  healthCard:       { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.md },
  healthCardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  healthCardInfo:   { flex: 1 },
  healthCardName:   { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  healthCardSub:    { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  scoreBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, marginTop: 6 },
  scoreDot:         { width: 6, height: 6, borderRadius: 3 },
  scoreBadgeText:   { fontSize: FontSize.xs, fontWeight: '700' },

  ring:      { width: 68, height: 68, borderRadius: 34, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  ringScore: { fontSize: FontSize.xl, fontWeight: '800', lineHeight: 24 },
  ringGrade: { fontSize: 9, fontWeight: '700' },

  healthExpanded: { borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md },
  expandedTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },

  barWrap:   { marginBottom: Spacing.sm },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel:  { fontSize: FontSize.sm, color: Colors.textSecondary },
  barValue:  { fontSize: FontSize.sm, fontWeight: '700' },
  barBg:     { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 4 },

  expectedWeight: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, fontStyle: 'italic' },

  historyRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  historyDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  overdueTag:  { backgroundColor: Colors.error + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  actionRow:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.success },
  actionBtnRed: { borderColor: Colors.error },
  actionBtnText:{ fontSize: FontSize.sm, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyText:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyHint:  { fontSize: FontSize.sm, color: Colors.textMuted },

  // Modal
  modal:       { flex: 1, backgroundColor: Colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingTop: Spacing.xl + 8 },
  modalTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  modalSave:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  modalScroll: { flex: 1, padding: Spacing.lg },

  cowInfoBox:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.accentPale, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  cowInfoEmoji:{ fontSize: 32 },
  cowInfoName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  cowInfoSub:  { fontSize: FontSize.sm, color: Colors.textMuted },

  fieldLabel:  { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, backgroundColor: Colors.white, marginBottom: 4 },
  input:       { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  textarea:    { minHeight: 80, alignItems: 'flex-start', paddingTop: Spacing.sm },
  inputHint:   { fontSize: FontSize.xs, color: Colors.warning, marginTop: 4, marginBottom: Spacing.sm },

  infoBox:  { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.info + '12', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.info + '30' },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
