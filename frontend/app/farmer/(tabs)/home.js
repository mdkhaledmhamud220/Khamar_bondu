import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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
import { auth, db } from "../../../firebaseConfig";

const toNumber = (value) => Number(value) || 0;

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeCost = (data) => ({
  id: data.id,
  cow_id: data.cow_id,
  type: data.type,
  amount: toNumber(data.amount),
  cost_date: toDate(data.cost_date),
  note: data.note || "",
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

function StatCard({ icon, label, value, color, onPress }) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: (color || Colors.primary) + "18" },
        ]}
      >
        <Ionicons name={icon} size={22} color={color || Colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FarmDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { selectedFarm } = useFarm();
  const farmId = selectedFarm?.id;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        // ১. সকল গরু
        const cowsSnap = await getDocs(
          query(collection(db, "cows"), where("farm_id", "==", farmId)),
        );

        const cowsList = cowsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // ২. একবারে সব costs
        const costsSnap = await getDocs(collection(db, "costs"));

        const allCosts = costsSnap.docs.map((doc) =>
          normalizeCost({
            id: doc.id,
            ...doc.data(),
          }),
        );

        // ৩. একবারে সব milk logs
        const milkSnap = await getDocs(collection(db, "milk_logs"));

        const allMilkLogs = milkSnap.docs.map((doc) =>
          normalizeMilkLog({
            id: doc.id,
            ...doc.data(),
          }),
        );

        //--------------------------------------------

        const totalCows = cowsList.length;

        const availableCows = cowsList.filter(
          (c) => c.status === "available" || c.status === "booked",
        ).length;

        const soldCows = cowsList.filter((c) => c.status === "sold").length;

        let totalInvestment = 0;
        let totalExpectedValue = 0;
        let milkIncomeLastMonth = 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        //--------------------------------------------

        for (const cow of cowsList) {
          // Purchase Price
          let totalCost = Number(cow.price || 0);

          // সব cost এর মধ্যে এই cow এর cost
          const cowCosts = allCosts.filter((cost) => cost.cow_id === cow.id);

          cowCosts.forEach((cost) => {
            totalCost += cost.amount;
          });

          totalInvestment += totalCost;

          // Expected Sale Price
          totalExpectedValue += Number(cow.sale_price || cow.price || 0);

          // Last 30 days milk income
          const cowLogs = allMilkLogs.filter((log) => log.cow_id === cow.id);

          cowLogs.forEach((log) => {
            const logDate = toDate(log.log_date);

            if (logDate && logDate >= thirtyDaysAgo) {
              milkIncomeLastMonth += Number(log.income || 0);
            }
          });
        }

        //--------------------------------------------

        const estimatedProfit = totalExpectedValue - totalInvestment;

        setData({
          totalCows,
          availableCows,
          soldCows,
          milkIncomeLastMonth,
          totalInvestment,
          totalExpectedValue,
          estimatedProfit,
        });
      } catch (error) {
        console.log("ড্যাশবোর্ড ডাটা লোড করতে সমস্যা হয়েছে:", error);
        Alert.alert("ত্রুটি", "সার্ভার থেকে খামারের ডাটা লোড করা যায়নি।");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const fmt = (n) => `৳ ${(n || 0).toLocaleString("bn-BD")}`;

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  const profit = data?.estimatedProfit || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('./notification')}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.white}
            />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>আমার খামার</Text>
        <Text style={styles.headerSub}>সার্বিক অবস্থা</Text>

        {/* Profit/loss hero */}
        <View style={styles.heroBox}>
          <Text style={styles.heroLabel}>আনুমানিক মুনাফা</Text>
          <Text
            style={[
              styles.heroValue,
              { color: profit >= 0 ? Colors.accentLight : "#FF8A80" },
            ]}
          >
            {profit >= 0 ? "+" : ""}
            {fmt(profit)}
          </Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroSub}>
              বিনিয়োগ: {fmt(data?.totalInvestment)}
            </Text>
            <Text style={styles.heroDot}>•</Text>
            <Text style={styles.heroSub}>
              আনুমানিক মূল্য: {fmt(data?.totalExpectedValue)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="paw-outline"
            label="মোট গরু"
            value={`${data?.totalCows || 0}টি`}
            color={Colors.primary}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="বিক্রির জন্য"
            value={`${data?.availableCows || 0}টি`}
            color={Colors.success}
          />
          <StatCard
            icon="cart-outline"
            label="বিক্রি হয়েছে"
            value={`${data?.soldCows || 0}টি`}
            color={Colors.info}
          />
          <StatCard
            icon="water-outline"
            label="দুধের আয় (৩০দিন)"
            value={fmt(data?.milkIncomeLastMonth)}
            color={Colors.warning}
          />
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>দ্রুত কাজ</Text>
          <View style={styles.actionGrid}>
            {[
              {
                icon: "add-circle-outline",
                label: "গরু যোগ করুন",
                route: `./../cows/add?farmId=${farmId}`,
                color: Colors.primary,
              },
              {
                icon: "list-outline",
                label: "আমার গরুগুলো",
                route: `./../farm/dashboard?farmId=${farmId}`,
                color: Colors.primaryMid,
              },
              {
                icon: "water-outline",
                label: "দুধের লগ",
                route: `./../farm/milk?farmId=${farmId}`,
                color: Colors.info,
              },
              {
                icon: "cash-outline",
                label: "খরচ যোগ করুন",
                route: `./../farm/costs?farmId=${farmId}`,
                color: Colors.warning,
              },
              {
                icon: "analytics-outline",
                label: "মুনাফা বিশ্লেষণ",
                route: `./../farm/profit?farmId=${farmId}`,
                color: Colors.success,
              },
              {
                icon: "medkit-outline",
                label: "স্বাস্থ্য ট্র্যাক",
                route: `./../farm/health?farmId=${farmId}`,
                color: Colors.error,
              },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.actionCard}
                onPress={() => router.push(a.route)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: a.color + "18" },
                  ]}
                >
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tip box */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
          <Text style={styles.tipText}>
            নিয়মিত ওজন আপডেট করলে Health Score সঠিক থাকে এবং ভালো দামে গরু
            বিক্রি হওয়ার সম্ভাবনা বাড়ে।
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: 54,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
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
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -50,
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
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.white,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.lg,
  },

  heroBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroLabel: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  heroValue: { fontSize: FontSize.xxxl, fontWeight: "800", marginBottom: 8 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroSub: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.65)" },
  heroDot: { color: "rgba(255,255,255,0.4)" },

  scroll: { flex: 1 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  actionCard: {
    width: "30%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    ...Shadow.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },

  tipBox: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.warning + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning + "40",
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
