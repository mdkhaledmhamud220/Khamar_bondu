import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFarm } from "../../../context/FarmContext";
import { db, auth as firebaseAuth } from "../../../firebaseConfig";
import { createNotification } from "../../../services/notificationService";

const toNumber = (value) => Number(value) || 0;

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeCow = (doc) => ({
  id: doc.id,
  ...doc,
  farm_id: doc.farm_id ?? doc.farmId ?? null,
  name: doc.name || "নামহীন গরু",
  breed: doc.breed || "",
  gender: doc.gender || "",
  age_months: toNumber(doc.age_months ?? doc.ageMonths),
  weight_kg: toNumber(doc.weight_kg ?? doc.weightKg),
  price: toNumber(doc.price),
  sale_price: toNumber(doc.sale_price ?? doc.salePrice),
  health_score: toNumber(doc.health_score ?? doc.healthScore),
  status: doc.status || "draft",
  photos: Array.isArray(doc.photos) ? doc.photos : [],
  milkProduction: toNumber(doc.milkProduction),
});

const normalizeMilkLog = (doc) => ({
  id: doc.id,
  ...doc,
  cow_id: doc.cow_id ?? doc.cowId ?? null,
  log_date: doc.log_date ?? doc.logDate ?? null,
  morning_liters: toNumber(doc.morning_liters ?? doc.morningLiters),
  evening_liters: toNumber(doc.evening_liters ?? doc.eveningLiters),
  total_liters: toNumber(doc.total_liters ?? doc.totalLiters),
  sold_liters: toNumber(doc.sold_liters ?? doc.soldLiters),
  price_per_liter: toNumber(doc.price_per_liter ?? doc.pricePerLiter),
  income: toNumber(doc.income),
});

