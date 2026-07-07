import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
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

const fmt = (n) => `৳${Math.abs(n || 0).toLocaleString("bn-BD")}`;
const fmtS = (n) =>
  `${n >= 0 ? "+" : "-"}৳${Math.abs(n || 0).toLocaleString("bn-BD")}`;

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  return (
    <View
      style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ── Cow Profit Row ─────────────────────────────────────────────────────────
function CowProfitRow({ cow, onSell }) {
  const totalCost =
    (cow.purchaseCost || 0) +
    (cow.feedCost || 0) +
    (cow.medicineCost || 0) +
    (cow.otherCost || 0);
  const isSold = cow.status === "sold";
  const profit = isSold ? cow.profit || 0 : (cow.sale_price || 0) - totalCost;
  const profitColor = profit >= 0 ? Colors.success : Colors.error;

  return (
    <View style={styles.cowRow}>
      <View style={styles.cowRowLeft}>
        <View style={styles.cowEmoji}>
          <Text style={{ fontSize: 20 }}>🐄</Text>
        </View>
        <View style={styles.cowRowInfo}>
          <Text style={styles.cowRowName}>{cow.name || cow.breed}</Text>
          <Text style={styles.cowRowStatus}>
            {isSold ? "✅ বিক্রি হয়েছে" : "🟢 বিক্রির জন্য আছে"}
          </Text>
          <View style={styles.cowRowMeta}>
            <Text style={styles.metaText}>খরচ: {fmt(totalCost)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {isSold
                ? `বিক্রি: ${fmt(cow.sale_price)}`
                : `মূল্য: ${fmt(cow.sale_price)}`}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.cowRowRight}>
        <Text style={[styles.cowProfit, { color: profitColor }]}>
          {fmtS(profit)}
        </Text>
        {!isSold && (
          <TouchableOpacity style={styles.sellBtn} onPress={() => onSell(cow)}>
            <Text style={styles.sellBtnText}>বিক্রি</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Sell Modal (inline) ────────────────────────────────────────────────────
function SellConfirmAlert({ cow, onConfirm, onCancel }) {
  const [salePrice, setSalePrice] = useState(String(cow?.price || ""));
  const [buyerName, setBuyerName] = useState("");

  if (!cow) return null;
  return (
    <View style={styles.sellOverlay}>
      <View style={styles.sellModal}>
        <Text style={styles.sellModalTitle}>🐄 গরু বিক্রি করুন</Text>
        <Text style={styles.sellModalCow}>{cow.name || cow.breed}</Text>

        <Text style={styles.sellFieldLabel}>বিক্রয় মূল্য (৳) *</Text>
        <View style={styles.sellInput}>
          <Text style={{ fontSize: 16 }}>৳</Text>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.sellInputText} onPress={() => {}}>
              {salePrice || "মূল্য লিখুন"}
            </Text>
          </View>
        </View>

        <Text style={styles.sellFieldLabel}>ক্রেতার নাম (ঐচ্ছিক)</Text>
        <View style={styles.sellInput}>
          <Text style={styles.sellInputText}>{buyerName || "ক্রেতার নাম"}</Text>
        </View>

        <View style={styles.sellBtnRow}>
          <TouchableOpacity style={styles.sellCancelBtn} onPress={onCancel}>
            <Text style={styles.sellCancelText}>বাতিল</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sellConfirmBtn}
            onPress={() => onConfirm(cow.id, parseFloat(salePrice), buyerName)}
          >
            <Text style={styles.sellConfirmText}>বিক্রি নিশ্চিত করুন</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ProfitScreen() {
  const router = useRouter();
  const [cows, setCows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sellingCow, setSellingCow] = useState(null);
  const { selectedFarm } = useFarm();
  const farmId = selectedFarm?.id;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) return;

      // সকল গরু
      const cowsSnap = await getDocs(
        query(collection(db, "cows"), where("farm_id", "==", farmId)),
      );

      let cowsData = [];

      let totalInvestment = 0;
      let totalExpectedValue = 0;
      let milkIncomeLastMonth = 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const docSnap of cowsSnap.docs) {
        const cow = {
          id: docSnap.id,
          ...docSnap.data(),
        };

        //----------------------------------
        // Milk Logs
        //----------------------------------

        const logsSnap = await getDocs(
          query(collection(db, "milk_logs"), where("cow_id", "==", cow.id)),
        );

        logsSnap.forEach((doc) => {
          const log = normalizeMilkLog({
            id: doc.id,
            ...doc.data(),
          });

          const date = toDate(log.log_date);

          if (date && date >= thirtyDaysAgo) {
            milkIncomeLastMonth += log.income || 0;
          }
        });

        //----------------------------------
        // Costs
        //----------------------------------

        const costsSnap = await getDocs(
          query(collection(db, "costs"), where("cow_id", "==", cow.id)),
        );

        const purchaseCost = Number(cow.price || 0);

        let feedCost = 0;
        let medicineCost = 0;
        let laborCost = 0;
        let otherCost = 0;

        costsSnap.forEach((doc) => {
          const cost = doc.data();
          const amount = Number(cost.amount || 0);

          switch (cost.type) {
            case "feed":
              feedCost += amount;
              break;

            case "medicine":
              medicineCost += amount;
              break;

            case "labor":
              laborCost += amount;
              break;

            case "other":
              otherCost += amount;
              break;
          }
        });

        const totalCost =
          purchaseCost + feedCost + medicineCost + laborCost + otherCost;

        totalInvestment += totalCost;

        //----------------------------------
        // Expected Value
        //----------------------------------

        totalExpectedValue += Number(cow.sale_price || cow.price || 0);

        //----------------------------------
        // Profit
        //----------------------------------

        const expectedPrice = Number(cow.sale_price || 0);

        let profit = 0;

        if (cow.status === "sold") {
          // যদি বিক্রি হয়ে থাকে, sale_price হবে আসল বিক্রয় মূল্য
          profit = expectedPrice - totalCost;
        } else {
          // না বিক্রি হলে sale_price হবে আনুমানিক বিক্রয় মূল্য
          profit = expectedPrice - totalCost;
        }

        cowsData.push({
          ...cow,
          purchaseCost,
          feedCost,
          medicineCost,
          otherCost,
          profit,
        });
      }

      const estimatedProfit = totalExpectedValue - totalInvestment;

      setDashboard({
        totalInvestment,
        totalExpectedValue,
        estimatedProfit,
        milkIncomeLastMonth,
      });

      setCows(cowsData);
    } catch (e) {
      console.log(e);

      Alert.alert("ত্রুটি", "ডাটা লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmId) {
      loadData();
    }
  }, [farmId]);

  const handleSellConfirm = (cowId, salePrice, buyerName) => {
    const updated = cows.map((c) => {
      if (c.id === cowId) {
        const totalCost =
          c.purchaseCost + c.feedCost + c.medicineCost + c.otherCost;
        return {
          ...c,
          status: "sold",
          salePrice,
          profit: salePrice - totalCost,
        };
      }
      return c;
    });

    setCows(updated);
    setSellingCow(null);

    Alert.alert("✅ বিক্রি সম্পন্ন", "Mock data আপডেট হয়েছে");
  };

  const d = dashboard || {};
  const totalProfit = d.estimatedProfit || 0;
  const milkIncome = d.milkIncomeLastMonth || 0;
  const investment = d.totalInvestment || 0;
  const expectedValue = d.totalExpectedValue || 0;

  const soldCows = cows.filter((c) => c.status === "sold");
  const soldProfit = soldCows.reduce((s, c) => s + (c.profit || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#1A237E", "#283593"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>মুনাফা বিশ্লেষণ</Text>
        <Text style={styles.headerSub}>বিনিয়োগ ও আয়ের সম্পূর্ণ চিত্র</Text>

        {/* Hero profit */}
        <View style={styles.heroBox}>
          <Text style={styles.heroLabel}>আনুমানিক মোট মুনাফা</Text>
          <Text
            style={[
              styles.heroValue,
              { color: totalProfit >= 0 ? "#A5D6A7" : "#EF9A9A" },
            ]}
          >
            {fmtS(totalProfit)}
          </Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroSub}>বিনিয়োগ: {fmt(investment)}</Text>
            <Text style={styles.heroDot}>•</Text>
            <Text style={styles.heroSub}>
              আনুমানিক মূল্য: {fmt(expectedValue)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#283593" />
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>আয়ের সারসংক্ষেপ</Text>
              <View style={styles.statsCol}>
                <StatCard
                  icon="cash-outline"
                  label="বিক্রি থেকে আয়"
                  value={fmtS(soldProfit)}
                  color={soldProfit >= 0 ? Colors.success : Colors.error}
                  sub={`${soldCows.length}টি গরু বিক্রি`}
                />
                <StatCard
                  icon="water-outline"
                  label="দুধ থেকে আয় (৩০দিন)"
                  value={fmt(milkIncome)}
                  color="#1565C0"
                />
                <StatCard
                  icon="trending-up-outline"
                  label="আনুমানিক মুনাফা"
                  value={fmtS(totalProfit)}
                  color={totalProfit >= 0 ? Colors.success : Colors.error}
                  sub="অবিক্রীত গরু থেকে"
                />
                <StatCard
                  icon="wallet-outline"
                  label="মোট বিনিয়োগ"
                  value={fmt(investment)}
                  color="#6A1B9A"
                />
              </View>
            </View>

            {/* Per-cow breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>গরু প্রতি মুনাফা</Text>
              <View style={styles.cowList}>
                {cows.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>🐄</Text>
                    <Text style={styles.emptyText}>কোনো গরু নেই</Text>
                  </View>
                ) : (
                  cows.map((cow) => (
                    <CowProfitRow
                      key={cow.id}
                      cow={cow}
                      onSell={setSellingCow}
                    />
                  ))
                )}
              </View>
            </View>

            {/* Tip */}
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
              <Text style={styles.tipText}>
                মুনাফা সঠিক দেখাতে গরু যোগ করার সময় ক্রয় মূল্য এবং নিয়মিত খরচ
                (খাবার, ওষুধ) আপডেট রাখুন।
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sell overlay */}
      {sellingCow && (
        <SellConfirmAlert
          cow={sellingCow}
          onConfirm={handleSellConfirm}
          onCancel={() => setSellingCow(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { paddingTop: 60, alignItems: "center" },
  scroll: { flex: 1 },

  header: {
    paddingTop: 54,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
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
    color: "rgba(255,255,255,0.75)",
    marginBottom: Spacing.lg,
  },

  heroBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroLabel: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.75)" },
  heroValue: { fontSize: 34, fontWeight: "800", marginBottom: 8 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroSub: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.65)" },
  heroDot: { color: "rgba(255,255,255,0.4)" },

  section: { padding: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  statsCol: { gap: Spacing.sm },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    ...Shadow.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: { flex: 1 },
  statLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  statValue: { fontSize: FontSize.xl, fontWeight: "800", marginTop: 2 },
  statSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  cowList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  cowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cowRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  cowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  cowRowInfo: { flex: 1 },
  cowRowName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cowRowStatus: { fontSize: FontSize.xs, color: Colors.textMuted },
  cowRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  metaDot: { color: Colors.textMuted },
  cowRowRight: { alignItems: "flex-end", gap: 6 },
  cowProfit: { fontSize: FontSize.lg, fontWeight: "800" },
  sellBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  sellBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: "700",
  },

  empty: { alignItems: "center", padding: Spacing.xl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },

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
});
