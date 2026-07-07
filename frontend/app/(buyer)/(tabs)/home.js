import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "../../../constants/theme";
import { auth, db } from "../../../firebaseConfig";

// Normalize Firestore cow doc to UI shape
const normalizeCow = (doc) => {
  const d = doc.data ? doc.data() : doc;
  return {
    farm_id: d.farm_id || null,
    id: doc.id || d.id,
    name: d.name || d.breed || "গরু",
    breed: d.breed || "অন্যান্য",
    ageMonths: d.age_months || d.ageMonths || 0,
    weightKg: d.weight_kg || d.weightKg || 0,
    district: d.district || d.location || "অজানা",
    price: d.sale_price || 0,
    gender: d.gender || "female",
    status: d.status || "available",
    healthScore: d.health_score || d.healthScore || 0,
    healthGrade: d.health_grade || d.healthGrade || "—",
    photos: d.photos || d.photo_urls || [],
  };
};

// ── Normalization helpers ─────────────────────────────────────────────────
const normalizeUser = (data) => ({
  id: data.id,
  firebase_uid: data.firebase_uid,
  name: data.name || "",
  email: data.email || "",
  phone: data.phone || "",
  role: data.role || "farmer",
  profile_photo: data.profile_photo || null,
  is_verified: data.is_verified,
  created_at: data.created_at,
});

const BREEDS = [
  "সব",
  "দেশি",
  "শাহীওয়াল",
  "ফ্রিজিয়ান",
  "ব্রাহমান",
  "হরিয়ানা",
];

function HealthBadge({ score, grade }) {
  const color =
    score >= 85
      ? Colors.healthExcellent
      : score >= 70
        ? Colors.healthGood
        : score >= 50
          ? Colors.healthAverage
          : score >= 30
            ? Colors.healthWeak
            : Colors.healthBad;

  return (
    <View
      style={[
        styles.healthBadge,
        { backgroundColor: color + "20", borderColor: color },
      ]}
    >
      <Text style={[styles.healthScore, { color }]}>{score}</Text>
      <Text style={[styles.healthGrade, { color }]}>{grade}</Text>
    </View>
  );
}

