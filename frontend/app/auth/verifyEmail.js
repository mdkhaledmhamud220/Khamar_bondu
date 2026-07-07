import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams} from 'expo-router';
import { getAuth, sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // <-- ADJUST if your export name differs

export default function VerifyEmailScreen() {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const { role } = useLocalSearchParams();

  const auth = getAuth();
  const user = auth.currentUser;

  // Fire off the verification email once, as soon as the screen opens.
  useEffect(() => {
    if (user && !user.emailVerified) {
      handleSendEmail(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendEmail = async (silent = false) => {
    if (!user) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      setJustSent(true);
      if (!silent) Alert.alert('পাঠানো হয়েছে', 'আপনার ইমেইলে ভেরিফিকেশন লিংক পাঠানো হয়েছে');
    } catch (err) {
      Alert.alert('ব্যর্থ', 'ইমেইল পাঠাতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন');
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerified = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      await reload(user); // pulls the latest emailVerified status from Firebase
      if (user.emailVerified) {
        // Mirror the verified status onto the user's Firestore document.
        await updateDoc(doc(db, 'users', user.uid), { is_verified: true });
        Alert.alert('সফল ✅', 'আপনার ইমেইল ভেরিফাই হয়েছে', [
          { text: 'ঠিক আছে', onPress: () => router.replace(`./login?role=${role}`) },
        ]);
      } else {
        Alert.alert(
          'এখনো ভেরিফাই হয়নি',
          'ইমেইলে পাঠানো লিংকে ক্লিক করে তারপর আবার চেক করুন'
        );
      }
    } catch (err) {
      Alert.alert('ত্রুটি', 'চেক করতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setChecking(false);
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ইমেইল ভেরিফাই করুন</Text>
      <Text style={styles.subtitle}>
        {user?.email
          ? `${user.email} ঠিকানায় একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করার পর নিচের বাটনে চাপ দিন।`
          : 'আপনি লগইন করা নেই।'}
      </Text>

      <TouchableOpacity
        style={[styles.button, checking && styles.buttonDisabled]}
        onPress={handleCheckVerified}
        disabled={checking || !user}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>ভেরিফাই হয়েছে কিনা চেক করুন</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, sending && styles.buttonDisabled]}
        onPress={() => handleSendEmail(false)}
        disabled={sending || !user}
      >
        <Text style={styles.secondaryButtonText}>
          {justSent ? 'আবার ইমেইল পাঠান' : 'ভেরিফিকেশন ইমেইল পাঠান'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace(`./login?role=${role}`)} style={styles.backLink}>
        <Text style={styles.backLinkText}>লগইন পেজে ফিরে যান</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6F1', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1B3B2F', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#6B776E', lineHeight: 20, marginBottom: 28 },
  button: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#2D6A4F', fontSize: 14, fontWeight: '600' },
  backLink: { marginTop: 18, alignItems: 'center' },
  backLinkText: { color: '#6B776E', fontSize: 13, fontWeight: '600' },
});