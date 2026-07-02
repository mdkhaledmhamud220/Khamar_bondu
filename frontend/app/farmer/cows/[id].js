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
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebaseConfig";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "../../../constants/theme";

const { width: SW } = Dimensions.get("window");

// ── Normalization helpers ─────────────────────────────────────────────────
const toNumber = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

const toDate = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toISOString().split('T')[0];
  return null;
};

const normalizeCow = (data) => ({
  id: data.id,
  name: data.name || data.breed,
  breed: data.breed,
  gender: data.gender,
  age_months: toNumber(data.age_months || data.ageMonths),
  weight_kg: toNumber(data.weight_kg || data.weightKg),
  health_score: toNumber(data.health_score || data.healthScore || 0),
  status: data.status,
  is_for_sale: data.is_for_sale !== false,
  price: toNumber(data.price || 0),
  sale_price: toNumber(data.sale_price || 0),
  district: data.district,
  upazila: data.upazila,
  description: data.description || '',
  created_at: toDate(data.created_at || data.createdAt) || new Date().toISOString(),
});

const normalizeVaccine = (data) => ({
  id: data.id,
  cow_id: data.cow_id,
  vaccine_name: data.vaccine_name,
  given_date: toDate(data.given_date),
  due_date: toDate(data.due_date),
  status: data.status || 'pending',
  vet_name: data.vet_name || '',
});

const normalizeMedicine = (data) => ({
  id: data.id,
  cow_id: data.cow_id,
  medicine_name: data.medicine_name,
  reason: data.reason || '',
  treatment_date: toDate(data.treatment_date),
  cost: toNumber(data.cost || 0),
});

const normalizeCost = (data) => ({
  id: data.id,
  cow_id: data.cow_id,
  type: data.type,
  amount: toNumber(data.amount),
  cost_date: toDate(data.cost_date),
  note: data.note || '',
});

