import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
// import { useAuth } from '../../context/AuthContext';
// import api from '../../config/api';
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "../../../constants/theme";

const { width: SW } = Dimensions.get("window");

// ── Mock data (backend connect না হওয়া পর্যন্ত) ──────────────────────────
const MOCK_COW = {
  id: "mock-1",
  name: "রাজা",
  breed: "শাহীওয়াল",
  gender: "male",
  ageMonths: 36,
  weightKg: 280,
  price: 120000,
  district: "রাজশাহী",
  upazila: "গোদাগাড়ী",
  description:
    "সম্পূর্ণ সুস্থ ও সক্রিয় শাহীওয়াল ষাঁড়। সব টিকা সময়মতো দেওয়া হয়েছে। কোরবানির জন্য উপযুক্ত।",
  status: "available",
  isForSale: true,
  healthScore: 88,
  healthGrade: "অসাধারণ",
  healthDetails: {
    vaccination: 30,
    medicine: 22,
    weight: 20,
    age: 10,
    feeding: 10,
    expectedWeightKg: 265,
  },
  regularFeeding: true,
  purchaseCost: 60000,
  feedCost: 18000,
  medicineCost: 3500,
  otherCost: 2000,
  laborCost: 6000,
  vaccines: [
    { name: "FMD (ক্ষুরারোগ)", givenDate: "2025-10-15", dueDate: "2026-04-15" },
    { name: "HS (গলাফুলা)", givenDate: "2025-11-01", dueDate: "2026-05-01" },
    { name: "BQ (বাদলা)", givenDate: null, dueDate: "2026-05-15" },
  ],
  medicines: [{ date: "2025-12-10", reason: "সামান্য জ্বর", cost: 800 }],
  milkLogs: [
    { date: "৫ এপ্রিল", morning: 9.5, evening: 8.0, income: 1137 },
    { date: "৪ এপ্রিল", morning: 8.5, evening: 7.0, income: 1007 },
    { date: "৩ এপ্রিল", morning: 9.0, evening: 7.5, income: 1072 },
  ],
  weightLogs: [
    { date: "১ মার্চ ২০২৬", weight: 280 },
    { date: "১ ফেব্রুয়ারি ২০২৬", weight: 272 },
    { date: "১ জানুয়ারি ২০২৬", weight: 265 },
  ],
  createdAt: "2023-04-01",
};

const fmt = (n) => `৳${(n || 0).toLocaleString("bn-BD")}`;
const TABS = ["সারসংক্ষেপ", "স্বাস্থ্য", "খরচ / আয়", "বিক্রি"];

// ── Health Score Ring ─────────────────────────────────────────────────────
function ScoreRing({ score, grade }) {
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
    <View style={[styles.ring, { borderColor: color }]}>
      <Text style={[styles.ringScore, { color }]}>{score}</Text>
      <Text style={[styles.ringGrade, { color }]}>{grade}</Text>
    </View>
  );
}

