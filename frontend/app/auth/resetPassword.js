// app/auth/resetPassword.js
// Simple "forgot password" screen. User enters email, Firebase sends a reset link.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { role } = useLocalSearchParams();


  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে আপনার ইমেইল লিখুন');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      let message = 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন';
      if (err.code === 'auth/user-not-found') {
        message = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি';
      } else if (err.code === 'auth/invalid-email') {
        message = 'সঠিক ইমেইল ঠিকানা দিন';
      }
      Alert.alert('ব্যর্থ', message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ইমেইল পাঠানো হয়েছে ✅</Text>
        <Text style={styles.subtitle}>
          {email} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন।
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace(`./login?role=${role}`)}>
          <Text style={styles.buttonText}>লগইন পেজে যান</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>পাসওয়ার্ড রিসেট করুন</Text>
      <Text style={styles.subtitle}>
        আপনার অ্যাকাউন্টের ইমেইল দিন, আমরা রিসেট লিংক পাঠিয়ে দেব।
      </Text>

      <TextInput
        style={styles.input}
        placeholder="ইমেইল"
        placeholderTextColor="#9BAA9C"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>রিসেট লিংক পাঠান</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLinkText}>ফিরে যান</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6F1', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1B3B2F', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#6B776E', lineHeight: 20, marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7ECE6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1B3B2F',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink: { marginTop: 18, alignItems: 'center' },
  backLinkText: { color: '#2D6A4F', fontSize: 13, fontWeight: '600' },
});