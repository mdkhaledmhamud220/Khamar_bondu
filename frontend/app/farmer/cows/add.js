import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
// import api from '../../config/api';
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "../../../constants/theme";

import { auth, db } from "../../../firebaseConfig";

const DISTRICTS = [
  "ঢাকা",
  "চট্টগ্রাম",
  "রাজশাহী",
  "খুলনা",
  "বরিশাল",
  "সিলেট",
  "রংপুর",
  "ময়মনসিংহ",
  "কুমিল্লা",
  "গাজীপুর",
];

const BREEDS = [
  "দেশি",
  "শাহীওয়াল",
  "ফ্রিজিয়ান",
  "ব্রাহমান",
  "হরিয়ানা",
  "অন্যান্য",
];
const GENDERS = [
  { key: "male", label: "♂ ষাঁড়" },
  { key: "female", label: "♀ গাভী" },
];

export default function AddCowScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("male");
  const [ageMonths, setAgeMonths] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [price, setPrice] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [regularFeeding, setRegularFeeding] = useState(true);
  const [isForSale, setIsForSale] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { farmId } = useLocalSearchParams();

  const validate = () => {
    const e = {};
    if (!breed) e.breed = "প্রজাতি নির্বাচন করুন";
    if (!ageMonths) e.ageMonths = "বয়স লিখুন";
    else if (isNaN(ageMonths) || Number(ageMonths) <= 0)
      e.ageMonths = "সঠিক বয়স দিন";
    if (!weightKg) e.weightKg = "ওজন লিখুন";
    else if (isNaN(weightKg) || Number(weightKg) <= 0)
      e.weightKg = "সঠিক ওজন দিন";
    if (!price) e.price = "মূল্য লিখুন";
    else if (isNaN(price) || Number(price) <= 0) e.price = "সঠিক মূল্য দিন";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("ত্রুটি", "দয়া করে আগে লগইন করুন।");
      return;
    }

    if (!farmId) {
      Alert.alert(
        "ত্রুটি",
        "কোনো খামার আইডি পাওয়া যায়নি। সঠিক খামার থেকে নতুন গরু যোগ করুন।",
      );
      return;
    }

    setLoading(true);
    try {
      // ১. Health Score হিসাব করুন (একটি সাধারণ ডামি লজিক)
      const healthScore = regularFeeding ? 85 : 60;

      // ২. COWS স্কিমা অনুযায়ী ফায়ারস্টোরের রুট কালেকশনে ডাটা সেভ করুন
      const cowsCollection = collection(db, "cows");
      const newCowRef = await addDoc(cowsCollection, {
        farm_id: farmId, // FK -> farms কালেকশনের ID
        farmer_id: user.uid, // রুট কুয়েরি সহজ করতে ফরেন কি
        name: name.trim() || "নামহীন গরু",
        breed: breed,
        gender: gender,
        age_months: Number(ageMonths),
        weight_kg: Number(weightKg),
        price: Number(price),
        status: isForSale ? "available" : "draft", // বিক্রির জন্য হলে available, না হলে draft
        health_score: healthScore,
        sale_price: Number(price),
        sale_date: null,
        description: description.trim(),
        regular_feeding: regularFeeding,
        district: district,
        created_at: serverTimestamp(),
      });

      console.log("Firestore-এ গরু যোগ করা সফল হয়েছে!");

      Alert.alert("✅ সফল!", "গরু সফলভাবে যোগ করা হয়েছে।", [
        {
          text: "দেখুন",
          onPress: () => router.replace(`/cows/${newCowRef.id}`),
        },
        {
          text: "আরো যোগ করুন",
          onPress: () => router.replace(`/cows/add?farmId=${farmId}`),
        },
      ]);
    } catch (err) {
      console.log(err);
      Alert.alert("ত্রুটি", "গরু যোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>নতুন গরু যোগ করুন</Text>
        <Text style={styles.headerSub}>
          গরুর তথ্য পূরণ করুন — Health Score স্বয়ংক্রিয়ভাবে তৈরি হবে
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 মূল তথ্য</Text>

          <Input
            label="গরুর নাম (ঐচ্ছিক)"
            icon="pricetag-outline"
            value={name}
            onChangeText={setName}
            placeholder="যেমন: রাজা, সুন্দরী"
          />

          {/* Breed picker */}
          <Text style={styles.fieldLabel}>প্রজাতি *</Text>
          {errors.breed && <Text style={styles.errorText}>{errors.breed}</Text>}
          <View style={styles.chipRow}>
            {BREEDS.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.chip, breed === b && styles.chipActive]}
                onPress={() => setBreed(b)}
              >
                <Text
                  style={[
                    styles.chipText,
                    breed === b && styles.chipTextActive,
                  ]}
                >
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gender */}
          <Text style={styles.fieldLabel}>লিঙ্গ *</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  styles.chip,
                  styles.chipHalf,
                  gender === g.key && styles.chipActive,
                ]}
                onPress={() => setGender(g.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    gender === g.key && styles.chipTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="বয়স (মাসে) *"
                icon="calendar-outline"
                value={ageMonths}
                onChangeText={setAgeMonths}
                placeholder="যেমন: 24"
                keyboardType="numeric"
                error={errors.ageMonths}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="ওজন (কেজি) *"
                icon="barbell-outline"
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="যেমন: 180"
                keyboardType="numeric"
                error={errors.weightKg}
              />
            </View>
          </View>

          <Input
            label="মূল্য (টাকা) *"
            icon="cash-outline"
            value={price}
            onChangeText={setPrice}
            placeholder="যেমন: 85000"
            keyboardType="numeric"
            error={errors.price}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📍 অবস্থান ও বিবরণ</Text>

          {/* District */}
          <Text style={styles.fieldLabel}>জেলা *</Text>
          {errors.district && (
            <Text style={styles.errorText}>{errors.district}</Text>
          )}
          <View style={styles.chipRow}>
            {DISTRICTS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, district === d && styles.chipActive]}
                onPress={() => setDistrict(d)}
              >
                <Text
                  style={[
                    styles.chipText,
                    district === d && styles.chipTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="বিবরণ (ঐচ্ছিক)"
            icon="document-text-outline"
            value={description}
            onChangeText={setDescription}
            placeholder="গরু সম্পর্কে বাড়তি তথ্য লিখুন..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⚕️ স্বাস্থ্য ও বিক্রয়</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>
                নিয়মিত খাবার দেওয়া হচ্ছে?
              </Text>
              <Text style={styles.switchDesc}>Health Score এ প্রভাব পড়বে</Text>
            </View>
            <Switch
              value={regularFeeding}
              onValueChange={setRegularFeeding}
              trackColor={{ false: Colors.border, true: Colors.accentLight }}
              thumbColor={regularFeeding ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>
                বিক্রির জন্য তালিকাভুক্ত করবেন?
              </Text>
              <Text style={styles.switchDesc}>
                বন্ধ রাখলে শুধু আপনি দেখতে পাবেন
              </Text>
            </View>
            <Switch
              value={isForSale}
              onValueChange={setIsForSale}
              trackColor={{ false: Colors.border, true: Colors.accentLight }}
              thumbColor={isForSale ? Colors.primary : Colors.textMuted}
            />
          </View>
        </View>

        {/* Health score preview note */}
        <View style={styles.noteBox}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={Colors.info}
          />
          <Text style={styles.noteText}>
            Health Score যোগ করার সাথে সাথে স্বয়ংক্রিয়ভাবে হিসাব করা হবে। পরে
            vaccine ও medicine ইতিহাস যোগ করলে Score আরও সঠিক হবে।
          </Text>
        </View>

        <Button
          title="গরু যোগ করুন ✓"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 54,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    alignSelf: "flex-end",
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.white,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  errorText: { fontSize: FontSize.xs, color: Colors.error, marginBottom: 6 },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipHalf: { flex: 1 },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accentPale,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },

  row: { flexDirection: "row", gap: Spacing.md },
  half: { flex: 1 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchInfo: { flex: 1, marginRight: Spacing.md },
  switchLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  switchDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  noteBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.info + "12",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + "30",
  },
  noteText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  submitBtn: { marginTop: Spacing.sm },
});
