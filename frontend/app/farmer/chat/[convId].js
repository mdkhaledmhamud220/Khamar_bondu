import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, onValue, push, ref, set, update } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View, Keyboard,
} from "react-native";
import { auth, db, rtdb } from "../../../firebaseConfig";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "./../../../constants/theme";

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "আজ";
  if (diff === 1) return "গতকাল";
  return d.toLocaleDateString("bn-BD");
}

function toIsoString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeConversation(docOrData) {
  const data = docOrData?.data ? docOrData.data() : docOrData;
  if (!data) return null;
  return {
    id: docOrData.id || data.id,
    buyerId: data.buyer_id || data.buyerId || "",
    farmerId: data.farmer_id || data.farmerId || "",
    cowId: data.cow_id || data.cowId || "",
    lastMessage: data.last_message || data.lastMessage || "",
    lastMessageAt: toIsoString(data.last_message_at || data.lastMessageAt),
  };
}

function normalizeMessage(docOrData) {
  const data = docOrData?.data ? docOrData.data() : docOrData;
  if (!data) return null;
  return {
    id: docOrData.id || data.id,
    conversationId: data.conversation_id || data.conversationId || "",
    senderId: data.sender_id || data.senderId || "",
    text: data.text || "",
    isRead: Boolean(data.is_read ?? data.isRead),
    createdAt: toIsoString(data.created_at || data.createdAt),
  };
}

