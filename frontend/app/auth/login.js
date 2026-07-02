import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "../../constants/theme";
import { auth, db } from "../../firebaseConfig";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { role } = useLocalSearchParams();

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "ইমেইল দিন";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "সঠিক ইমেইল দিন";
    if (!password) e.password = "পাসওয়ার্ড দিন";
    else if (password.length < 6) e.password = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    console.log("hi");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = userCredential.user;

      // ২. Firestore-এর 'users' কালেকশন থেকে ইউজারের ডকুমেন্ট রিড করুন
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const dbRole = userDocSnap.data().role; // ডাটাবেসে সেভ থাকা রোল

        // ৩. ডাটাবেসের রোলের সাথে স্ক্রিনের নির্বাচিত রোল (role) মিলিয়ে দেখুন
        if (dbRole === role) {
          if (dbRole === "farmer") {
            router.replace("./../farmer/select");
          } else {
            router.replace("./../(buyer)/(tabs)/home");
          }
        } else {
          // রোল না মিললে অ্যালার্ট দিন এবং অটোমেটিক সাইন-আউট করে দিন
          Alert.alert(
            "লগইন ব্যর্থ",
            "আপনার অ্যাকাউন্টের ধরনের সাথে নির্বাচিত রোল মিলছে না!",
          );
          await auth.signOut();
        }
      } else {
        Alert.alert(
          "ত্রুটি",
          "আপনার প্রোফাইলের কোনো তথ্য ডাটাবেসে পাওয়া যায়নি!",
        );
        await auth.signOut();
      }
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।"
          : err.code === "auth/too-many-requests"
            ? "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
            : "লগইন করা যায়নি। আবার চেষ্টা করুন।";
      Alert.alert("লগইন ব্যর্থ", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("ইমেইল দিন", "পাসওয়ার্ড রিসেটের জন্য আগে ইমেইল লিখুন।");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "✉️ ইমেইল পাঠানো হয়েছে",
        "পাসওয়ার্ড রিসেটের লিংক আপনার ইমেইলে পাঠানো হয়েছে।",
      );
    } catch {
      Alert.alert(
        "সমস্যা হয়েছে",
        "ইমেইল পাঠানো যায়নি। ইমেইল ঠিকানা যাচাই করুন।",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header gradient ── */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🐄</Text>
            </View>
            <Text style={styles.appName}>খামার বন্ধু</Text>
            <Text style={styles.tagline}>আপনার বিশ্বস্ত কৃষি সঙ্গী</Text>
          </View>
        </LinearGradient>

        {/* ── Form card ── */}
        <View style={styles.card}>
          <Text style={styles.title}>স্বাগতম! 👋</Text>
          <Text style={styles.subtitle}>
            {role === "farmer"
              ? "খামারি হিসেবে লগইন করুন"
              : "ক্রেতা হিসেবে লগইন করুন"}
          </Text>

          <View style={styles.form}>
            <Input
              label="ইমেইল"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="আপনার ইমেইল লিখুন"
              keyboardType="email-address"
              error={errors.email}
            />
            <Input
              label="পাসওয়ার্ড"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="পাসওয়ার্ড লিখুন"
              secureTextEntry
              error={errors.password}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            </TouchableOpacity>

            <Button
              title="লগইন করুন"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>অথবা</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>নতুন অ্যাকাউন্ট নেই? </Text>
              <TouchableOpacity
                onPress={() => router.push(`/auth/register?role=${role}`)}
              >
                <Text style={styles.registerLink}>নিবন্ধন করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>খামার বন্ধু © ২০২৬</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  logoWrap: { alignItems: "center", zIndex: 1 },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoEmoji: { fontSize: 38 },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -24,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },

  form: { gap: 0 },

  forgotBtn: { alignSelf: "flex-end", marginTop: -4, marginBottom: Spacing.lg },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },

  loginBtn: { marginTop: Spacing.xs },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  registerLink: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },

  footer: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    paddingVertical: Spacing.xl,
  },
});
