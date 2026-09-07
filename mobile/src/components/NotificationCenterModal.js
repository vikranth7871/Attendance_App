import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Check,
  X,
  Clock,
  MessageSquare,
  ClipboardList,
  BookOpen,
  Award,
  CheckCheck,
  Sparkles,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';
import api from '../api/client';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TYPE_ICONS = {
  message: { icon: MessageSquare, color: colors.parent },
  leave: { icon: ClipboardList, color: colors.warning },
  teacher_leave_request: { icon: Calendar, color: colors.warning },
  assignment: { icon: BookOpen, color: colors.teacher },
  quiz: { icon: Award, color: colors.student },
  attendance: { icon: Clock, color: colors.danger },
  default: { icon: Bell, color: colors.primary },
};

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const NotificationCenterModal = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();
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
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleNotificationPress = (item) => {
    markAsRead(item.id);
    onClose();
    if (navigation && item.link) {
      const link = item.link.toLowerCase();
      try {
        if (link.includes('messages')) navigation.navigate('Messages');
        else if (link.includes('teacher-leaves')) navigation.navigate('TeacherLeaves');
        else if (link.includes('coordinator')) navigation.navigate('TeacherCoordinatorLeaves');
        else if (link.includes('leave')) navigation.navigate('TeacherApplyLeave');
        else if (link.includes('assignments')) navigation.navigate('Assignments');
        else if (link.includes('quiz')) navigation.navigate('TeacherQuizManage');
        else if (link.includes('attendance')) navigation.navigate('Attendance');
        else if (link.includes('roster')) navigation.navigate('Roster');
      } catch (e) {
        console.warn('Navigation error from notification:', e);
      }
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const floatingWidth = Math.min(SCREEN_WIDTH - 24, 350);
  const topOffset = insets.top + (Platform.OS === 'ios' ? 52 : 56);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* ─── Backdrop: Tapping outside closes the floating tab ─── */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdropOverlay}>
          {/* Prevent touches on the floating card from closing it */}
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <View
              style={[
                styles.floatingContainer,
                {
                  top: topOffset,
                  width: floatingWidth,
                },
              ]}
            >
              {/* ─── Caret / Triangle Arrow pointing up to the Bell Icon ─── */}
              <View style={styles.caretArrow} />

              {/* ─── Floating Card Header ─── */}
              <View style={styles.floatingHeader}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.headerBellWrap}>
                    <Bell size={15} color="#818cf8" />
                  </View>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerRightActions}>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      style={styles.readAllButton}
                      onPress={markAllAsRead}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <CheckCheck size={13} color="#818cf8" />
                      <Text style={styles.readAllButtonText}>Read All</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.closeIconButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={17} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ─── Notifications Body ─── */}
              {loading ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loaderText}>Loading notifications...</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item, i) => item.id?.toString() || i.toString()}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor={colors.primary}
                    />
                  }
                  renderItem={({ item }) => {
                    const config = TYPE_ICONS[item.type] || TYPE_ICONS.default;
                    const IconComponent = config.icon;
                    const isUnread = !item.is_read;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.notificationItem,
                          isUnread && styles.notificationItemUnread,
                        ]}
                        onPress={() => handleNotificationPress(item)}
                        activeOpacity={0.75}
                      >
                        {/* Type Icon Badge */}
                        <View
                          style={[
                            styles.itemIconBox,
                            { backgroundColor: config.color + '1A' },
                          ]}
                        >
                          <IconComponent size={15} color={config.color} />
                        </View>

                        {/* Text Content */}
                        <View style={styles.itemTextBox}>
                          <Text
                            style={[
                              styles.itemTitle,
                              isUnread && styles.itemTitleUnread,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={styles.itemMessage}
                            numberOfLines={2}
                          >
                            {item.message}
                          </Text>
                          <Text style={styles.itemTime}>
                            {formatNotificationTime(item.created_at)}
                          </Text>
                        </View>

                        {/* Unread Indicator Dot */}
                        {isUnread && <View style={styles.unreadDot} />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <View style={styles.emptyIconCircle}>
                        <Bell size={24} color={colors.textMuted} />
                      </View>
                      <Text style={styles.emptyTitle}>No Notifications</Text>
                      <Text style={styles.emptySubtitle}>
                        You are all caught up!
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  /* Full screen backdrop: subtle dim, dismiss on tap */
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  /* Floating Popover Container */
  floatingContainer: {
    position: 'absolute',
    right: 12,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.62, 450),
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
    overflow: 'visible',
    zIndex: 9999,
  },

  /* Caret pointing directly towards the Bell icon */
  caretArrow: {
    position: 'absolute',
    top: -6,
    right: 22,
    width: 12,
    height: 12,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '45deg' }],
    zIndex: 10000,
  },

  /* Header of the floating card */
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  headerBellWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  unreadCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.sm,
  },
  readAllButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#818cf8',
  },
  closeIconButton: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Loader */
  loaderBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loaderText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },

  /* List */
  list: {
    maxHeight: 380,
  },
  listContent: {
    padding: 8,
    gap: 6,
  },

  /* Notification Item */
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 9,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  itemIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  itemTextBox: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#fff',
  },
  itemMessage: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  itemTime: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#818cf8',
    marginTop: 5,
    flexShrink: 0,
  },

  /* Empty state */
  emptyBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default NotificationCenterModal;
