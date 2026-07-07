// components/NotificationsScreen.js
// Reusable notifications UI. Pass audience="farm" + farmId, or audience="buyer" + uid.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from "../services/notificationService";
import {
  formatRelativeTimeBn,
  getNotificationStyle,
} from "../utils/notificationHelpers";
import {
  Colors,
  Spacing
} from "./../constants/theme";

export default function NotificationsScreen({
  audience,
  ownerId,
  onPressNotification,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      audience,
      ownerId,
      (items) => {
        setNotifications(items);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsubscribe;
  }, [audience, ownerId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handlePress = async (item) => {
    if (!item.is_read) {
      markAsRead(audience, item.id).catch(() => {});
    }
    onPressNotification && onPressNotification(item);
  };

  const handleMarkAllRead = () => {
    markAllAsRead(audience, notifications).catch(() => {});
  };

  const renderItem = ({ item }) => {
    const style = getNotificationStyle(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={20} color={style.color} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text
              style={[styles.title, !item.is_read && styles.titleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.dot} />}
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTimeBn(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>নোটিফিকেশন</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.markAllText}>সব পড়া হয়েছে</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2D6A4F"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color="#9BAA9C" />
            <Text style={styles.emptyTitle}>কোনো নোটিফিকেশন নেই</Text>
            <Text style={styles.emptySubtitle}>
              নতুন অর্ডার, বার্তা বা আপডেট এখানে দেখতে পাবেন
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6F1" },
  header: {
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -40,
    right: -30,
  },
  circle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 10,
    left: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F6F1",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#f3f5f4" },
  markAllText: { fontSize: 13, fontWeight: "600", color: "#2D6A4F" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flexGrow: 1 },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E7ECE6",
  },
  cardUnread: { borderColor: "#CFE3D4", backgroundColor: "#FCFFFC" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 15, fontWeight: "500", color: "#33413A", flexShrink: 1 },
  titleUnread: { fontWeight: "700", color: "#1B3B2F" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E9B44C",
    marginLeft: 8,
  },
  body: { fontSize: 13, color: "#6B776E", marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: "#9BAA9C", marginTop: 6 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#33413A",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#8B978C",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