const normalizeMilkLog = (data) => ({
  id: data.id,
  cow_id: data.cow_id,
  log_date: toDate(data.log_date),
  morning_liters: toNumber(data.morning_liters),
  evening_liters: toNumber(data.evening_liters),
  total_liters: toNumber(data.total_liters),
  sold_liters: toNumber(data.sold_liters),
  price_per_liter: toNumber(data.price_per_liter),
  income: toNumber(data.income),
});

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
  // Calculate total cost from all costs
  const costsByType = {
    feed: 0,
    medicine: 0,
    labor: 0,
    other: 0,
  };

  (cow.costs || []).forEach((cost) => {
    if (costsByType.hasOwnProperty(cost.type)) {
      costsByType[cost.type] += cost.amount || 0;
    }
  });

  const purchaseCost = toNumber(cow.price || 0);
  const totalCostFromDb = Object.values(costsByType).reduce((a, b) => a + b, 0);
  const totalCost = purchaseCost + totalCostFromDb;
  
  const sellingPrice = toNumber(cow.sale_price || 0);
  const profit = sellingPrice - totalCost;

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
          value={`${toNumber(cow.health_score)} / ১০০`}
          color={Colors.primary}
        />
        <StatCell
          label="টিকার অবস্থা"
          value={`${(cow.vaccines || []).filter((v) => v.given_date).length || 0}/${(cow.vaccines || []).length || 0} সম্পন্ন`}
        />
      </View>

      <Text style={styles.secLabel}>মূল তথ্য</Text>
      <View style={styles.rowsCard}>
        <InfoRow
          icon="calendar-outline"
          label="খামারে যোগ দিয়েছে"
          value={cow.created_at?.split('T')[0] || "—"}
        />
        <InfoRow icon="paw-outline" label="প্রজাতি" value={cow.breed} />
        <InfoRow
          icon="barbell-outline"
          label="সর্বশেষ ওজন"
          value={`${cow.weight_kg} কেজি`}
        />
        <InfoRow
          icon="location-outline"
          label="অবস্থান"
          value={`${cow.upazila || '—'}, ${cow.district || '—'}`}
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
  return (
    <View>
      <Text style={styles.secLabel}>স্বাস্থ্য অবস্থা</Text>
      <View style={styles.rowsCard}>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: Colors.primary + "18" }]}>
            <Ionicons name="heart-outline" size={15} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>স্বাস্থ্য স্কোর</Text>
            <Text style={[styles.infoValue, { fontWeight: '800', fontSize: FontSize.xl, color: Colors.primary }]}>
              {toNumber(cow.health_score)} / ১০০
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.secLabel}>টিকার তালিকা</Text>
      <View style={styles.rowsCard}>
        {(cow.vaccines || []).map((v, i) => {
          const given = !!v.given_date;
          const overdue =
            !given && v.due_date && new Date(v.due_date) < new Date();
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
              <Text style={styles.vacName}>{v.vaccine_name}</Text>
              <Text style={styles.vacDate}>{v.given_date || v.due_date}</Text>
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
              <Text style={styles.infoLabel}>{m.treatment_date}</Text>
              <Text style={styles.infoValue}>{m.medicine_name}</Text>
              <Text style={styles.infoLabel}>{m.reason}</Text>
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
  // Group costs by type
  const costsByType = {
    feed: 0,
    medicine: 0,
    labor: 0,
    other: 0,
  };
  
  const milkIncomeTotal = (cow.milkLogs || []).reduce((sum, log) => sum + (log.income || 0), 0);
  
  (cow.costs || []).forEach((cost) => {
    if (costsByType.hasOwnProperty(cost.type)) {
      costsByType[cost.type] += cost.amount || 0;
    }
  });

  // Calculate total investment
  const purchaseCost = toNumber(cow.price || 0);
  const totalCostFromDb = Object.values(costsByType).reduce((a, b) => a + b, 0);
  const totalInvestment = purchaseCost + totalCostFromDb;
  
  // Calculate profit
  const sellingPrice = toNumber(cow.sale_price || 0);
  const profit = sellingPrice - totalInvestment;

  const costs = [
    {
      label: "ক্রয় মূল্য",
      value: purchaseCost,
      icon: "cart-outline",
      color: "#6A1B9A",
    },
    {
      label: "খাবার",
      value: costsByType.feed,
      icon: "leaf-outline",
      color: Colors.primary,
    },
    {
      label: "ওষুধ",
      value: costsByType.medicine,
      icon: "medkit-outline",
      color: Colors.error,
    },
    {
      label: "শ্রমিক",
      value: costsByType.labor,
      icon: "people-outline",
      color: Colors.warning,
    },
    {
      label: "অন্যান্য",
      value: costsByType.other,
      icon: "cube-outline",
      color: Colors.textMuted,
    },
  ];

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
            মোট বিনিয়োগ
          </Text>
          <Text
            style={{
              fontSize: FontSize.lg,
              fontWeight: "800",
              color: Colors.primary,
            }}
          >
            {fmt(totalInvestment)}
          </Text>
        </View>
      </View>

      {/* Profit summary */}
      <Text style={styles.secLabel}>আনুমানিক মুনাফা</Text>
      <View style={[styles.rowsCard, { backgroundColor: profit >= 0 ? Colors.success + "08" : Colors.error + "08" }]}>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: (profit >= 0 ? Colors.success : Colors.error) + "25" }]}>
            <Ionicons 
              name={profit >= 0 ? "trending-up-outline" : "trending-down-outline"} 
              size={15} 
              color={profit >= 0 ? Colors.success : Colors.error} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>বিক্রয় মূল্য - মোট বিনিয়োগ</Text>
            <Text style={[styles.infoValue, { color: profit >= 0 ? Colors.success : Colors.error, fontWeight: "800" }]}>
              {fmt(profit)} {profit >= 0 ? '(লাভ)' : '(ক্ষতি)'}
            </Text>
          </View>
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
            <Text style={styles.milkDate}>{l.log_date}</Text>
            <View style={styles.milkVals}>
              <Text style={styles.milkVal}>
                সকাল <Text style={styles.milkValBold}>{l.morning_liters} লি.</Text>
              </Text>
              <Text style={styles.milkVal}>
                বিকাল <Text style={styles.milkValBold}>{l.evening_liters} লি.</Text>
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
  const [price, setPrice] = useState(String(cow.sale_price || ""));
  const [weightKg, setWeightKg] = useState(String(cow.weight_kg || ""));
  const [isForSale, setIsForSale] = useState(cow.is_for_sale !== false);
  const [note, setNote] = useState(cow.description);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!price || isNaN(price)) {
      Alert.alert("", "সঠিক মূল্য দিন।");
      return;
    }
    
    setSaving(true);
    try {
      // সরাসরি cow.id ব্যবহার করে ডকুমেন্টের রেফারেন্স তৈরি করা হচ্ছে [1]
      const cowDocRef = doc(db, 'cows', cow.id);
      
      // সরাসরি আপডেট অপারেশন [1]
      await updateDoc(cowDocRef, {
        sale_price: parseFloat(price),
        weight_kg: parseFloat(weightKg) || cow.weight_kg,
        is_for_sale: isForSale,
        status: isForSale ? 'available' : 'unavailable',
        description: note,
      });
      
      Alert.alert("✅ সফল", "গরুর তথ্য আপডেট হয়েছে।");
      onUpdate?.();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert("❌ ত্রুটি", "সংরক্ষণ ব্যর্থ হয়েছে।");
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
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('ত্রুটি', 'লগইন করুন');
        return;
      }

      // Get user ID by firebase_uid
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('firebase_uid', '==', currentUser.uid))
      );
      if (usersSnap.empty) {
        Alert.alert('ত্রুটি', 'ব্যবহারকারী খুঁজে পাওয়া যায়নি');
        setCow(null);
        return;
      }

      
      // Get the cow document
      
      const docRef = doc(db, 'cows', id); 
      // const cowSnap = await getDocs(
      //   query(collection(db, 'cows'), where('id', '==', id))
      // );
      const cowDoc = await getDoc(docRef); 

      
      // DocumentSnapshot-এর অস্তিত্ব চেক করার সঠিক নিয়ম
      if (!cowDoc.exists()) {
        console.log('duske');
        setCow(null);
        return;
      }
      const cowData = normalizeCow({ id: cowDoc.id, ...cowDoc.data() });
      console.log(cowData);

      // Get related data in parallel
      const [vaccinesSnap, medicinesSnap, costsSnap, milkLogsSnap] = await Promise.all([
        getDocs(query(collection(db, 'vaccines'), where('cow_id', '==', cowDoc.id))),
        getDocs(query(collection(db, 'medicines'), where('cow_id', '==', cowDoc.id))),
        getDocs(query(collection(db, 'costs'), where('cow_id', '==', cowDoc.id))),
        getDocs(query(collection(db, 'milk_logs'), where('cow_id', '==', cowDoc.id))),
      ]);

      const vaccines = vaccinesSnap.docs.map((doc) =>
        normalizeVaccine({ id: doc.id, ...doc.data() })
      );

      const medicines = medicinesSnap.docs.map((doc) =>
        normalizeMedicine({ id: doc.id, ...doc.data() })
      );

      const costs = costsSnap.docs.map((doc) =>
        normalizeCost({ id: doc.id, ...doc.data() })
      );

      const milkLogs = milkLogsSnap.docs.map((doc) =>
        normalizeMilkLog({ id: doc.id, ...doc.data() })
      );

      setCow({
        ...cowData,
        vaccines,
        medicines,
        costs,
        milkLogs,
      });
    } catch (err) {
      console.error('Error loading cow:', err);
      setCow(null);
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
    toNumber(cow.health_score) >= 85
      ? Colors.healthExcellent
      : toNumber(cow.health_score) >= 70
        ? Colors.healthGood
        : toNumber(cow.health_score) >= 50
          ? Colors.healthAverage
          : toNumber(cow.health_score) >= 30
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
              {cow.is_for_sale ? "পাওয়া যাচ্ছে" : "তালিকায় নেই"}
            </Text>
          </View>
        </View>

        {/* Health ring */}
        <ScoreRing
          score={toNumber(cow.health_score) || 0}
          grade="—"
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
        <Text style={styles.cowPrice}>{fmt(cow.sale_price)}</Text>
      </View>

      {/* ── Chips ── */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {cow.gender === "male" ? "♂ ষাঁড়" : "♀ গাভী"}
          </Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>বয়স {cow.age_months} মাস</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>ওজন {cow.weight_kg} কেজি</Text>
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
