import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator
} from 'react-native';
import {
  Bell, Check, X, Clock, MessageSquare, ClipboardList,
  BookOpen, Award, CheckCheck, Trash2
} from 'lucide-react-native';
import api from '../api/client';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const TYPE_ICONS = {
  message: { icon: MessageSquare, color: colors.parent },
  leave: { icon: ClipboardList, color: colors.warning },
  assignment: { icon: BookOpen, color: colors.teacher },
  quiz: { icon: Award, color: colors.student },
  attendance: { icon: Clock, color: colors.danger },
  default: { icon: Bell, color: colors.primary },
};

const NotificationCenterModal = ({ visible, onClose, navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : data?.notifications || []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleNotificationPress = (item) => {
    markAsRead(item.id);
    onClose();
    if (navigation && item.link) {
      // Parse link if it maps to a screen
      if (item.link.includes('messages')) navigation.navigate('Messages');
      else if (item.link.includes('leaves') || item.link.includes('leave')) navigation.navigate('Leaves');
      else if (item.link.includes('assignments')) navigation.navigate('Assignments');
      else if (item.link.includes('quiz')) navigation.navigate('QuizHub');
      else if (item.link.includes('attendance')) navigation.navigate('Attendance');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={markAllAsRead}>
                  <CheckCheck size={16} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Read All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item, i) => item.id?.toString() || i.toString()}
              renderItem={({ item }) => {
                const config = TYPE_ICONS[item.type] || TYPE_ICONS.default;
                const IconComponent = config.icon;
                return (
                  <TouchableOpacity
                    style={[styles.item, !item.is_read && styles.unreadItem]}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: config.color + '22' }]}>
                      <IconComponent size={18} color={config.color} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={[styles.itemTitle, !item.is_read && styles.unreadText]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                      <Text style={styles.itemTime}>
                        {item.created_at ? new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    {!item.is_read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Bell size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Notifications</Text>
                  <Text style={styles.emptySub}>You're all caught up!</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%', minHeight: 400 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  badge: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '18', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  actionBtnText: { ...typography.xs, color: colors.primary, fontWeight: '600' },
  closeBtn: { padding: 4 },
  loader: { padding: spacing.xxl, alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  unreadItem: { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '44' },
  iconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  itemBody: { flex: 1 },
  itemTitle: { ...typography.sm, ...typography.semibold, color: colors.textPrimary, marginBottom: 2 },
  unreadText: { ...typography.bold, color: colors.textPrimary },
  itemMessage: { ...typography.xs, color: colors.textSecondary, lineHeight: 18 },
  itemTime: { ...typography.xs, color: colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, alignSelf: 'center', marginLeft: spacing.xs },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
});

export default NotificationCenterModal;
