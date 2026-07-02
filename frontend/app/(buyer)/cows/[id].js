import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, rtdb } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';

// (Legacy) Mock data - kept for reference; real data now loads from Firestore
const MOCK_COWS = [
  {
    id: "c1",
    name: "লক্ষ্মী",
    breed: "দেশি",
    ageMonths: 26,
    weightKg: 315,
    district: "রাজশাহী",
    price: 145000,
    gender: "female",
    status: "available",
    healthScore: 88,
    healthGrade: "A",
    photos: [],
    description:
      "একটি স্বাস্থ্যকর এবং উৎপাদনশীল দেশী গরু। দুধ উৎপাদন খুবই ভালো।",
    vaccination: "সম্পূর্ণ",
    lastHealthCheck: "2026-03-15",
    _farmerName: "কৃষক রহিম",
    _farmerPhone: "01700000001",
  },
  {
    id: "c2",
    name: "বাদশা",
    breed: "শাহীওয়াল",
    ageMonths: 32,
    weightKg: 410,
    district: "ঢাকা",
    price: 210000,
    gender: "male",
    status: "available",
    healthScore: 81,
    healthGrade: "A-",
    photos: [],
    description: "খুবই শক্তিশালী ষাঁড়। চাষাবাদের কাজে অত্যন্ত উপযুক্ত।",
    vaccination: "সম্পূর্ণ",
    lastHealthCheck: "2026-03-20",
    _farmerName: "কৃষক করিম",
    _farmerPhone: "01700000002",
  },
  {
    id: "c3",
    name: "চাঁদনী",
    breed: "ফ্রিজিয়ান",
    ageMonths: 24,
    weightKg: 360,
    district: "কুমিল্লা",
    price: 175000,
    gender: "female",
    status: "reserved",
    healthScore: 74,
    healthGrade: "B",
    photos: [],
    description: "বিদেশী জাতের উন্নত মানের গরু। উচ্চ দুধ উৎপাদনশীল।",
    vaccination: "আংশিক",
    lastHealthCheck: "2026-03-10",
    _farmerName: "কৃষক হাসান",
    _farmerPhone: "01700000003",
  },
  {
    id: "c4",
    name: "বিজয়",
    breed: "ব্রাহমান",
    ageMonths: 36,
    weightKg: 460,
    district: "নওগাঁ",
    price: 255000,
    gender: "male",
    status: "available",
    healthScore: 69,
    healthGrade: "C+",
    photos: [],
    description: "বড় আকারের গোমাংস উৎপাদনের জন্য আদর্শ।",
    vaccination: "সম্পূর্ণ",
    lastHealthCheck: "2026-03-08",
    _farmerName: "কৃষক আবু",
    _farmerPhone: "01700000004",
  },
  {
    id: "c5",
    name: "নূর",
    breed: "হরিয়ানা",
    ageMonths: 28,
    weightKg: 390,
    district: "সিরাজগঞ্জ",
    price: 198000,
    gender: "female",
    status: "reserved",
    healthScore: 63,
    healthGrade: "C",
    photos: [],
    description: "মাঝারি আকারের দুধ উৎপাদনকারী গরু।",
    vaccination: "চলমান",
    lastHealthCheck: "2026-02-28",
    _farmerName: "কৃষক ফারিদ",
    _farmerPhone: "01700000005",
  },
];

// Normalize Firestore cow doc to UI shape
const normalizeCow = (docOrData) => {
  const d = docOrData && docOrData.data ? docOrData.data() : docOrData;
  if (!d) return null;
  return {
    id: docOrData.id || d.id,
    farm_id: d.farm_id,
    farmer_id : d.farmer_id,
    name: d.name || d.breed || 'গরু',
    breed: d.breed || 'অন্যান্য',
    ageMonths: d.age_months || d.ageMonths || 0,
    weightKg: d.weight_kg || d.weightKg || 0,
    price: d.sale_price || 0,
    gender: d.gender || 'female',
    status: d.status || 'available',
    healthScore: d.health_score || 0,
    description: d.description || d.desc || '',
    // //
    photos: d.photos || d.photo_urls || [],
    healthGrade: d.health_grade || d.healthGrade || '—',
    vaccination: d.vaccination || d.vaccines || d.vaccinated || 'অজানা',
    lastHealthCheck: d.last_health_check || d.lastHealthCheck || '',
  };
};