function CowCard({ cow, onPress }) {
  return (
    <TouchableOpacity
      style={styles.cowCard}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.cowPhotoWrap}>
        {cow.photos?.length > 0 ? (
          <Image
            source={{ uri: cow.photos[0] }}
            style={styles.cowPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cowPhotoPlaceholder}>
            <Text style={styles.cowPhotoEmoji}>🐄</Text>
          </View>
        )}
        <View
          style={[
            styles.statusBadge,
            cow.status === "available"
              ? styles.statusAvailable
              : styles.statusReserved,
          ]}
        >
          <Text style={styles.statusText}>
            {cow.status === "available" ? "পাওয়া যাচ্ছে" : "বুকড"}
          </Text>
        </View>
      </View>

      <View style={styles.cowInfo}>
        <View style={styles.cowTopRow}>
          <Text style={styles.cowBreed}>{cow.breed}</Text>
          <HealthBadge score={cow.healthScore} grade={cow.healthGrade} />
        </View>

        <Text style={styles.cowName}>{cow.name || `${cow.breed} গরু`}</Text>

        <View style={styles.cowDetails}>
          <View style={styles.detailChip}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.detailText}>{cow.ageMonths} মাস</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons
              name="barbell-outline"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.detailText}>{cow.weightKg} কেজি</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons
              name="location-outline"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.detailText}>{cow.district || "অজানা"}</Text>
          </View>
        </View>

        <View style={styles.cowBottom}>
          <Text style={styles.cowPrice}>
            ৳ {cow.price?.toLocaleString("bn-BD")}
          </Text>
          <View style={styles.genderBadge}>
            <Text style={styles.genderText}>
              {cow.gender === "male" ? "♂ ষাঁড়" : "♀ গাভী"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BuyerHomeScreen() {
  const router = useRouter();
  const [cows, setCows] = useState([]);
  const [user, setUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [breed, setBreed] = useState("সব");
  const [error, setError] = useState(null);

  const fetchCows = useCallback(async () => {
    try {
      setError(null);
      // small debounce/UX delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      // build query: only available cows, optionally filter by breed
      const constraints = [where("status", "==", "available")];
      if (breed && breed !== "সব")
        constraints.push(where("breed", "==", breed));
      const q = query(collection(db, "cows"), ...constraints);
      const snap = await getDocs(q);
      const cows = snap.docs.map((doc) => normalizeCow(doc));
      const items = await Promise.all(
        cows.map(async (cow) => {
          let district = "অজানা";
          const farmRef = doc(db, "farms", cow.farm_id);

          const farmSnap = await getDoc(farmRef);
          if (cow.farm_id) {
            if (farmSnap.exists()) {
              district = farmSnap.data().district || "অজানা";
            }
          }
          return {
            ...cow,
            district,
          };
        }),
      );

      setCows(items);
    } catch (e) {
      setError("গরুর তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [breed]);

  useEffect(() => {
    fetchCows();
  }, [fetchCows]);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      console.log(currentUser.uid);
      if (!currentUser) {
        Alert.alert("ত্রুটি", "লগইন করুন");
        return;
      }
      // Get user document from Firestore by firebase_uid
      const usersSnap = await getDocs(
        query(
          collection(db, "users"),
          where("firebase_uid", "==", currentUser.uid),
        ),
      );

      if (usersSnap.empty) {
        Alert.alert("ত্রুটি", "ব্যবহারকারী তথ্য পাওয়া যায়নি");
        setUser(null);
        return;
      }

      const userDoc = usersSnap.docs[0];
      const userData = normalizeUser({ id: userDoc.id, ...userDoc.data() });
      setUser(userData);
    } catch (err) {
      console.error("Error loading user data:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const filteredCows = cows.filter(
    (c) =>
      search === "" ||
      c.breed?.toLowerCase().includes(search.toLowerCase()) ||
      c.district?.includes(search) ||
      c.name?.includes(search),
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "শুভ সকাল";
    if (h < 17) return "শুভ দুপুর";
    return "শুভ সন্ধ্যা";
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()}, 👋</Text>
            <Text style={styles.userName}>{user.name || "ক্রেতা"}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push("./notification")}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.white}
            />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="গরু খুঁজুন... (জেলা, প্রজাতি)"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.filterWrap}>
        <FlatList
          data={BREEDS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                breed === item && styles.filterChipActive,
              ]}
              onPress={() => setBreed(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  breed === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchCows}>
            <Text style={styles.retryText}>আবার চেষ্টা করুন</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCows}
          keyExtractor={(item, index) =>
            item?.id?.toString?.() || `cow-${index}`
          }
          renderItem={({ item }) => (
            <CowCard
              cow={item}
              onPress={() => router.push(`/cows/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCows();
              }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.errorEmoji}>🐄</Text>
              <Text style={styles.emptyText}>কোনো গরু পাওয়া যায়নি</Text>
            </View>
          }
          ListHeaderComponent={
            filteredCows.length > 0 ? (
              <Text style={styles.resultCount}>
                {filteredCows.length}টি গরু পাওয়া গেছে
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -40,
    right: -30,
  },
  circle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 10,
    left: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  greeting: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.75)" },
  userName: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.white },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },

  filterWrap: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  filterChipTextActive: { color: Colors.white, fontWeight: "700" },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  resultCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },

  cowCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadow.md,
  },
  cowPhotoWrap: { height: 180, position: "relative" },
  cowPhoto: { width: "100%", height: "100%" },
  cowPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  cowPhotoEmoji: { fontSize: 60 },
  statusBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusAvailable: { backgroundColor: Colors.primary },
  statusReserved: { backgroundColor: Colors.warning },
  statusText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: "700" },

  cowInfo: { padding: Spacing.md },
  cowTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cowBreed: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  cowName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  cowDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  detailText: { fontSize: FontSize.xs, color: Colors.textMuted },
  cowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cowPrice: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.primary },
  genderBadge: {
    backgroundColor: Colors.accentPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  genderText: {
    fontSize: FontSize.xs,
    color: Colors.primaryMid,
    fontWeight: "600",
  },

  healthBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignItems: "center",
  },
  healthScore: { fontSize: FontSize.md, fontWeight: "800" },
  healthGrade: { fontSize: 9, fontWeight: "600" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  errorEmoji: { fontSize: 48 },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: "center",
  },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  retryBtn: {
    backgroundColor: Colors.accentPale,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: Colors.primary, fontWeight: "600" },
});