function normalizeCow(docOrData) {
  const data = docOrData?.data ? docOrData.data() : docOrData;
  if (!data) return null;
  return {
    id: docOrData.id || data.id,
    name: data.name || data.breed || "গরু",
    breed: data.breed || "অন্যান্য",
    price: data.sale_price || data.price || 0,
    district: data.district || data.location || "অজানা",
    ageMonths: data.age_months || data.ageMonths || 0,
    weightKg: data.weight_kg || data.weightKg || 0,
    healthScore: data.health_score || data.healthScore || 0,
    status: data.status || "available",
  };
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      {!isMe && (
        <View style={styles.msgAvatar}>
          <Text style={{ fontSize: 14 }}>🐄</Text>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {formatTime(msg.createdAt)}
          {isMe && <Text> ✓</Text>}
        </Text>
      </View>
    </View>
  );
}

// ── Date separator ─────────────────────────────────────────────────────────
function DateSep({ label }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const { convId } = useLocalSearchParams();
  const [userId, setUserId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [convInfo, setConvInfo] = useState(null);
  const [cowInfo, setCowInfo] = useState(null);
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    let unsubMessages = null;

    const loadChat = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!convId) {
          setError("কথোপকথন পাওয়া যায়নি।");
          return;
        }

        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
          setError("লগইন তথ্য পাওয়া যায়নি।");
          return;
        }

        setUserId(currentUid);

        // Load conversation from Realtime Database
        const convSnap = await get(
          ref(rtdb, `conversations/${String(convId)}`),
        );
        const convData = convSnap.val();
        if (!convData) {
          setError("কথোপকথন পাওয়া যায়নি।");
          return;
        }

        const conv = normalizeConversation({ id: String(convId), ...convData });
        if (
          !Array.isArray(convData.participants) ||
          !convData.participants.includes(currentUid)
        ) {
          setError("এই কথোপকথনে আপনার অ্যাক্সেস নেই।");
          return;
        }

        setConvInfo(conv);

        if (conv.cowId) {
          const cowSnap = await getDoc(doc(db, "cows", conv.cowId));
          setCowInfo(cowSnap.exists() ? normalizeCow(cowSnap) : null);
        } else {
          setCowInfo(null);
        }

        // Listen to messages under messages/{convId}
        const messagesRef = ref(rtdb, `messages/${conv.id}`);
        const unsubscribe = onValue(
          messagesRef,
          (snap) => {
            const val = snap.val() || {};
            const arr = Object.entries(val).map(([id, d]) => ({ id, ...d }));
            arr.sort(
              (a, b) =>
                new Date(a.created_at || a.createdAt) -
                new Date(b.created_at || b.createdAt),
            );
            setMessages(arr.map(normalizeMessage).filter(Boolean));
            setLoading(false);
            setTimeout(
              () => listRef.current?.scrollToEnd({ animated: false }),
              80,
            );
          },
          (err) => {
            setError("বার্তা লোড করা যায়নি।");
            setLoading(false);
          },
        );

        unsubMessages = unsubscribe;
      } catch (e) {
        setError("কথোপকথন লোড করা যায়নি।");
        setLoading(false);
      }
    };

    loadChat();

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [convId]);

  const sendMessage = async (msgText) => {
    const t = (msgText || text).trim();
    if (!t || sending || !convInfo || !userId) return;

    setText("");
    setShowQuick(false);
    setSending(true);

    try {
      const now = new Date();
      const newRef = push(ref(rtdb, `messages/${convInfo.id}`));
      await set(newRef, {
        id: newRef.key,
        conversation_id: convInfo.id,
        sender_id: userId,
        text: t,
        is_read: false,
        created_at: now.toISOString(),
      });

      await update(ref(rtdb, `conversations/${convInfo.id}`), {
        last_message: t,
        last_message_at: now.toISOString(),
        last_sender: userId,
      });
    } catch (e) {
      console.error("sendMessage error", e);
      Alert.alert("ত্রুটি", "বার্তা পাঠানো যায়নি।");
      setText(t);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = "";
  messages.forEach((msg) => {
    const d = formatDate(msg.createdAt);
    if (d !== lastDate) {
      grouped.push({ type: "date", label: d, id: `date_${d}` });
      lastDate = d;
    }
    grouped.push({ ...msg, type: "msg" });
  });

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={{ fontSize: 18 }}>🐄</Text>
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>
                {cowInfo
                  ? cowInfo.name || cowInfo.breed
                  : convInfo
                    ? "কথোপকথন"
                    : "লোড হচ্ছে"}
              </Text>
              <Text style={styles.headerSub}>
                {cowInfo
                  ? `৳${cowInfo.price?.toLocaleString("bn-BD")} • ${cowInfo.district}`
                  : convInfo?.lastMessage || "সক্রিয়"}
              </Text>
            </View>
          </View>

          {/* Booking button */}
          {cowInfo &&
            convInfo?.buyerId === userId &&
            cowInfo.status === "available" && (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() =>
                  router.push(
                    `/orders/book?cowId=${cowInfo.id}&convId=${convId}`,
                  )
                }
              >
                <Text style={styles.bookBtnText}>বুকিং</Text>
              </TouchableOpacity>
            )}
        </View>

        {/* Cow info banner */}
        {cowInfo && (
          <TouchableOpacity
            style={styles.cowBanner}
            onPress={() => router.push(`./../cows/${cowInfo.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.cowBannerLeft}>
              <Text style={styles.cowBannerEmoji}>🐄</Text>
              <View>
                <Text style={styles.cowBannerName}>
                  {cowInfo.name || cowInfo.breed}
                </Text>
                <Text style={styles.cowBannerMeta}>
                  {cowInfo.ageMonths} মাস • {cowInfo.weightKg} কেজি • স্বাস্থ্য:{" "}
                  {cowInfo.healthScore}
                </Text>
              </View>
            </View>
            <View style={styles.cowBannerPrice}>
              <Text style={styles.cowBannerPriceText}>
                ৳{cowInfo.price?.toLocaleString("bn-BD")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={grouped}
          keyExtractor={(item) => item.id || item.createdAt}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.type === "date") return <DateSep label={item.label} />;
            return <MessageBubble msg={item} isMe={item.senderId === userId} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>👋</Text>
              <Text style={styles.emptyChatText}>কথোপকথন শুরু করুন</Text>
              {cowInfo && (
                <Text style={styles.emptyChatSub}>
                  {cowInfo.name || cowInfo.breed} সম্পর্কে জিজ্ঞেস করুন
                </Text>
              )}
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { marginBottom: keyboardHeight , paddingBottom:25}]}>
        <TextInput
          scrollEnabled
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="বার্তা লিখুন..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          onFocus={() => setShowQuick(false)}
        />

        <TouchableOpacity
          style={[styles.sendBtn, text.trim() && styles.sendBtnActive]}
          onPress={() => sendMessage()}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? Colors.white : Colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF5EE" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: 52,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
    maxWidth: 160,
  },
  headerSub: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.75)" },
  bookBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  bookBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },

  cowBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cowBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cowBannerEmoji: { fontSize: 24 },
  cowBannerName: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.white,
  },
  cowBannerMeta: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.7)" },
  cowBannerPrice: {
    backgroundColor: Colors.accentPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cowBannerPriceText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },

  msgList: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: 2 },

  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  msgRowMe: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },

  bubble: {
    maxWidth: "75%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    ...Shadow.sm,
  },
  bubbleThem: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadow.sm,
  },
  bubbleText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: "right",
  },
  bubbleTimeMe: { color: "rgba(255,255,255,0.65)" },

  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: "600",
    paddingHorizontal: Spacing.sm,
    backgroundColor: "#EEF5EE",
  },

  emptyChat: { alignItems: "center", paddingTop: 80, gap: Spacing.sm },
  emptyChatEmoji: { fontSize: 52 },
  emptyChatText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  emptyChatSub: { fontSize: FontSize.sm, color: Colors.textMuted },

  quickWrap: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.accentPale,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 90,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: Colors.accentPale },
  textInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,

    minHeight: 40,
    maxHeight: 120,

    paddingVertical: 8,
    textAlignVertical: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: { backgroundColor: Colors.primary, ...Shadow.sm },
});
