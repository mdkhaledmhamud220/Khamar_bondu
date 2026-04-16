import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useAuth } from '../../context/AuthContext';
// import { db } from '../../config/firebase';
// import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
// import api from '../../config/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d   = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'আজ';
  if (diff === 1) return 'গতকাল';
  return d.toLocaleDateString('bn-BD');
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
          {isMe && (
            <Text> ✓</Text>
          )}
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

// ── Quick reply chips ──────────────────────────────────────────────────────
const QUICK_REPLIES = [
  'দাম কত?',
  'গরুটি কি এখনও পাওয়া যাচ্ছে?',
  'ছবি পাঠান',
  'কোথায় আছেন?',
  'বুকিং দিতে চাই',
];

export default function ChatRoomScreen() {
  const router   = useRouter();
  const { convId } = useLocalSearchParams();
  // const { user, profile } = useAuth();
  // MOCK USER
  const user = {
    uid: "user2",
  };
  const profile = {
    role: "buyer",
  };

  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [convInfo,  setConvInfo]  = useState(null);
  const [cowInfo,   setCowInfo]   = useState(null);
  const [showQuick, setShowQuick] = useState(false);
  const listRef = useRef(null);
  const mockConvInfo = {
    id: "1",
    participants: ["user1", "user2"],
    cowId: "c2",
  };
  const mockCowInfo = {
    id: "c2",
    name: "দেশি গরু",
    breed: "দেশি",
    price: 85000,
    district: "রাজশাহী",
    ageMonths: 24,
    weightKg: 220,
    healthScore: 82,
    status: "available",
  };
  const mockMessages = [
    {
      id: "m1",
      conversationId: "1",
      senderId: "user2",
      text: "আসসালামু আলাইকুম",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "m2",
      conversationId: "1",
      senderId: "user1",
      text: "ওয়ালাইকুম আসসালাম",
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    },
    {
      id: "m3",
      conversationId: "1",
      senderId: "user2",
      text: "গরুটি কি এখনও আছে?",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: "m4",
      conversationId: "1",
      senderId: "user1",
      text: "জি, আছে",
      createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
    },
    {
      id: "m5",
      conversationId: "1",
      senderId: "user2",
      text: "দাম একটু কমানো যাবে?",
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: "m6",
      conversationId: "1",
      senderId: "user1",
      text: "কত দিতে চান?",
      createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    },
    {
      id: "m7",
      conversationId: "1",
      senderId: "user2",
      text: "৮০ হাজার দিলে নিবো",
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: "m8",
      conversationId: "1",
      senderId: "user1",
      text: "৮৫ হাজার শেষ",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "m9",
      conversationId: "1",
      senderId: "user2",
      text: "ঠিক আছে, কাল আসবো",
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ];

  // Load conversation info
  // useEffect(() => {
  //   if (!convId) return;
  //   api.get('/chat/conversations/list')
  //     .then(res => {
  //       const conv = (res.data.data || []).find(c => c.id === convId);
  //       if (conv) {
  //         setConvInfo(conv);
  //         if (conv.cowId) {
  //           api.get(`/cows/${conv.cowId}`)
  //             .then(r => setCowInfo(r.data.data))
  //             .catch(() => {});
  //         }
  //       }
  //     })
  //     .catch(() => {});
  // }, [convId]);

  // // Real-time messages via Firestore listener
  // useEffect(() => {
  //   if (!convId || !db) return;

  //   try {
  //     const q = query(
  //       collection(db, 'messages'),
  //       where('conversationId', '==', convId),
  //       orderBy('createdAt', 'asc')
  //     );

  //     const unsub = onSnapshot(q, (snap) => {
  //       const msgs = snap.docs.map(d => d.data());
  //       setMessages(msgs);
  //       setLoading(false);
  //       // Scroll to bottom
  //       setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  //     }, (err) => {
  //       console.warn('Firestore listener error:', err);
  //       // Fallback to REST API
  //       api.get(`/chat/${convId}/messages`)
  //         .then(r => { setMessages(r.data.data || []); setLoading(false); })
  //         .catch(() => setLoading(false));
  //     });

  //     return unsub;
  //   } catch (e) {
  //     // Firestore not configured — use REST fallback
  //     api.get(`/chat/${convId}/messages`)
  //       .then(r => { setMessages(r.data.data || []); setLoading(false); })
  //       .catch(() => setLoading(false));
  //   }
  // }, [convId]);

  useEffect(() => {
    setLoading(true);

    setTimeout(() => {
      setConvInfo(mockConvInfo);
      setCowInfo(mockCowInfo);
      setMessages(mockMessages);
      setLoading(false);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }, 500);
  }, [convId]);

  // const sendMessage = async (msgText) => {
  //   const t = (msgText || text).trim();
  //   if (!t || sending) return;
  //   setText('');
  //   setShowQuick(false);
  //   setSending(true);

  //   // Optimistic update
  //   const optimistic = {
  //     id: `tmp_${Date.now()}`,
  //     conversationId: convId,
  //     senderId: user?.uid,
  //     text: t,
  //     createdAt: new Date().toISOString(),
  //     pending: true,
  //   };
  //   setMessages(prev => [...prev, optimistic]);
  //   setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  //   try {
  //     await api.post(`/chat/${convId}/message`, { text: t });
  //   } catch (e) {
  //     Alert.alert('ত্রুটি', 'বার্তা পাঠানো যায়নি।');
  //     setMessages(prev => prev.filter(m => m.id !== optimistic.id));
  //   } finally {
  //     setSending(false);
  //   }
  // };

  const sendMessage = async (msgText) => {
    const t = (msgText || text).trim();
    if (!t || sending) return;

    setText('');
    setShowQuick(false);
    setSending(true);

    const newMsg = {
      id: `m_${Date.now()}`,
      conversationId: convId,
      senderId: user.uid,
      text: t,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);

    setTimeout(() => {
      setSending(false);
      listRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  // Group messages by date
  const grouped = [];
  let lastDate = '';
  messages.forEach(msg => {
    const d = formatDate(msg.createdAt);
    if (d !== lastDate) {
      grouped.push({ type: 'date', label: d, id: `date_${d}` });
      lastDate = d;
    }
    grouped.push({ ...msg, type: 'msg' });
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={{ fontSize: 18 }}>🐄</Text>
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>
                {cowInfo ? (cowInfo.name || cowInfo.breed) : 'কথোপকথন'}
              </Text>
              <Text style={styles.headerSub}>
                {cowInfo ? `৳${cowInfo.price?.toLocaleString('bn-BD')} • ${cowInfo.district}` : 'সক্রিয়'}
              </Text>
            </View>
          </View>

          {/* Booking button */}
          {cowInfo && profile?.role === 'buyer' && cowInfo.status === 'available' && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => router.push(`/orders/book?cowId=${cowInfo.id}&convId=${convId}`)}
            >
              <Text style={styles.bookBtnText}>বুকিং</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cow info banner */}
        {cowInfo && (
          <TouchableOpacity
            style={styles.cowBanner}
            onPress={() => router.push(`/cows/${cowInfo.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.cowBannerLeft}>
              <Text style={styles.cowBannerEmoji}>🐄</Text>
              <View>
                <Text style={styles.cowBannerName}>{cowInfo.name || cowInfo.breed}</Text>
                <Text style={styles.cowBannerMeta}>{cowInfo.ageMonths} মাস • {cowInfo.weightKg} কেজি • স্বাস্থ্য: {cowInfo.healthScore}</Text>
              </View>
            </View>
            <View style={styles.cowBannerPrice}>
              <Text style={styles.cowBannerPriceText}>৳{cowInfo.price?.toLocaleString('bn-BD')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={grouped}
          keyExtractor={item => item.id || item.createdAt}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.type === 'date') return <DateSep label={item.label} />;
            return (
              <MessageBubble
                msg={item}
                isMe={item.senderId === user?.uid}
              />
            );
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

      {/* Quick replies */}
      {showQuick && (
        <View style={styles.quickWrap}>
          <FlatList
            data={QUICK_REPLIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item}
            contentContainerStyle={styles.quickList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickChip} onPress={() => sendMessage(item)}>
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.iconBtn, showQuick && styles.iconBtnActive]}
          onPress={() => setShowQuick(!showQuick)}
        >
          <Ionicons
            name={showQuick ? 'chevron-down' : 'flash-outline'}
            size={20}
            color={showQuick ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>

        <TextInput
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
          {sending
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Ionicons name="send" size={18} color={text.trim() ? Colors.white : Colors.textMuted} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF5EE' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:    { paddingTop: 52, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerName:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.white, maxWidth: 160 },
  headerSub:    { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)' },
  bookBtn:      { backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  bookBtnText:  { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },

  cowBanner:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cowBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cowBannerEmoji: { fontSize: 24 },
  cowBannerName:  { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  cowBannerMeta:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  cowBannerPrice: { backgroundColor: Colors.accentPale, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  cowBannerPriceText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },

  msgList: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: 2 },

  msgRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm, gap: Spacing.sm },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar:{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accentPale, alignItems: 'center', justifyContent: 'center' },

  bubble:       { maxWidth: '75%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
  bubbleMe:     { backgroundColor: Colors.primary, borderBottomRightRadius: 4, ...Shadow.sm },
  bubbleThem:   { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleText:   { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTextMe: { color: Colors.white },
  bubbleTime:   { fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },

  dateSep:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.lg },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', paddingHorizontal: Spacing.sm, backgroundColor: '#EEF5EE' },

  emptyChat:     { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyChatEmoji:{ fontSize: 52 },
  emptyChatText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyChatSub:  { fontSize: FontSize.sm, color: Colors.textMuted },

  quickWrap: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  quickList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  quickChip: { backgroundColor: Colors.accentPale, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  quickChipText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  iconBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive:{ backgroundColor: Colors.accentPale },
  textInput:   { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, maxHeight: 120, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive:{ backgroundColor: Colors.primary, ...Shadow.sm },
});
