import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// import { useAuth } from '../../context/AuthContext';
// import api from '../../config/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60)   return 'এইমাত্র';
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
  return `${Math.floor(diff / 86400)} দিন আগে`;
}

function ConversationCard({ conv, currentUid, onPress }) {
  const otherUid   = conv.participants?.find(p => p !== currentUid) || '—';
  const hasUnread  = false; // Future: unread count

  return (
    <TouchableOpacity style={styles.convCard} onPress={onPress} activeOpacity={0.82}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{conv.avatar || "🐄"}</Text>

        {/* online indicator */}
        {conv.online && <View style={styles.onlineDot} />}

        {/* unread
        {conv.unread > 0 && <View style={styles.unreadDot} />} */}
      </View>

      {/* Content */}
      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>
            {conv.name}
          </Text>

          <Text style={styles.convTime}>
            {conv.time}
          </Text>
        </View>

        <Text style={conv.unread > 0 ? styles.bold : styles.convLast } numberOfLines={1}>
          {conv.sender === "you" ? `আপনি: ${conv.lastMessage}` : conv.lastMessage || 'কথোপকথন শুরু করুন...'}
        </Text>

        {/* cow সম্পর্কিত */}
        {conv.cow && (
          <View style={styles.convCowTag}>
            <Ionicons name="paw-outline" size={11} color={Colors.primary} />
            <Text style={styles.convCowTagText}>
              {conv.cow.name} • ৳{conv.cow.price}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  // const { user } = useAuth();
  // MOCK USER
  const user = {
    uid: 'user1'
  };
  const [convs,      setConvs]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // const loadConvs = useCallback(async () => {
  //   try {
  //     const res = await api.get('/chat/conversations/list');
  //     setConvs(res.data.data || []);
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setLoading(false);
  //     setRefreshing(false);
  //   }
  // }, []);

  const loadConvs = useCallback(async () => {
    setLoading(true);

    // ── MOCK CONVERSATIONS ─────────────────────
    const mockConvs = [
      {
        id: "1",
        name: "করিম খামার",
        lastMessage: "গরুটি কি এখনও বিক্রয়ের জন্য আছে?",
        sender: "you",
        time: "২ মিনিট আগে",
        unread: 0,
        online: true,
        avatar: "ক",
        cow: {
          id: "c1",
          name: "দেশি গরু",
          price: 85000,
        },
      },
      {
        id: "2",
        name: "রহমান খামার",
        lastMessage: "ধন্যবাদ, আমি আগ্রহী",
        sender: "other",
        time: "১৫ মিনিট আগে",
        unread: 0,
        online: false,
        avatar: "র",
        cow: {
          id: "c2",
          name: "ফ্রিজিয়ান",
          price: 120000,
        },
      },
      {
        id: "3",
        name: "সালাম খামার",
        lastMessage: "গরুটি দেখাতে পারব",
        sender: "other",
        time: "১ ঘন্টা আগে",
        unread: 2,
        online: true,
        avatar: "স",
        cow: {
          id: "c3",
          name: "সাহিওয়াল",
          price: 95000,
        },
      },
      {
        id: "4",
        name: "মিজান ডেইরি",
        lastMessage: "কাল সকালে আসেন",
        sender: "other",
        time: "৩ ঘন্টা আগে",
        unread: 1,
        online: false,
        avatar: "ম",
        cow: {
          id: "c4",
          name: "জার্সি",
          price: 110000,
        },
      },
      {
        id: "5",
        name: "হাসান খামার",
        lastMessage: "",
        sender: "",
        time: "২ দিন আগে",
        unread: 0,
        online: false,
        avatar: "হ",
        cow: {
          id: "c5",
          name: "দেশি ক্রস",
          price: 78000,
        },
      },
    ];

    // fake delay
    setTimeout(() => {
      setConvs(mockConvs);
      setLoading(false);
      setRefreshing(false);
    }, 500);

  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const filtered = convs.filter(c =>
    search === '' || c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>বার্তা</Text>
            <Text style={styles.headerSub}>{convs.length}টি কথোপকথন</Text>
          </View>
          <TouchableOpacity style={styles.newChatBtn}>
            <Ionicons name="create-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="বার্তা খুঁজুন..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadConvs(); }}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <ConversationCard
              conv={item}
              currentUid={user?.uid}
              onPress={() => router.push(`./../chat/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>কোনো বার্তা নেই</Text>
              <Text style={styles.emptySub}>
                গরুর বিস্তারিত পাতা থেকে{'\n'}বিক্রেতাকে বার্তা পাঠান
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/home')}
              >
                <Text style={styles.emptyBtnText}>গরু দেখুন →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:     { paddingTop: 54, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, overflow: 'hidden' },
  circle1:    { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -40 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  headerTitle:{ fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSub:  { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  newChatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44 },
  searchInput:{ flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },

  list: { paddingVertical: Spacing.sm },

  convCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  avatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accentPale, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarEmoji: { fontSize: 26 },
  unreadDot:   { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.white },
  onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C853', borderWidth: 2,borderColor: Colors.white,},
  bold:        { fontSize: FontSize.sm, fontWeight: '800'},

  convContent:  { flex: 1 },
  convTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName:     { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  convTime:     { fontSize: FontSize.xs, color: Colors.textMuted },
  convLast:     { fontSize: FontSize.sm, color: Colors.textMuted },
  convCowTag:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  convCowTagText:{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 100, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  emptySub:   { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  emptyBtn:   { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, marginTop: Spacing.sm },
  emptyBtnText:{ color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
});