function FarmCard({ cow, onPress, onSell }) {
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
        <View style={styles.titleRow}>
          <Text style={styles.cowName} numberOfLines={1}>
            {cow.name}
          </Text>

          {cow.status === "booked" && (
            <TouchableOpacity
              style={styles.sellBtn}
              onPress={() => onSell(cow)}
            >
              <Text style={styles.sellBtnText}>বিক্রি</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cowStats}>
          <View style={styles.statItem}>
            <Ionicons name="water-outline" size={14} color={Colors.primary} />
            <Text style={styles.statText}>{cow.milkProduction}L</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={14} color={Colors.warning} />
            <Text style={styles.statText}>{cow.health_score}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name="barbell-outline"
              size={14}
              color={Colors.primaryMid}
            />
            <Text style={styles.statText}>{cow.weight_kg}kg</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SellConfirmAlert({
  cow,
  orderId,
  onOrderConfirm,
  onOrderCancel,
  onCancel,
}) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    setLoading(false);

    const loadOrder = async () => {
      try {
        const snap = await getDoc(doc(db, "orders", orderId));

        if (snap.exists()) {
          setOrder({
            id: snap.id,
            ...snap.data(),
          });
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (!cow) return null;

  return (
    <View style={styles.sellOverlay}>
      <View style={styles.sellModal}>
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>

        <Text style={styles.sellModalTitle}>বুকিং Overview</Text>

        {loading ? (
          <ActivityIndicator />
        ) : order ? (
          <View style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Text>👤 Buyer</Text>
              <Text>{order.buyerId}</Text>
            </View>

            <View style={styles.orderRow}>
              <Text>🏷 Booking</Text>
              <Text>{order.bookingCode}</Text>
            </View>

            <View style={styles.orderRow}>
              <Text>💰 Price</Text>
              <Text>৳ {order.price?.toLocaleString()}</Text>
            </View>

            <View style={styles.orderRow}>
              <Text>🚚 Delivery</Text>
              <Text>{order.deliveryDate}</Text>
            </View>

            <View style={styles.orderRow}>
              <Text>💳 Payment</Text>
              <Text>{order.paymentMethod}</Text>
            </View>
          </View>
        ) : (
          <Text>Order পাওয়া যায়নি</Text>
        )}

        <View style={styles.sellBtnRow}>
          <TouchableOpacity
            style={styles.sellCancelBtn}
            onPress={() => onOrderCancel(order)}
          >
            <Text style={styles.sellCancelText}>বাতিল</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sellConfirmBtn}
            onPress={() => onOrderConfirm(order)}
          >
            <Text style={styles.sellConfirmText}>বিক্রি নিশ্চিত করুন</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function FarmerHomeScreen() {
  const router = useRouter();
  const [myCows, setMyCows] = useState([]);
  const [user, setUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sellingCow, setSellingCow] = useState(null);
  const { selectedFarm } = useFarm(); // <-- ADJUST: use whatever FarmContext actually exposes
  const farmId = selectedFarm?.id;

  // ৪. ফায়ারস্টোর থেকে বর্তমান ইউজারের গরুর তালিকা নিয়ে আসার ফাংশন
  const fetchMyCows = useCallback(async () => {
    try {
      setError(null);
      const user = firebaseAuth.currentUser;
      if (!user) {
        setError("অনুগ্রহ করে আগে লগইন করুন।");
        return;
      }

      const usersSnap = await getDocs(
        query(collection(db, "users"), where("firebase_uid", "==", user.uid)),
      );

      const userDoc = usersSnap.docs[0];
      const userId = userDoc?.id || user.uid;

      const resolvedFarmId = Array.isArray(farmId) ? farmId[0] : farmId;
      const selectedFarmIds = resolvedFarmId ? [String(resolvedFarmId)] : [];

      if (selectedFarmIds.length === 0) {
        const farmsSnap = await getDocs(
          query(collection(db, "farms"), where("farmer_id", "==", userId)),
        );

        farmsSnap.docs.forEach((doc) => {
          selectedFarmIds.push(doc.id);
        });
      }

      if (selectedFarmIds.length === 0) {
        setError("আপনার জন্য কোনো খামার পাওয়া যায়নি।");
        setMyCows([]);
        return;
      }

      const cowSnapshots = await Promise.all(
        selectedFarmIds.map((selectedFarmId) =>
          getDocs(
            query(
              collection(db, "cows"),
              where("farm_id", "==", selectedFarmId),
            ),
          ),
        ),
      );

      const cowsList = cowSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => normalizeCow({ id: doc.id, ...doc.data() })),
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const cowsWithMilkStats = await Promise.all(
        cowsList.map(async (cow) => {
          const photosSnap = await getDocs(
            query(collection(db, "cow_photos"), where("cow_id", "==", cow.id)),
          );

          const photos = photosSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              if (!!a.is_primary !== !!b.is_primary) {
                return a.is_primary ? -1 : 1;
              }
              return (a.sort_order || 0) - (b.sort_order || 0);
            });

          const logsSnap = await getDocs(
            query(collection(db, "milk_logs"), where("cow_id", "==", cow.id)),
          );

          const logs = logsSnap.docs
            .map((doc) => normalizeMilkLog({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const aDate = toDate(a.log_date)?.getTime() || 0;
              const bDate = toDate(b.log_date)?.getTime() || 0;
              return bDate - aDate;
            });

          const totalMilk = logs.reduce(
            (sum, log) => sum + (log.total_liters || 0),
            0,
          );
          const latestLog = logs[0];
          const milkLast30Days = logs.reduce((sum, log) => {
            const logDate = toDate(log.log_date);
            if (logDate && logDate >= thirtyDaysAgo) {
              return sum + (log.total_liters || 0);
            }
            return sum;
          }, 0);

          return {
            ...cow,
            milkProduction: milkLast30Days || totalMilk,
            photos: photos.map((photo) => photo.url).filter(Boolean),
            latestMilkLiters: latestLog?.total_liters || 0,
          };
        }),
      );

      setMyCows(cowsWithMilkStats);
    } catch (e) {
      console.log(e);
      setError("আপনার গরুর তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchMyCows();
  }, [fetchMyCows]);

  const handleSellConfirm = async (order) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id);
        const cowRef = doc(db, "cows", order.cowId);

        transaction.update(orderRef, {
          status: "confirmed",
          confirmedAt: serverTimestamp(),
        });

        transaction.update(cowRef, {
          status: "sold",
          soldAt: serverTimestamp(),
        });
      });

      await createNotification({
        audience: "buyer",
        ownerId: order.buyerId,
        type: "booking",
        title: "আপনার বুকিং গ্রহণ করা হয়েছে",
        body: `${order.name} এর বুকিং গ্রহণ করা হয়েছে।`,
        data: {
          orderId: order.id,
          cowId: order.cowId,
        },
      });

      setSellingCow(null);

      Alert.alert("✅ সফল", "গরুটি সফলভাবে বিক্রি করা হয়েছে।");

      await fetchMyCows();
      setSellingCow(null);
    } catch (error) {
      console.error(error);

      Alert.alert("ত্রুটি", "গরু বিক্রি করা যায়নি।");
    }
  };

  const handleCancelConfirm = async (order) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id);
        const cowRef = doc(db, "cows", order.cowId);

        transaction.update(orderRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
        });

        transaction.update(cowRef, {
          status: "available",
          bookedBy: null,
          bookedAt: null,
          orderId: null,
          bookingCode: null,
        });
      });

      await createNotification({
        audience: "buyer",
        ownerId: order.buyerId,
        type: "booking",
        title: "আপনার বুকিং বাতিল করা হয়েছে",
        body: `${order.name} এর বুকিং বাতিল করা হয়েছে।`,
        data: {
          orderId: order.id,
          cowId: order.cowId,
        },
      });

      setSellingCow(null);

      Alert.alert("✅ বুকিং বাতিল", "বুকিং সফলভাবে বাতিল করা হয়েছে।");

      await fetchMyCows();
      setSellingCow(null);
    } catch (error) {
      console.error(error);

      Alert.alert("ত্রুটি", "বুকিং বাতিল করা যায়নি।");
    }
  };

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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()}, 👨‍🌾</Text>
            <Text style={styles.userName}>{user?.name || "কৃষক"}</Text>
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
            {myCows
              .reduce((sum, c) => sum + (c.milkProduction || 0), 0)
              .toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>মোট দুধ</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {Math.round(
              myCows.reduce((sum, c) => sum + (c.health_score || 0), 0) /
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
              onSell={setSellingCow}
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
                onPress={() => router.push(`./../cows/add?farmId=${farmId}`)}
              >
                <Text style={styles.addFirstText}>+ প্রথম গরু যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`./../cows/add?farmId=${farmId}`)}
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

      {sellingCow && (
        <SellConfirmAlert
          cow={sellingCow}
          orderId={sellingCow.orderId}
          onOrderConfirm={handleSellConfirm}
          onOrderCancel={handleCancelConfirm}
          onCancel={() => setSellingCow(null)}
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  titleRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  sellBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },

  sellBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
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
  // Sell overlay
  sellOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  sellModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: "100%",
  },
  sellModalTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sellModalCow: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  sellFieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  sellInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: 4,
  },
  sellInputText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  sellBtnRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  sellCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sellCancelText: { color: Colors.textSecondary, fontWeight: "600" },
  sellConfirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sellConfirmText: { color: Colors.white, fontWeight: "700" },
  orderCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
  },

  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    zIndex: 100,
  },
});