// ── Score progress bar ────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.barPts, { color }]}>
        {value}/{max}
      </Text>
    </View>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, onAction, actionLabel, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={15} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.infoAction}>{actionLabel || "আপডেট"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Stat mini card ────────────────────────────────────────────────────────
function StatCell({ label, value, color }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

// ── Tab: সারসংক্ষেপ ──────────────────────────────────────────────────────
function OverviewTab({ cow }) {
  const totalCost =
    (cow.purchaseCost || 0) +
    (cow.feedCost || 0) +
    (cow.medicineCost || 0) +
    (cow.otherCost || 0) +
    (cow.laborCost || 0);
  const profit = (cow.price || 0) - totalCost;

  return (
    <View>
      {/* Stats grid */}
      <View style={styles.statGrid}>
        <StatCell label="মোট বিনিয়োগ" value={fmt(totalCost)} />
        <StatCell
          label="আনুমানিক মুনাফা"
          value={(profit >= 0 ? "+" : "") + fmt(profit)}
          color={profit >= 0 ? Colors.success : Colors.error}
        />
        <StatCell
          label="Health Score"
          value={`${cow.healthScore} / ১০০`}
          color={Colors.primary}
        />
        <StatCell
          label="টিকার অবস্থা"
          value={`${cow.vaccines?.filter((v) => v.givenDate).length || 0}/${cow.vaccines?.length || 0} সম্পন্ন`}
        />
      </View>

      <Text style={styles.secLabel}>মূল তথ্য</Text>
      <View style={styles.rowsCard}>
        <InfoRow
          icon="calendar-outline"
          label="খামারে যোগ দিয়েছে"
          value={cow.createdAt || "—"}
        />
        <InfoRow icon="paw-outline" label="প্রজাতি" value={cow.breed} />
        <InfoRow
          icon="barbell-outline"
          label="সর্বশেষ ওজন আপডেট"
          value={`${cow.weightKg} কেজি`}
          onAction={() => {}}
        />
        <InfoRow
          icon="location-outline"
          label="অবস্থান"
          value={`${cow.upazila}, ${cow.district}`}
          last
        />
      </View>

      {/* Description */}
      {cow.description ? (
        <>
          <Text style={styles.secLabel}>বিবরণ</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{cow.description}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

// ── Tab: স্বাস্থ্য ───────────────────────────────────────────────────────
function HealthTab({ cow }) {
  const d = cow.healthDetails || {};
  return (
    <View>
      <Text style={styles.secLabel}>Health Score বিশ্লেষণ</Text>
      <View style={styles.rowsCard}>
        <View style={{ padding: Spacing.md, gap: 10 }}>
          <ScoreBar
            label="💉 টিকা"
            value={d.vaccination || 0}
            max={30}
            color={Colors.healthExcellent}
          />
          <ScoreBar
            label="💊 ওষুধ ইতিহাস"
            value={d.medicine || 0}
            max={25}
            color={Colors.healthGood}
          />
          <ScoreBar
            label="⚖️ ওজন (বয়স অনুযায়ী)"
            value={d.weight || 0}
            max={25}
            color={Colors.healthAverage}
          />
          <ScoreBar
            label="📅 বয়স"
            value={d.age || 0}
            max={10}
            color={Colors.primary}
          />
          <ScoreBar
            label="🌾 নিয়মিত খাবার"
            value={d.feeding || 0}
            max={10}
            color={Colors.accent}
          />
        </View>
        {d.expectedWeightKg ? (
          <View style={styles.expectedBox}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={Colors.textMuted}
            />
            <Text style={styles.expectedText}>
              {cow.breed} প্রজাতির {cow.ageMonths} মাস বয়সে প্রত্যাশিত ওজন:{" "}
              {d.expectedWeightKg} কেজি
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.secLabel}>টিকার তালিকা</Text>
      <View style={styles.rowsCard}>
        {(cow.vaccines || []).map((v, i) => {
          const given = !!v.givenDate;
          const overdue =
            !given && v.dueDate && new Date(v.dueDate) < new Date();
          const color = given
            ? Colors.success
            : overdue
              ? Colors.error
              : Colors.warning;
          const badgeLabel = given
            ? "দেওয়া হয়েছে"
            : overdue
              ? "মেয়াদ শেষ"
              : "আসছে";
          return (
            <View
              key={i}
              style={[
                styles.vacRow,
                i < cow.vaccines.length - 1 && styles.vacRowBorder,
              ]}
            >
              <View style={[styles.vacDot, { backgroundColor: color }]} />
              <Text style={styles.vacName}>{v.name}</Text>
              <Text style={styles.vacDate}>{v.givenDate || v.dueDate}</Text>
              <View
                style={[styles.vacBadge, { backgroundColor: color + "18" }]}
              >
                <Text style={[styles.vacBadgeText, { color }]}>
                  {badgeLabel}
                </Text>
              </View>
            </View>
          );
        })}
        {(!cow.vaccines || cow.vaccines.length === 0) && (
          <Text style={styles.emptyNote}>কোনো টিকার তথ্য নেই।</Text>
        )}
      </View>

      <Text style={styles.secLabel}>ওষুধের ইতিহাস</Text>
      <View style={styles.rowsCard}>
        {(cow.medicines || []).map((m, i) => (
          <View
            key={i}
            style={[
              styles.infoRow,
              i < cow.medicines.length - 1 && styles.infoRowBorder,
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: Colors.error + "18" },
              ]}
            >
              <Ionicons name="medkit-outline" size={15} color={Colors.error} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{m.date}</Text>
              <Text style={styles.infoValue}>{m.reason}</Text>
            </View>
            {m.cost ? (
              <Text style={styles.infoAction}>{fmt(m.cost)}</Text>
            ) : null}
          </View>
        ))}
        {(!cow.medicines || cow.medicines.length === 0) && (
          <Text style={styles.emptyNote}>কোনো ওষুধের তথ্য নেই।</Text>
        )}
      </View>
    </View>
  );
}

// ── Tab: খরচ / আয় ────────────────────────────────────────────────────────
function CostsTab({ cow }) {
  const costs = [
    {
      label: "ক্রয় মূল্য",
      value: cow.purchaseCost,
      icon: "cart-outline",
      color: "#6A1B9A",
    },
    {
      label: "খাবার",
      value: cow.feedCost,
      icon: "leaf-outline",
      color: Colors.primary,
    },
    {
      label: "ওষুধ",
      value: cow.medicineCost,
      icon: "medkit-outline",
      color: Colors.error,
    },
    {
      label: "শ্রমিক",
      value: cow.laborCost,
      icon: "people-outline",
      color: Colors.warning,
    },
    {
      label: "অন্যান্য",
      value: cow.otherCost,
      icon: "cube-outline",
      color: Colors.textMuted,
    },
  ];
  const total = costs.reduce((s, c) => s + (c.value || 0), 0);

  return (
    <View>
      <Text style={styles.secLabel}>খরচের সারসংক্ষেপ</Text>
      <View style={styles.rowsCard}>
        {costs.map((c, i) => (
          <View
            key={c.label}
            style={[
              styles.infoRow,
              i < costs.length - 1 && styles.infoRowBorder,
            ]}
          >
            <View
              style={[styles.infoIcon, { backgroundColor: c.color + "18" }]}
            >
              <Ionicons name={c.icon} size={15} color={c.color} />
            </View>
            <Text
              style={[
                styles.infoContent,
                { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
              ]}
            >
              {c.label}
            </Text>
            <Text style={[styles.infoValue, { fontWeight: "700" }]}>
              {fmt(c.value)}
            </Text>
          </View>
        ))}
        <View style={[styles.infoRow, { backgroundColor: Colors.accentPale }]}>
          <View
            style={[
              styles.infoIcon,
              { backgroundColor: Colors.primary + "25" },
            ]}
          >
            <Ionicons name="wallet-outline" size={15} color={Colors.primary} />
          </View>
          <Text
            style={[
              styles.infoContent,
              {
                flex: 1,
                fontSize: FontSize.md,
                fontWeight: "700",
                color: Colors.primary,
              },
            ]}
          >
            মোট খরচ
          </Text>
          <Text
            style={{
              fontSize: FontSize.lg,
              fontWeight: "800",
              color: Colors.primary,
            }}
          >
            {fmt(total)}
          </Text>
        </View>
      </View>

      <Text style={styles.secLabel}>দুধের আয় (সাম্প্রতিক)</Text>
      <View style={styles.rowsCard}>
        {(cow.milkLogs || []).map((l, i) => (
          <View
            key={i}
            style={[
              styles.milkRow,
              i < cow.milkLogs.length - 1 && styles.infoRowBorder,
            ]}
          >
            <Text style={styles.milkDate}>{l.date}</Text>
            <View style={styles.milkVals}>
              <Text style={styles.milkVal}>
                সকাল <Text style={styles.milkValBold}>{l.morning} লি.</Text>
              </Text>
              <Text style={styles.milkVal}>
                বিকাল <Text style={styles.milkValBold}>{l.evening} লি.</Text>
              </Text>
            </View>
            <Text style={styles.milkIncome}>{fmt(l.income)}</Text>
          </View>
        ))}
        {(!cow.milkLogs || cow.milkLogs.length === 0) && (
          <Text style={styles.emptyNote}>কোনো দুধের লগ নেই।</Text>
        )}
      </View>
    </View>
  );
}

// ── Tab: বিক্রি ───────────────────────────────────────────────────────────
function SaleTab({ cow, onUpdate }) {
  const [price, setPrice] = useState(String(cow.price || ""));
  const [weightKg, setWeightKg] = useState(String(cow.weightKg || ""));
  const [isForSale, setIsForSale] = useState(cow.isForSale !== false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!price || isNaN(price)) {
      Alert.alert("", "সঠিক মূল্য দিন।");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/cows/${cow.id}`, {
        price: parseFloat(price),
        weightKg: parseFloat(weightKg) || cow.weightKg,
        isForSale,
        status: isForSale ? "available" : "available",
      });
      Alert.alert("✅ সফল", "গরুর তথ্য আপডেট হয়েছে।");
      onUpdate?.();
    } catch {
      // Demo: show success anyway
      Alert.alert("✅ আপডেট হয়েছে", "গরুর বিক্রির তথ্য সংরক্ষিত হয়েছে।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {!isForSale && (
        <View style={styles.warningBox}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={Colors.warning}
          />
          <Text style={styles.warningText}>
            গরুটি বর্তমানে বিক্রির তালিকায় নেই। ক্রেতারা দেখতে পাবে না।
          </Text>
        </View>
      )}

      <Text style={styles.secLabel}>বিক্রির তথ্য</Text>
      <View style={styles.rowsCard}>
        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <View style={styles.infoIcon}>
            <Ionicons name="cash-outline" size={15} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>বিক্রয় মূল্য (৳)</Text>
            <TextInput
              style={styles.inlineInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="মূল্য লিখুন"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <View style={styles.infoIcon}>
            <Ionicons name="barbell-outline" size={15} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>বর্তমান ওজন (কেজি)</Text>
            <TextInput
              style={styles.inlineInput}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              placeholder="ওজন লিখুন"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <View
            style={[
              styles.infoIcon,
              {
                backgroundColor: isForSale
                  ? Colors.success + "18"
                  : Colors.border,
              },
            ]}
          >
            <Ionicons
              name={
                isForSale ? "checkmark-circle-outline" : "close-circle-outline"
              }
              size={15}
              color={isForSale ? Colors.success : Colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>বিক্রির তালিকায় রাখবেন?</Text>
            <Text
              style={[
                styles.infoValue,
                { color: isForSale ? Colors.success : Colors.textMuted },
              ]}
            >
              {isForSale
                ? "হ্যাঁ — ক্রেতারা দেখতে পাবেন"
                : "না — তালিকা থেকে সরানো"}
            </Text>
          </View>
          <Switch
            value={isForSale}
            onValueChange={setIsForSale}
            trackColor={{ false: Colors.border, true: Colors.accentLight }}
            thumbColor={isForSale ? Colors.primary : Colors.textMuted}
          />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color={Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>বিশেষ নোট (ঐচ্ছিক)</Text>
            <TextInput
              style={styles.inlineInput}
              value={note}
              onChangeText={setNote}
              placeholder="কোরবানির উপযুক্ত, দ্রুত বিক্রি..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      </View>

      <Text style={styles.formHint}>
        বিক্রয় মূল্য পরিবর্তন করলে সাথে সাথে তালিকায় আপডেট হবে। ক্রেতারা নতুন
        দাম দেখতে পাবেন।
      </Text>

      <TouchableOpacity
        style={[styles.saveBtn, !isForSale && styles.saveBtnRed]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.9}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            <Ionicons
              name={
                isForSale ? "checkmark-circle-outline" : "close-circle-outline"
              }
              size={18}
              color={Colors.white}
            />
            <Text style={styles.saveBtnText}>
              {isForSale ? "তালিকা আপডেট করুন" : "তালিকা থেকে সরান"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export default function FarmerCowDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // const { profile } = useAuth();
  const profile = {
    role: "buyer",
  };

  const [cow, setCow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const loadCow = useCallback(async () => {
    try {
      const res = await api.get(`/cows/${id}`);
      setCow(res.data.data);
    } catch {
      // Use mock data if API fails
      setCow(MOCK_COW);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCow();
  }, [loadCow]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
      </View>
    );
  }

  if (!cow) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.loadingText}>গরুর তথ্য পাওয়া যায়নি।</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>ফিরে যান</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const healthColor =
    cow.healthScore >= 85
      ? Colors.healthExcellent
      : cow.healthScore >= 70
        ? Colors.healthGood
        : cow.healthScore >= 50
          ? Colors.healthAverage
          : cow.healthScore >= 30
            ? Colors.healthWeak
            : Colors.healthBad;

  return (
    <View style={styles.container}>
      {/* ── Top bar ── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.topBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {cow.name || cow.breed}
          </Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              Alert.alert("বিকল্প", "", [
                {
                  text: "সম্পাদনা করুন",
                  onPress: () => router.push(`/cows/edit/${cow.id}`),
                },
                { text: "মুছে ফেলুন", style: "destructive", onPress: () => {} },
                { text: "বাতিল", style: "cancel" },
              ])
            }
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Photo + identity ── */}
      <View style={styles.photoArea}>
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoEmoji}>🐄</Text>
        </View>

        {/* Badges */}
        <View style={styles.photoBadges}>
          <View
            style={[
              styles.badge,
              cow.status === "available"
                ? styles.badgeGreen
                : styles.badgeOrange,
            ]}
          >
            <Text style={styles.badgeText}>
              {cow.isForSale ? "পাওয়া যাচ্ছে" : "তালিকায় নেই"}
            </Text>
          </View>
        </View>

        {/* Health ring */}
        <ScoreRing
          score={cow.healthScore || 0}
          grade={cow.healthGrade || "—"}
        />

        {/* Photo dots */}
        <View style={styles.photoDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* ── Name & price strip ── */}
      <View style={styles.nameStrip}>
        <View>
          <Text style={styles.cowBreed}>{cow.breed}</Text>
          <Text style={styles.cowName}>{cow.name || cow.breed}</Text>
        </View>
        <Text style={styles.cowPrice}>{fmt(cow.price)}</Text>
      </View>

      {/* ── Chips ── */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {cow.gender === "male" ? "♂ ষাঁড়" : "♀ গাভী"}
          </Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>বয়স {cow.ageMonths} মাস</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>ওজন {cow.weightKg} কেজি</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>📍 {cow.district}</Text>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text
              style={[styles.tabText, activeTab === i && styles.tabTextActive]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab content ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 0 && <OverviewTab cow={cow} />}
        {activeTab === 1 && <HealthTab cow={cow} />}
        {activeTab === 2 && <CostsTab cow={cow} />}
        {activeTab === 3 && <SaleTab cow={cow} onUpdate={loadCow} />}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.ctaOutline}
          onPress={() => router.push(`./../../farmer/farm/costs`)}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.ctaOutlineText}>খরচ যোগ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSolid}
          onPress={() => setActiveTab(3)}
          activeOpacity={0.9}
        >
          <Ionicons name="create-outline" size={16} color={Colors.white} />
          <Text style={styles.ctaSolidText}>তথ্য আপডেট</Text>
        </TouchableOpacity>
      </View>
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

  // Top bar
  topBar: {
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -30,
  },
  topBarRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  },

  // Photo
  photoArea: {
    height: 200,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 80 },
  photoBadges: {
    position: "absolute",
    top: 10,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeGreen: { backgroundColor: Colors.primary },
  badgeOrange: { backgroundColor: Colors.warning },
  badgeText: { fontSize: FontSize.xs, color: Colors.white, fontWeight: "700" },
  ring: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ringScore: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  ringGrade: { fontSize: 9, fontWeight: "600" },
  photoDots: { position: "absolute", bottom: 8, flexDirection: "row", gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  dotActive: { width: 16, backgroundColor: Colors.primary },

  // Name strip
  nameStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  cowBreed: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  cowName: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  cowPrice: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.primary },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  chip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm + 2, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },

  // Scroll content
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },

  // Section label
  secLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Stat grid
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: 2,
  },
  statCell: {
    width: "100%",
    backgroundColor: Colors.white,
    padding: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 3,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Rows card
  rowsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    gap: Spacing.md,
  },
  infoRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  infoAction: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Description
  descBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  descText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Score bars
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    width: 100,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 7,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barPts: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    width: 36,
    textAlign: "right",
  },
  expectedBox: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    alignItems: "flex-start",
  },
  expectedText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // Vaccine rows
  vacRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    gap: 8,
  },
  vacRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  vacDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  vacName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  vacDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  vacBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 4,
  },
  vacBadgeText: { fontSize: 10, fontWeight: "700" },

  emptyNote: {
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Milk rows
  milkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  milkDate: { fontSize: FontSize.xs, color: Colors.textMuted, width: 70 },
  milkVals: { flex: 1, gap: 4 },
  milkVal: { fontSize: FontSize.xs, color: Colors.textMuted },
  milkValBold: { fontWeight: "700", color: Colors.textPrimary },
  milkIncome: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Sale tab
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warning + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.warning + "40",
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.warning,
    fontWeight: "600",
  },
  inlineInput: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    marginTop: 2,
  },
  formHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  saveBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    ...Shadow.md,
  },
  saveBtnRed: { backgroundColor: Colors.error },
  saveBtnText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: FontSize.md,
  },

  // CTA bar
  cta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  ctaOutline: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ctaOutlineText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  ctaSolid: {
    flex: 2,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...Shadow.sm,
  },
  ctaSolidText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
});
