import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../../firebaseConfig";
import {
    BorderRadius,
    Colors,
    FontSize,
    Shadow,
    Spacing,
} from "../../../constants/theme";

// ── Normalization helpers ─────────────────────────────────────────────────
const normalizeUser = (data) => ({
  id: data.id,
  firebase_uid: data.firebase_uid,
  name: data.name || '',
  email: data.email || '',
  phone: data.phone || '',
  role: data.role || 'farmer',
  profile_photo: data.profile_photo || null,
  email_verified: data.is_verified !== false,
  created_at: data.created_at,
});

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress || (() => {})}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: (danger ? Colors.error : Colors.primary) + "15" },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.error : Colors.primary}
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function BuyerProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('ত্রুটি', 'লগইন করুন');
        return;
      }

      // Get user document from Firestore by firebase_uid
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('firebase_uid', '==', currentUser.uid))
      );

      if (usersSnap.empty) {
        Alert.alert('ত্রুটি', 'ব্যবহারকারী তথ্য পাওয়া যায়নি');
        setUser(null);
        return;
      }

      const userDoc = usersSnap.docs[0];
      const userData = normalizeUser({ id: userDoc.id, ...userDoc.data() });
      setUser(userData);
    } catch (err) {
      console.error('Error loading user data:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleLogout = async () => {
    Alert.alert("লগআউট", "আপনি কি লগআউট করতে চান?", [
      { text: "বাতিল", style: "cancel" },
      {
        text: "লগআউট",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.dismissAll();
            router.replace("./../../");
          } catch (err) {
            console.error('Logout error:', err);
            Alert.alert("সমস্যা হয়েছে", "লগআউট করা যায়নি।");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.loadingText}>ব্যবহারকারী তথ্য পাওয়া যায়নি।</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadUserData}>
          <Text style={styles.retryText}>পুনরায় চেষ্টা করুন</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.avatarWrap}>
          {user?.profile_photo ? (
            <Image
              source={{ uri: user.profile_photo }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {(user?.name || "ক")[0].toUpperCase()}
              </Text>
            </View>
          )}
          {user?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.name || "ব্যবহারকারী"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>🛒 ক্রেতা</Text>
        </View>
        
        {user?.is_verified && (
          <View style={styles.verifiedText}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={Colors.accentLight}
            />
            <Text style={styles.verifiedLabel}>ইমেইল যাচাইকৃত</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>অ্যাকাউন্ট</Text>
          <MenuItem icon="person-outline" label="প্রোফাইল সম্পাদনা করুন" />
          <MenuItem icon="chatbubbles-outline" label="আমার বার্তা" />
          <MenuItem icon="star-outline" label="রিভিউ ও রেটিং" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>সেটিংস</Text>
          <MenuItem icon="notifications-outline" label="নোটিফিকেশন সেটিংস" />
          <MenuItem icon="moon-outline" label="ডার্ক মোড" onPress={() => {}} />
          <MenuItem icon="lock-closed-outline" label="পাসওয়ার্ড পরিবর্তন" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>সহায়তা</Text>
          <MenuItem
            icon="help-circle-outline"
            label="সাহায্য কেন্দ্র"
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label="ব্যবহারের শর্তাবলী"
            onPress={() => {}}
          />
          <MenuItem
            icon="shield-outline"
            label="গোপনীয়তা নীতি"
            onPress={() => {}}
          />
        </View>

        <View style={[styles.card, { marginBottom: 0 }]}>
          <MenuItem
            icon="log-out-outline"
            label="লগআউট করুন"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.version}>খামার বন্ধু v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textMuted },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: Colors.white, fontWeight: "700" },

  header: {
    paddingTop: 54,
    paddingBottom: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -50,
    right: -50,
  },
  avatarWrap: { position: "relative", marginBottom: Spacing.md },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.accentLight,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitial: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: Colors.white,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 4,
  },
  email: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  roleText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: "600" },
  verifiedText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedLabel: {
    color: Colors.accentLight,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },

  scroll: { flex: 1, padding: Spacing.lg },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  menuLabelDanger: { color: Colors.error },

  version: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.lg,
  },
});
