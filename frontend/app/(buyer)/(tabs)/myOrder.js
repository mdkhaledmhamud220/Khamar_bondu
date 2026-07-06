import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView 
} from "react-native";
import {
    BorderRadius,
    Colors,
    FontSize,
    Shadow,
    Spacing,
} from "../../../constants/theme";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../../firebaseConfig";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
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
            cow.order_status === "pending"
              ? { backgroundColor: "#f59e0b" }
              : cow.order_status === "confirmed"
                ? { backgroundColor: "#3b82f6" }
                : cow.order_status === "completed"
                  ? { backgroundColor: "#10b981" }
                  : { backgroundColor: "#ef4444" },
          ]}
        >
          <Text style={styles.statusText}>{cow.order_status}</Text>
        </View>
      </View>

      <View style={styles.cowInfo}>
        <View style={styles.cowTopRow}>
          <Text style={styles.cowBreed}>{cow.breed}</Text>
          <HealthBadge score={cow.healthScore} grade={cow.healthGrade} />
        </View>

        <Text style={styles.cowName}>{cow.cowName}</Text>

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

export default function myOrder() {
  const router = useRouter();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [breed, setBreed] = useState("সব");
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchCows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = auth.currentUser;
      console.log("Current User:", auth.currentUser);
      console.log("UID:", auth.currentUser?.uid);

      if (!user) {
        setError("Please login first.");
        return;
      }

      const q = query(
        collection(db, "orders"),
        where("buyerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const orders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),

        cowName: doc.data().name,
        breed: doc.data().breed,
        price: doc.data().price,
        order_status: doc.data().status,
        healthScore: doc.data().healthScore ?? 0,
        healthGrade: doc.data().healthGrade ?? "-",
        ageMonths: doc.data().ageMonths ?? 0,
        weightKg: doc.data().weightKg ?? 0,
        district: doc.data().district ?? "",
        gender: doc.data().gender ?? "",
        photos: doc.data().photos ?? [],
      }));

      setCows(orders);

    } catch (e) {

      console.log(e);

      setError("অর্ডার লোড করা যায়নি।");

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  }, []);

  useEffect((cows) => {
    console.log(cows)
    fetchCows();
  }, [fetchCows]);

  const filteredCows = cows.filter(
    (c) =>
      (statusFilter === "all" || c.order_status === statusFilter) &&
      (search === "" ||
        c.breed?.toLowerCase().includes(search.toLowerCase()) ||
        c.district?.includes(search) ||
        c.name?.includes(search)),
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
            <Text style={styles.userName}>{ "ক্রেতা"}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.white}
            />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.subtitle}>অপনার অর্ডার বিস্তারিত</Text>
        </View>
      </LinearGradient>

      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {STATUS_TABS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterChip,
                statusFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              onPress={() => router.push(`/orders/${item.id}`)}
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
              <Text style={styles.emptyText}>কোনো অর্ডার পাওয়া যায়নি</Text>
            </View>
          }
          ListHeaderComponent={
            filteredCows.length > 0 ? (
              <Text style={styles.resultCount}>
                {filteredCows.length}টি অর্ডার পাওয়া গেছে
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
  subtitle: {
    fontSize: FontSize.xl,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "400",
  },
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
