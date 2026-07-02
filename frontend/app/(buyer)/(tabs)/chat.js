import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { auth, rtdb, db} from '../../../firebaseConfig';
import { ref, get } from 'firebase/database';
import { doc, getDoc } from "firebase/firestore";

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
          {conv.sender === auth.currentUser.uid ? `আপনি: ${conv.lastMessage}` : conv.lastMessage || 'কথোপকথন শুরু করুন...'}
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

function sortConversations(conversations) {
  return conversations.sort((a, b) => {
    const timeA = new Date(a.time || 0).getTime();
    const timeB = new Date(b.time || 0).getTime();
    console.log(timeA);
    console.log(timeB);


    return timeB - timeA; // Latest first
  });
}

export default function ChatListScreen() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
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

    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setConvs([]);
        return;
      }

      setCurrentUserId(currentUser.uid);

      const convSnap = await get(ref(rtdb, "conversations"));
      const convVal = convSnap.val() || {};

      const loaded = await Promise.all(
        Object.entries(convVal)
          .map(([id, data]) => ({ id, ...data }))
          .filter(
            (c) =>
              Array.isArray(c.participants) &&
              c.participants.includes(currentUser.uid)
          )
          .map(async (conv) => {
            // ===== Other user =====
            const otherUserId = conv.participants.find(
              (id) => id !== currentUser.uid
            );

            let userData = {};

            if (otherUserId) {
              const userDoc = await getDoc(doc(db, "users", otherUserId));

              if (userDoc.exists()) {
                userData = userDoc.data();
              }
            }

            // ===== Cow =====
            let cowData = {};

            if (conv.cowId) {
              const cowDoc = await getDoc(doc(db, "cows", conv.cowId));

              if (cowDoc.exists()) {
                cowData = cowDoc.data();
              }
            }

            return {
              id: conv.id,

              // User Info
              name: userData.name || "Unknown User",
              online: userData.online || false,
              avatar: userData.avatar || "🐄",

              // Conversation
              participants: conv.participants || [],
              lastMessage: conv.last_message || "",
              sender: conv.last_sender || "",
              time:conv.last_message_at || "",
              unread: conv.unread_count || 0,

              // Cow Info
              cow: {
                id: conv.cowId,
                name: cowData.name || "",
                price: cowData.sale_price || 0,
              },
            };
          })
      );
      const filteredLoaded = sortConversations(loaded.filter(Boolean))
      setConvs(filteredLoaded);
    } catch (err) {
      console.error(err);
      setConvs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
              currentUid={currentUserId}
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
