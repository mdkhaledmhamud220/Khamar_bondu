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
} from "react-native";
import {
    BorderRadius,
    Colors,
    FontSize,
    Shadow,
    Spacing,
} from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";

const MOCK_MY_COWS = [
  {
    id: "c1",
    name: "রানি",
    breed: "দেশি",
    ageMonths: 28,
    weightKg: 320,
    district: "রাজশাহী",
    price: 150000,
    gender: "female",
    status: "available",
    healthScore: 85,
    healthGrade: "A",
    photos: [],
    milkProduction: 15,
  },
  {
    id: "c2",
    name: "সোনা",
    breed: "ফ্রিজিয়ান",
    ageMonths: 30,
    weightKg: 370,
    price: 185000,
    gender: "female",
    status: "available",
    healthScore: 80,
    healthGrade: "A-",
    photos: [],
    milkProduction: 20,
  },
];

function FarmCard({ cow, onPress }) {
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
      </View>

      <View style={styles.cowInfo}>
        <Text style={styles.cowName}>{cow.name}</Text>
        <View style={styles.cowStats}>
          <View style={styles.statItem}>
            <Ionicons name="water-outline" size={14} color={Colors.primary} />
            <Text style={styles.statText}>{cow.milkProduction}L</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={14} color={Colors.warning} />
            <Text style={styles.statText}>{cow.healthScore}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name="barbell-outline"
              size={14}
              color={Colors.primaryMid}
            />
            <Text style={styles.statText}>{cow.weightKg}kg</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FarmerHomeScreen() {
  const router = useRouter();
  const auth = useAuth() || {};
  const profile = auth.profile || { name: "কৃষক", role: "farmer" };
  const [myCows, setMyCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMyCows = useCallback(async () => {
    try {
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 200));
      setMyCows(MOCK_MY_COWS);
    } catch (e) {
      setError("আপনার গরু তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCows();
  }, [fetchMyCows]);

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
            <Text style={styles.greeting}>{greeting()}, 👨‍🌾</Text>
            <Text style={styles.userName}>{profile?.name || "কৃষক"}</Text>
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
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{myCows.length}</Text>
          <Text style={styles.statLabel}>আমার গরু</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {myCows.reduce((sum, c) => sum + (c.milkProduction || 0), 0)}L
          </Text>
          <Text style={styles.statLabel}>মোট দুধ</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {Math.round(
              myCows.reduce((sum, c) => sum + c.healthScore, 0) /
                (myCows.length || 1),
            )}
          </Text>
          <Text style={styles.statLabel}>গড় স্বাস্থ্য</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMyCows}>
            <Text style={styles.retryText}>আবার চেষ্টা করুন</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myCows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FarmCard
              cow={item}
              onPress={() => router.push(`./../cows/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMyCows();
              }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.errorEmoji}>🐄</Text>
              <Text style={styles.emptyText}>কোনো গরু যোগ করেননি</Text>
              <TouchableOpacity
                style={styles.addFirstBtn}
                onPress={() => router.push("./../cows/add")}
              >
                <Text style={styles.addFirstText}>+ প্রথম গরু যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("./../cows/add")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          style={styles.fabGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
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

  statsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    ...Shadow.sm,
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },

  cowCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadow.md,
    flexDirection: "row",
  },
  cowPhotoWrap: { width: 120, height: 120, position: "relative" },
  cowPhoto: { width: "100%", height: "100%" },
  cowPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  cowPhotoEmoji: { fontSize: 40 },

  cowInfo: { flex: 1, padding: Spacing.md, justifyContent: "space-between" },
  cowName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  cowStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: "500",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  errorText: {
    color: Colors.error,
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
  addFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addFirstText: { color: Colors.white, fontWeight: "700" },

  fab: { position: "absolute", bottom: 24, right: 24 },
  fabGrad: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.lg,
  },
});
