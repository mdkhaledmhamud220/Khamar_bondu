import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useAuth } from '../../context/AuthContext';
// import api from '../../config/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

const fmt = (n) => `৳${(n || 0).toLocaleString('bn-BD')}`;

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['বিস্তারিত', 'তথ্য দিন', 'নিশ্চিত করুন'];
  return (
    <View style={styles.stepBar}>
      {steps.map((label, i) => {
        const s = i + 1;
        const active  = step === s;
        const done    = step > s;
        return (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, (active || done) && styles.stepCircleActive, done && styles.stepCircleDone]}>
                {done
                  ? <Ionicons name="checkmark" size={14} color={Colors.white} />
                  : <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{s}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepConnector, step > s && styles.stepConnectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Cow detail card ────────────────────────────────────────────────────────
function CowCard({ cow }) {
  const healthColor =
    cow.healthScore >= 85 ? Colors.healthExcellent :
    cow.healthScore >= 70 ? Colors.healthGood :
    cow.healthScore >= 50 ? Colors.healthAverage : Colors.healthWeak;

  return (
    <View style={styles.cowCard}>
      <View style={styles.cowCardTop}>
        <View style={styles.cowPhotoPlaceholder}>
          <Text style={{ fontSize: 48 }}>🐄</Text>
        </View>
        <View style={styles.cowCardInfo}>
          <Text style={styles.cowCardName}>{cow.name || cow.breed}</Text>
          <Text style={styles.cowCardBreed}>{cow.breed}</Text>
          <View style={[styles.healthBadge, { backgroundColor: healthColor + '18', borderColor: healthColor }]}>
            <Text style={[styles.healthText, { color: healthColor }]}>
              ⭐ {cow.healthScore} — {cow.healthGrade}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cowCardMeta}>
        {[
          { icon: 'calendar-outline',  label: 'বয়স',   value: `${cow.ageMonths} মাস`  },
          { icon: 'barbell-outline',   label: 'ওজন',   value: `${cow.weightKg} কেজি`  },
          { icon: 'male-outline',      label: 'লিঙ্গ',  value: cow.gender === 'male' ? 'ষাঁড়' : 'গাভী' },
          { icon: 'location-outline',  label: 'জেলা',  value: cow.district || '—'      },
        ].map(m => (
          <View key={m.label} style={styles.metaItem}>
            <Ionicons name={m.icon} size={14} color={Colors.textMuted} />
            <View>
              <Text style={styles.metaLabel}>{m.label}</Text>
              <Text style={styles.metaValue}>{m.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>মোট মূল্য</Text>
        <Text style={styles.priceValue}>{fmt(cow.price)}</Text>
      </View>
    </View>
  );
}

// ── Payment breakdown ──────────────────────────────────────────────────────
function PaymentBreakdown({ price, advancePercent = 20 }) {
  const advance  = Math.round(price * advancePercent / 100);
  const remaining = price - advance;

  return (
    <View style={styles.payBox}>
      <Text style={styles.payTitle}>💳 পেমেন্ট বিবরণ</Text>
      <View style={styles.payRow}>
        <Text style={styles.payLabel}>মোট মূল্য</Text>
        <Text style={styles.payAmount}>{fmt(price)}</Text>
      </View>
      <View style={[styles.payRow, styles.payAdvance]}>
        <View>
          <Text style={[styles.payLabel, { color: Colors.primary }]}>অগ্রিম ({advancePercent}%) — এখন পরিশোধ</Text>
          <Text style={styles.payHint}>বুকিং নিশ্চিত করতে</Text>
        </View>
        <Text style={[styles.payAmount, { color: Colors.primary }]}>{fmt(advance)}</Text>
      </View>
      <View style={styles.payRow}>
        <View>
          <Text style={styles.payLabel}>বাকি — গরু পাওয়ার সময়</Text>
          <Text style={styles.payHint}>বিক্রেতার কাছ থেকে গরু নেওয়ার দিন</Text>
        </View>
        <Text style={styles.payAmount}>{fmt(remaining)}</Text>
      </View>
    </View>
  );
}

// ── Payment Method selector ────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'bkash',    label: 'bKash',    emoji: '📱', color: '#E91E8C' },
  { key: 'nagad',    label: 'Nagad',    emoji: '📲', color: '#FF6600' },
  { key: 'sslcommerz', label: 'SSLCommerz (Sandbox)', emoji: '💳', color: '#1565C0' },
  { key: 'cash',     label: 'সরাসরি নগদ', emoji: '💵', color: '#2E7D32' },
];

// ── Success Modal ──────────────────────────────────────────────────────────
function SuccessModal({ visible, orderId, onDone }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.successOverlay}>
        <View style={styles.successBox}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
          <Text style={styles.successTitle}>বুকিং সম্পন্ন!</Text>
          <Text style={styles.successText}>
            আপনার বুকিং সফলভাবে নিবন্ধিত হয়েছে।{'\n'}
            বিক্রেতা শীঘ্রই আপনার সাথে যোগাযোগ করবেন।
          </Text>
          {orderId && (
            <View style={styles.orderIdBox}>
              <Text style={styles.orderIdLabel}>বুকিং নম্বর</Text>
              <Text style={styles.orderIdValue}>#{orderId.slice(-8).toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.successBtn} onPress={onDone}>
            <Text style={styles.successBtnText}>ঠিক আছে</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const router = useRouter();
  const { cowId, convId } = useLocalSearchParams();
  // const { profile } = useAuth();
  const profile = {
    role: 'buyer', // test buyer flow
  };

  const [step,          setStep]          = useState(1);
  const [cow,           setCow]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [orderId,       setOrderId]       = useState('');

  // Step 2 form
  const [deliveryDate,  setDeliveryDate]  = useState('');
  const [deliveryAddr,  setDeliveryAddr]  = useState('');
  const [payMethod,     setPayMethod]     = useState('bkash');
  const [note,          setNote]          = useState('');
  const [agreed,        setAgreed]        = useState(false);

  // useEffect(() => {
  //   if (!cowId) { setLoading(false); return; }
  //   api.get(`/cows/${cowId}`)
  //     .then(r => setCow(r.data.data))
  //     .catch(() => Alert.alert('ত্রুটি', 'গরুর তথ্য লোড হয়নি।'))
  //     .finally(() => setLoading(false));
  // }, [cowId]);

  useEffect(() => {
    setLoading(true);

    const mockCow = {
      id: 'c1',
      name: 'সাদা গাভী',
      breed: 'Friesian Cross',
      ageMonths: 24,
      weightKg: 320,
      gender: 'female',
      district: 'Rajshahi',
      price: 120000,
      healthScore: 88,
      healthGrade: 'Excellent',
      status: 'available',
    };

    setTimeout(() => {
      setCow(mockCow);
      setLoading(false);
    }, 500);

  }, [cowId]);

  const advance  = cow ? Math.round(cow.price * 0.20) : 0;
  const pm       = PAYMENT_METHODS.find(m => m.key === payMethod);

  // const handleSubmit = async () => {
  //   if (!agreed) { Alert.alert('', 'শর্তাবলীতে সম্মত হন।'); return; }
  //   if (!deliveryDate) { Alert.alert('', 'পছন্দের তারিখ দিন।'); return; }

  //   setSubmitting(true);
  //   try {
  //     // Create booking via chat message + order record
  //     const fakeOrderId = `ORD${Date.now()}`;

  //     // Notify seller via chat
  //     if (convId) {
  //       await api.post(`/chat/${convId}/message`, {
  //         text: `📦 বুকিং অনুরোধ: ${cow?.name || cow?.breed} গরুর জন্য বুকিং দেওয়া হয়েছে। অগ্রিম: ${fmt(advance)} (${payMethod})। পছন্দের তারিখ: ${deliveryDate}। বুকিং নম্বর: #${fakeOrderId.slice(-8)}`,
  //       });
  //     }

  //     setOrderId(fakeOrderId);
  //     setShowSuccess(true);
  //   } catch (e) {
  //     Alert.alert('ত্রুটি', e.userMessage || 'বুকিং করা যায়নি।');
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };
  const handleSubmit = async () => {
    if (!agreed) {
      Alert.alert('', 'শর্তাবলীতে সম্মত হন।');
      return;
    }
    if (!deliveryDate) {
      Alert.alert('', 'পছন্দের তারিখ দিন।');
      return;
    }

    setSubmitting(true);

    try {
      const fakeOrderId = `ORD${Date.now()}`;

      // fake delay instead of API
      await new Promise(res => setTimeout(res, 1000));

      setOrderId(fakeOrderId);
      setShowSuccess(true);

    } catch (e) {
      Alert.alert('ত্রুটি', 'বুকিং করা যায়নি।');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!cow) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>গরুর তথ্য পাওয়া যায়নি।</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>ফিরে যান</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.circle1} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => step > 1 ? setStep(s => s - 1) : router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>বুকিং করুন</Text>
          <View style={{ width: 38 }} />
        </View>
        <StepBar step={step} />
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Cow detail & payment breakdown ── */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>গরুর বিবরণ</Text>
            <CowCard cow={cow} />
            <PaymentBreakdown price={cow.price} />

            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
              <Text style={styles.infoText}>
                অগ্রিম পেমেন্ট দিলে গরুটি ৪৮ ঘণ্টার জন্য আপনার জন্য রিজার্ভ থাকবে।
              </Text>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.nextBtnText}>পরবর্তী ধাপ →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Delivery info & payment method ── */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>ডেলিভারি ও পেমেন্ট তথ্য</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 পছন্দের তারিখ *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>📍 ঠিকানা (ঐচ্ছিক)</Text>
              <TextInput
                style={[styles.inputRow, styles.textarea]}
                value={deliveryAddr}
                onChangeText={setDeliveryAddr}
                placeholder="গরু কোথায় পৌঁছে দিতে চান..."
                multiline
                numberOfLines={2}
              />
            </View>

            <Text style={styles.sectionTitle}>পেমেন্ট পদ্ধতি</Text>
            <View style={styles.card}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.pmRow, payMethod === m.key && styles.pmRowActive]}
                  onPress={() => setPayMethod(m.key)}
                >
                  <Text style={styles.pmEmoji}>{m.emoji}</Text>
                  <Text style={[styles.pmLabel, payMethod === m.key && { color: m.color, fontWeight: '700' }]}>
                    {m.label}
                  </Text>
                  <View style={[styles.pmCheck, payMethod === m.key && { backgroundColor: m.color, borderColor: m.color }]}>
                    {payMethod === m.key && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                  </View>
                </TouchableOpacity>
              ))}

              {payMethod === 'sslcommerz' && (
                <View style={styles.sandboxNote}>
                  <Text style={styles.sandboxText}>⚠️ Demo mode — টাকা কাটবে না। শুধু test করা যাবে।</Text>
                </View>
              )}
              {payMethod === 'cash' && (
                <View style={[styles.sandboxNote, { backgroundColor: Colors.success + '12', borderColor: Colors.success + '30' }]}>
                  <Text style={[styles.sandboxText, { color: Colors.success }]}>✅ গরু বুঝে নেওয়ার সময় সরাসরি নগদ পরিশোধ করুন।</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>নোট (ঐচ্ছিক)</Text>
              <TextInput
                style={[styles.inputRow, styles.textarea]}
                value={note}
                onChangeText={setNote}
                placeholder="বিক্রেতার জন্য কোনো বিশেষ নির্দেশনা..."
                multiline numberOfLines={2}
              />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
              <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.nextBtnText}>পর্যালোচনা করুন →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3: Review & confirm ── */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>বুকিং পর্যালোচনা</Text>

            {/* Summary */}
            <View style={styles.card}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>গরু</Text>
                <Text style={styles.reviewValue}>{cow.name || cow.breed}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>মূল্য</Text>
                <Text style={styles.reviewValue}>{fmt(cow.price)}</Text>
              </View>
              <View style={[styles.reviewRow, styles.reviewHighlight]}>
                <Text style={[styles.reviewLabel, { color: Colors.primary }]}>অগ্রিম পেমেন্ট</Text>
                <Text style={[styles.reviewValue, { color: Colors.primary, fontWeight: '800' }]}>{fmt(advance)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>পেমেন্ট পদ্ধতি</Text>
                <Text style={styles.reviewValue}>{pm?.emoji} {pm?.label}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>পছন্দের তারিখ</Text>
                <Text style={styles.reviewValue}>{deliveryDate || '—'}</Text>
              </View>
              {deliveryAddr ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>ঠিকানা</Text>
                  <Text style={[styles.reviewValue, { flex: 1, textAlign: 'right' }]}>{deliveryAddr}</Text>
                </View>
              ) : null}
              {note ? (
                <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.reviewLabel}>নোট</Text>
                  <Text style={[styles.reviewValue, { flex: 1, textAlign: 'right' }]}>{note}</Text>
                </View>
              ) : null}
            </View>

            {/* Terms */}
            <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={14} color={Colors.white} />}
              </View>
              <Text style={styles.termsText}>
                আমি শর্তাবলীতে সম্মত: বুকিং বাতিল করলে অগ্রিমের ৫০% ফেরত পাবো। বিক্রেতা ২৪ ঘণ্টার মধ্যে নিশ্চিত করবেন।
              </Text>
            </TouchableOpacity>

            <View style={styles.cancellationBox}>
              <Text style={styles.cancellationTitle}>📋 বাতিল নীতি</Text>
              <Text style={styles.cancellationText}>• বুকিং ২৪ ঘণ্টার আগে বাতিল → ৫০% অগ্রিম ফেরত</Text>
              <Text style={styles.cancellationText}>• বিক্রেতা বাতিল করলে → সম্পূর্ণ অগ্রিম ফেরত</Text>
              <Text style={styles.cancellationText}>• গরু পাওয়ার দিন বাকি টাকা পরিশোধ করুন</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, !agreed && styles.confirmBtnDisabled]}
              onPress={handleSubmit}
              disabled={!agreed || submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.confirmBtnText}>বুকিং নিশ্চিত করুন — {fmt(advance)}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        orderId={orderId}
        onDone={() => {
          setShowSuccess(false);
          router.replace('/(tabs)/chat');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorEmoji:{ fontSize: 48 },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  retryBtn:  { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  retryText: { color: Colors.white, fontWeight: '700' },

  header:     { paddingTop: 52, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, overflow: 'hidden' },
  circle1:    { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -40 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },

  stepBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepCircle:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  stepCircleActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepCircleDone:   { backgroundColor: Colors.success, borderColor: Colors.success },
  stepNum:          { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  stepNumActive:    { color: Colors.white },
  stepLabel:        { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  stepLabelActive:  { color: Colors.white, fontWeight: '700' },
  stepConnector:    { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16, marginHorizontal: 4 },
  stepConnectorDone:{ backgroundColor: Colors.accent },

  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },

  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },

  // Cow card
  cowCard:    { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.md },
  cowCardTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  cowPhotoPlaceholder: { width: 90, height: 90, borderRadius: BorderRadius.lg, backgroundColor: Colors.accentPale, alignItems: 'center', justifyContent: 'center' },
  cowCardInfo:  { flex: 1, justifyContent: 'center', gap: 4 },
  cowCardName:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  cowCardBreed: { fontSize: FontSize.sm, color: Colors.textMuted },
  healthBadge:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 4 },
  healthText:   { fontSize: FontSize.xs, fontWeight: '700' },
  cowCardMeta:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: Spacing.md },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  metaLabel:    { fontSize: FontSize.xs, color: Colors.textMuted },
  metaValue:    { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  priceRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  priceLabel:   { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  priceValue:   { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },

  // Payment box
  payBox:     { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  payTitle:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  payRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  payAdvance: { backgroundColor: Colors.accentPale, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 0, borderTopWidth: 1, borderColor: Colors.border },
  payLabel:   { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  payHint:    { fontSize: FontSize.xs, color: Colors.textMuted },
  payAmount:  { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },

  infoBox:  { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.success + '12', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.success + '30' },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Cards & inputs
  card:       { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  cardTitle:  { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, backgroundColor: Colors.white },
  input:      { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  textarea:   { minHeight: 72, alignItems: 'flex-start', paddingVertical: Spacing.sm },

  // Payment methods
  pmRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  pmRowActive:  { backgroundColor: Colors.accentPale, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  pmEmoji:      { fontSize: 22 },
  pmLabel:      { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  pmCheck:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sandboxNote:  { backgroundColor: Colors.info + '12', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '30' },
  sandboxText:  { fontSize: FontSize.xs, color: Colors.info },

  // Review
  reviewRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewHighlight: { backgroundColor: Colors.accentPale, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  reviewLabel:     { fontSize: FontSize.sm, color: Colors.textMuted },
  reviewValue:     { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },

  termsRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  termsText:    { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  cancellationBox:  { backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 6 },
  cancellationTitle:{ fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cancellationText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  nextBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54 },
  nextBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },

  confirmBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...Shadow.md },
  confirmBtnDisabled: { backgroundColor: Colors.border },
  confirmBtnText:     { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },

  // Success modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successBox:     { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center', gap: Spacing.md },
  successIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success + '18', alignItems: 'center', justifyContent: 'center' },
  successIcon:    { fontSize: 44 },
  successTitle:   { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  successText:    { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  orderIdBox:     { backgroundColor: Colors.accentPale, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center', width: '100%' },
  orderIdLabel:   { fontSize: FontSize.xs, color: Colors.textMuted },
  orderIdValue:   { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, letterSpacing: 2 },
  successBtn:     { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, marginTop: Spacing.sm },
  successBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.lg },
});
