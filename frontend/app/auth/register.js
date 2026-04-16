import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Input  from '../../components/Input';
import Button from '../../components/Button';

import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';


const DISTRICTS = [
  'ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','বরিশাল','সিলেট','রংপুর','ময়মনসিংহ',
  'কুমিল্লা','গাজীপুর','নারায়ণগঞ্জ','টাঙ্গাইল','কিশোরগঞ্জ','মানিকগঞ্জ',
  'মুন্সিগঞ্জ','নরসিংদী','ফরিদপুর','মাদারীপুর','গোপালগঞ্জ','শরীয়তপুর',
];

export default function RegisterScreen() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [district, setDistrict] = useState('');
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const { role } = useLocalSearchParams();

  const validate = () => {
    const e = {};
    if (!name.trim())   e.name = 'নাম দিন';
    if (!email.trim())  e.email = 'ইমেইল দিন';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'সঠিক ইমেইল দিন';
    if (!phone.trim())  e.phone = 'ফোন নম্বর দিন';
    else if (phone.length < 11) e.phone = 'সঠিক ফোন নম্বর দিন';
    if (!password)      e.password = 'পাসওয়ার্ড দিন';
    else if (password.length < 6) e.password = 'কমপক্ষে ৬ অক্ষর';
    if (password !== confirm) e.confirm = 'পাসওয়ার্ড মিলছে না';
    if (!district) e.district = 'জেলা নির্বাচন করুন';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // await updateProfile(cred.user, { displayName: name.trim() });
      // await sendEmailVerification(cred.user);

      // await api.post('/users/profile', {
      //   name: name.trim(), phone, role, district,
      // });
      console.log("hi");
      Alert.alert(
        '✅ নিবন্ধন সফল!',
        'আপনার ইমেইলে একটি যাচাই লিংক পাঠানো হয়েছে। ইমেইল যাচাই করুন।',
        [{ text: 'ঠিক আছে', onPress: () => router.replace(`./login?role=${role}`) }]
      );
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে।' :
        err.code === 'auth/weak-password'         ? 'পাসওয়ার্ড দুর্বল। আরও শক্তিশালী পাসওয়ার্ড দিন।' :
        err.userMessage || 'নিবন্ধন করা যায়নি।';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.circle1} /><View style={styles.circle2} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>নতুন অ্যাকাউন্ট</Text>
            <Text style={styles.headerSub}>
              {role === 'farmer'
                ? 'খামার বন্ধুতে খামারি হিসেবে যোগ দিন'
                : 'খামার বন্ধুতে ক্রেতা হিসেবে যোগ দিন'}
            </Text>
          </View>
          
        </LinearGradient>

        <View style={styles.card}>
            <>
              <Text style={styles.stepTitle}>ব্যক্তিগত তথ্য</Text>
              <Input label="পূর্ণ নাম" icon="person-outline"    value={name}     onChangeText={setName}     placeholder="আপনার নাম লিখুন"       error={errors.name} />
              <Input label="ইমেইল"     icon="mail-outline"      value={email}    onChangeText={setEmail}    placeholder="ইমেইল ঠিকানা"           keyboardType="email-address" error={errors.email} />
              <Input label="ফোন নম্বর" icon="call-outline"      value={phone}    onChangeText={setPhone}    placeholder="01XXXXXXXXX"            keyboardType="phone-pad" error={errors.phone} />
             

  

              {/* District picker */}
              <Text style={[styles.fieldLabel]}>আপনার জেলা নির্বাচন করুন</Text>
              {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
              <TouchableOpacity
                style={[styles.districtBtn, showDistrictPicker && styles.districtBtnActive]}
                onPress={() => setShowDistrictPicker(!showDistrictPicker)}
              >
                <Ionicons name="location-outline" size={18} color={district ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.districtBtnText, district && styles.districtBtnTextSelected]}>
                  {district || 'জেলা বেছে নিন'}
                </Text>
                <Ionicons name={showDistrictPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              {showDistrictPicker && (
                <View style={styles.districtList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {DISTRICTS.map(d => (
                      <TouchableOpacity
                      key={d} style={[styles.districtItem, district === d && styles.districtItemActive]}
                      onPress={() => { setDistrict(d); setShowDistrictPicker(false); }}
                      >
                        <Text style={[styles.districtItemText, district === d && styles.districtItemTextActive]}>{d}</Text>
                        {district === d && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <Input label="পাসওয়ার্ড" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="কমপক্ষে ৬ অক্ষর"     secureTextEntry error={errors.password} />
              <Input label="পাসওয়ার্ড নিশ্চিত করুন" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} placeholder="পাসওয়ার্ড আবার লিখুন" secureTextEntry error={errors.confirm} />

              <Button title="নিবন্ধন সম্পন্ন করুন ✓" onPress={handleRegister} loading={loading} style={{ marginTop: Spacing.xl }} />
            </>
          

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>ইতিমধ্যে অ্যাকাউন্ট আছে? </Text>
            <TouchableOpacity onPress={() => router.push(`/auth/login?role=${role}`)}>
              <Text style={styles.loginLink}>লগইন করুন</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>খামার বন্ধু © ২০২৬</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flexGrow: 1 },

  header:  { paddingTop: 60, paddingBottom: 40, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  circle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -40 },
  circle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -20 },

  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  headerContent: { marginBottom: Spacing.lg },
  headerTitle:   { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSub:     { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  stepRow:        { flexDirection: 'row', alignItems: 'center' },
  stepItem:       { flexDirection: 'row', alignItems: 'center' },
  stepDot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  stepDotActive:  { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepNum:        { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  stepNumActive:  { color: Colors.white },
  stepLine:       { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.accent },

  card: { backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: -20, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadow.lg, marginBottom: Spacing.lg },
  stepTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },

  fieldLabel:  { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  errorText:   { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.sm },

  roleRow:       { flexDirection: 'row', gap: Spacing.md },
  roleCard:      { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', position: 'relative', backgroundColor: Colors.white },
  roleCardActive:{ borderColor: Colors.primary, backgroundColor: Colors.accentPale },
  roleEmoji:     { fontSize: 28, marginBottom: Spacing.sm },
  roleLabel:     { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  roleLabelActive:{ color: Colors.primary },
  roleDesc:      { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  roleCheck:     { position: 'absolute', top: 8, right: 8 },

  districtBtn:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, backgroundColor: Colors.white, marginBottom:8 },
  districtBtnActive:   { borderColor: Colors.primary },
  districtBtnText:     { flex: 1, fontSize: FontSize.md, color: Colors.textMuted },
  districtBtnTextSelected: { color: Colors.textPrimary, fontWeight: '500' },
  districtList:        { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.white, marginTop: 4, overflow: 'hidden', ...Shadow.sm },
  districtItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  districtItemActive:  { backgroundColor: Colors.accentPale },
  districtItemText:    { fontSize: FontSize.md, color: Colors.textPrimary },
  districtItemTextActive: { color: Colors.primary, fontWeight: '600' },

  loginRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginText: { color: Colors.textMuted, fontSize: FontSize.sm },
  loginLink: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },

  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.xs, paddingVertical: Spacing.xl },
});
