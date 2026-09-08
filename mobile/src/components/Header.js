import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Bell, Search, ArrowLeft, Menu } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, getRoleColor } from '../styles/theme';
import NotificationCenterModal from './NotificationCenterModal';
import GlobalSearchModal from './GlobalSearchModal';
import AppNavigationDrawer from './AppNavigationDrawer';
import api from '../api/client';

const Header = ({
  title,
  subtitle,
  showNotifications = true,
  showLogout = false,
  showSearch = true,
  showBack,
  onBack,
  rightAction,
  navigation,
}) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const roleColor = getRoleColor(user?.role);

  let nav = navigation;
  try {
    if (!nav) nav = useNavigation();
  } catch {
    // silently fallback if rendered outside navigation container
  }

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
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

  const isDashboard = Boolean(
    (nav?.getState && nav.getState()?.routes?.[nav.getState()?.index]?.name === 'Dashboard') ||
    (title && (
      title.toLowerCase().includes('dashboard') ||
      title.toLowerCase().includes('portal') ||
      title.toLowerCase().startsWith('hi,') ||
      title.toLowerCase().startsWith('hello,')
    ))
  );

  const canGoBack = Boolean(nav?.canGoBack && nav.canGoBack());
  const showBackBtn = showBack !== undefined ? showBack : (!isDashboard && (canGoBack || Boolean(nav)));

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (nav?.canGoBack && nav.canGoBack()) {
      nav.goBack();
    } else if (nav?.navigate) {
      nav.navigate('Dashboard');
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.inner}>
          {/* Left: Menu Drawer Toggle + (Back button on subpages OR Avatar on Dashboard) */}
          <View style={styles.left}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setShowDrawer(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Menu size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            {showBackBtn ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
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
            )}
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

      <AppNavigationDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        navigation={nav}
        currentRoute={title}
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
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
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