// Normalize Firestore farmer doc to UI shape
const normalizeFarmer = (docOrData) => {
  const d = docOrData && docOrData.data ? docOrData.data() : docOrData;
  if (!d) return null;
  return {
    sellerName: d.name || '',
    sellerPhone: d.phone || d.phone_number || '',
  };
};

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CowDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [cow, setCow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const createConversation = async (farmerUid, cowId) => {
    const buyerUid = auth.currentUser?.uid;
    if (!buyerUid || !farmerUid || !cowId) {
      throw new Error('conversation data missing');
    }

    const convRef = push(ref(rtdb, 'conversations'));
    await set(convRef, {
      participants: [buyerUid, farmerUid],
      cowId,
      last_message: '',
      last_sender: '',
      updated_at: new Date().toISOString(),
    });
    return convRef.key;
  };

  useEffect(() => {
    const loadCow = async () => {
      try {
        setError(null);
        // Load cow document from Firestore by document id
        if (!id) {
          setError("অচিহ্নিত গরু আইডি।");
          return;
        }
        const ref = doc(db, "cows", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("গরু তথ্য পাওয়া যায়নি।");
          return;
        }
        const normalized = normalizeCow(snap);
        const farmer_id = normalized.farmer_id;
        
        // Load farmer info if farmer_id exists
        let farmerData = { sellerName: '', sellerPhone: '', district: ''};
        if (farmer_id) {
          const ref_farmer = doc(db, "users", farmer_id);
          const snap_farmer = await getDoc(ref_farmer);
          if (snap_farmer.exists()) {
            farmerData = normalizeFarmer(snap_farmer);
          }
        }
        if(normalized.farm_id){
          const ref_farm = doc(db, "farms", normalized.farm_id);
          const snap_farm = await getDoc(ref_farm);
          farmerData.district = snap_farm.data().district;
        }
        
        // Merge cow data with farmer data
        setCow({
          ...normalized,
          ...farmerData
        });
      } catch (e) {
        setError("তথ্য লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    };

    loadCow();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      </View>
    );
  }

  if (error || !cow) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>ফিরে যান</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{cow.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Photo */}
        <View style={styles.photoWrap}>
          {cow.photos?.length > 0 ? (
            <Image
              source={{ uri: cow.photos[0] }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>🐄</Text>
            </View>
          )}
          <View
            style={[
              styles.statusBadgeLarge,
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

        {/* Main Info */}
        <View style={styles.mainInfo}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.breedText}>{cow.breed}</Text>
              <Text style={styles.nameText}>{cow.name}</Text>
            </View>
            <View
              style={[
                styles.healthBadgeLarge,
                {
                  backgroundColor:
                    cow.healthScore >= 85
                      ? Colors.healthExcellent + "20"
                      : cow.healthScore >= 70
                        ? Colors.healthGood + "20"
                        : cow.healthScore >= 50
                          ? Colors.healthAverage + "20"
                          : cow.healthScore >= 30
                            ? Colors.healthWeak + "20"
                            : Colors.healthBad + "20",
                  borderColor:
                    cow.healthScore >= 85
                      ? Colors.healthExcellent
                      : cow.healthScore >= 70
                        ? Colors.healthGood
                        : cow.healthScore >= 50
                          ? Colors.healthAverage
                          : cow.healthScore >= 30
                            ? Colors.healthWeak
                            : Colors.healthBad,
                },
              ]}
            >
              <Text
                style={[
                  styles.healthScoreLarge,
                  {
                    color:
                      cow.healthScore >= 85
                        ? Colors.healthExcellent
                        : cow.healthScore >= 70
                          ? Colors.healthGood
                          : cow.healthScore >= 50
                            ? Colors.healthAverage
                            : cow.healthScore >= 30
                              ? Colors.healthWeak
                              : Colors.healthBad,
                  },
                ]}
              >
                {cow.healthScore}
              </Text>
              <Text style={styles.healthGradeLarge}>{cow.healthGrade}</Text>
            </View>
          </View>

          <Text style={styles.priceText}>
            ৳ {cow.price?.toLocaleString("bn-BD")}
          </Text>
          <Text style={styles.descriptionText}>{cow.description}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>প্রধান তথ্য</Text>
          <View style={styles.card}>
            <DetailRow
              icon="person-outline"
              label="লিঙ্গ"
              value={cow.gender === "male" ? "♂ ষাঁড়" : "♀ গাভী"}
            />
            <View style={styles.divider} />
            <DetailRow
                  onPress={async () => {
                    try {
                      const farmerUid = cow.farmer_id || cow.farmerId;
                      const convId = await createConversation(farmerUid, cow.id);
                      router.push(`./../chat/${convId}`);
                    } catch (e) {
                      console.error('createConversation error', e);
                      setError('কথোপকথন শুরু করা যায়নি।');
                    }
                  }}
              label="বয়স"
              value={`${cow.ageMonths} মাস`}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="barbell-outline"
              label="ওজন"
              value={`${cow.weightKg} কেজি`}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="location-outline"
              label="অবস্থান"
              value={cow.district}
            />
          </View>
        </View>

        {/* Health Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>স্বাস্থ্য তথ্য</Text>
          <View style={styles.card}>
            <DetailRow
              icon="medical-outline"
              label="টিকাকরণ"
              value={cow.vaccination}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="checkmark-done-outline"
              label="সর্বশেষ চেকআপ"
              value={cow.lastHealthCheck}
            />
          </View>
        </View>

        {/* _farmer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>বিক্রেতার তথ্য</Text>
          <View style={styles.card}>
            <DetailRow
              icon="person-circle-outline"
              label="বিক্রেতা"
              value={cow.sellerName}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="call-outline"
              label="ফোন"
              value={cow.sellerPhone}
            />
          </View>
        </View>

        {/* Action Buttons */}

        
        {cow.status === "available" && (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.contactBtn}
              onPress={async () => {
                try {
                  const convId = await createConversation(cow.farmer_id || cow.farmerId, cow.id);
                  router.push(`./../chat/${convId}`);
                } catch (e) {
                  console.error('createConversation error', e);
                  setError('কথোপকথন শুরু করা যায়নি।');
                }
              }}
            >
              <Ionicons name="call" size={18} color={Colors.white} />
              <Text style={styles.contactBtnText}>যোগাযোগ করুন</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookBtn} 
              onPress={() => router.push(`./../orders/book`)}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.bookBtnText}>বুকিং করুন</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSpacer: { width: 28 },

  scroll: { flex: 1 },

  photoWrap: {
    height: 280,
    position: "relative",
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmoji: { fontSize: 80 },

  statusBadgeLarge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  statusAvailable: { backgroundColor: Colors.primary },
  statusReserved: { backgroundColor: Colors.warning },
  statusText: { color: Colors.white, fontSize: FontSize.md, fontWeight: "700" },

  mainInfo: { padding: Spacing.lg, backgroundColor: Colors.white },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  breedText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: 4,
  },
  nameText: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  healthBadgeLarge: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  healthScoreLarge: { fontSize: FontSize.xl, fontWeight: "800" },
  healthGradeLarge: { fontSize: FontSize.sm, fontWeight: "700", marginTop: 2 },

  priceText: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  actionSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    flexDirection: "row",
  },
  contactBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  contactBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  bookBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  bookBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: FontSize.md,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.md },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.md,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  backBtnText: { color: Colors.white, fontWeight: "600" },
});
