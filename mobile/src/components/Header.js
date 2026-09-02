import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Bell, Search } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, getRoleColor } from '../styles/theme';
import NotificationCenterModal from './NotificationCenterModal';
import GlobalSearchModal from './GlobalSearchModal';
import api from '../api/client';

const Header = ({ title, subtitle, showNotifications = true, showLogout = true, showSearch = true, rightAction, navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const roleColor = getRoleColor(user?.role);

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get('/notifications');
      const list = Array.isArray(data) ? data : data?.notifications || [];
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const canSearch = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.inner}>
          {/* Left: Avatar + title */}
          <View style={styles.left}>
            <View style={[styles.avatarRing, { borderColor: roleColor }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: roleColor + '33' }]}>
                  <Text style={[styles.avatarInitial, { color: roleColor }]}>
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={1}>{title || user?.name || 'Dashboard'}</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              ) : (
                <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
                  <Text style={[styles.roleText, { color: roleColor }]}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: actions */}
          <View style={styles.actions}>
            {rightAction}
            {showSearch && canSearch && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearchModal(true)}>
                <Search size={19} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {showNotifications && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setShowNotificationModal(true);
                  fetchUnread();
                }}
              >
                <Bell size={19} color={colors.textSecondary} />
                {unreadCount > 0 && (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadDotText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {showLogout && (
              <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                <LogOut size={19} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <NotificationCenterModal
        visible={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          fetchUnread();
        }}
        navigation={navigation}
      />

      <GlobalSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        navigation={navigation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...typography.md,
    ...typography.bold,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: spacing.sm,
    borderRadius: 8,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadDotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default Header;

