import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Image, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard, Users, Calendar, BookOpen, GraduationCap,
  UserPlus, UserCheck, Globe, Activity, Settings, UserCircle,
  PenTool, Award, FileText, MessageSquare, ShieldCheck, Brain,
  CalendarOff, ClipboardList, CreditCard, Clock, Search, X,
  ChevronRight, Sun, Moon, LogOut
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, getRoleColor, shadows } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

const AppNavigationDrawer = ({ visible, onClose, navigation, currentRoute }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const role = user?.role || 'student';
  const roleColor = getRoleColor(role);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Build role-specific menu sections mirroring the iAttend website portals
  const menuSections = useMemo(() => {
    switch (role) {
      case 'admin':
        return [
          {
            title: 'Menu',
            items: [
              { name: 'Dashboard', route: 'Dashboard', icon: LayoutDashboard },
              { name: 'Manage Users', route: 'Users', icon: Users },
              { name: 'Teacher Leaves', route: 'Leaves', icon: Calendar, badge: 'Review' },
            ],
          },
          {
            title: 'Management & Setup',
            items: [
              { name: 'Departments & Classes', route: 'Academic', icon: BookOpen, color: '#3b82f6' },
              { name: 'Manage Subjects', route: 'SubjectManage', icon: GraduationCap, color: '#10b981' },
              { name: 'Timetable & Allocations', route: 'Assignments', icon: UserPlus, color: '#8b5cf6' },
              { name: 'Teacher Attendance', route: 'TeacherAttendance', icon: UserCheck, color: '#f59e0b' },
              { name: 'External Quizzes', route: 'AdminQuizManage', icon: Globe, color: '#ec4899' },
            ],
          },
          {
            title: 'System & Security',
            items: [
              { name: 'System Activity Logs', route: 'SystemActivity', icon: Activity },
              { name: 'Role Permissions', route: 'Permissions', icon: Settings },
              { name: 'Admin Profile', route: 'Profile', icon: UserCircle },
            ],
          },
        ];

      case 'teacher':
        return [
          {
            title: 'Menu',
            items: [
              { name: 'Weekly Timetable', route: 'Dashboard', icon: Calendar },
              { name: 'Class Roster', route: 'Roster', icon: Users },
              { name: 'Manage Assignments', route: 'Assignments', icon: BookOpen },
              { name: 'Mark Attendance', route: 'Attendance', icon: PenTool },
            ],
          },
          {
            title: 'Academic & Grading',
            items: [
              { name: 'Exams & Marks Entry', route: 'TeacherExams', icon: Award, color: '#10b981' },
              { name: 'Manage Quizzes', route: 'TeacherQuizManage', icon: BookOpen, color: '#8b5cf6' },
              { name: 'Apply Leave', route: 'TeacherApplyLeave', icon: FileText, color: '#f59e0b' },
              { name: 'Parent Messages', route: 'TeacherMessages', icon: MessageSquare, color: '#3b82f6' },
              ...(user?.classCoordinatorFor ? [
                { name: 'Class Coordinator Leaves', route: 'TeacherApplyLeave', icon: ShieldCheck, color: '#ef4444' }
              ] : []),
            ],
          },
          {
            title: 'Preferences',
            items: [
              { name: 'Faculty Profile', route: 'Profile', icon: UserCircle },
            ],
          },
        ];

      case 'student':
        return [
          {
            title: 'Menu',
            items: [
              { name: 'Dashboard', route: 'Dashboard', icon: LayoutDashboard },
              { name: 'My Timetable', route: 'Timetable', icon: Calendar },
              { name: 'Homework & Assignments', route: 'Assignments', icon: BookOpen },
              { name: 'Quiz Arena', route: 'QuizHub', icon: Brain, badge: 'NEW', badgeColor: '#f59e0b' },
            ],
          },
          {
            title: 'Academics & Records',
            items: [
              { name: 'My Subjects & Faculty', route: 'StudentSubjects', icon: BookOpen, color: '#3b82f6' },
              { name: 'Exam Results & Grades', route: 'StudentResults', icon: Award, color: '#10b981' },
              { name: 'Attendance History', route: 'StudentAttendanceHistory', icon: ClipboardList, color: '#8b5cf6' },
              { name: 'Leave Application', route: 'Leave', icon: CalendarOff, color: '#f59e0b' },
            ],
          },
          {
            title: 'Preferences',
            items: [
              { name: 'Student Profile', route: 'Profile', icon: UserCircle },
            ],
          },
        ];

      case 'parent':
        return [
          {
            title: 'Menu',
            items: [
              { name: 'Dashboard', route: 'Dashboard', icon: LayoutDashboard },
              { name: 'Attendance Analytics', route: 'Attendance', icon: Calendar },
              { name: 'Leave Applications', route: 'ParentLeave', icon: CalendarOff },
              { name: 'Fee Invoices & Receipts', route: 'Fees', icon: CreditCard },
            ],
          },
          {
            title: 'Academics & Communication',
            items: [
              { name: 'Homework & Assignments', route: 'ParentAssignments', icon: BookOpen, color: '#3b82f6' },
              { name: 'Weekly Timetable', route: 'ParentTimetable', icon: Clock, color: '#8b5cf6' },
              { name: 'Exam Results', route: 'ParentResults', icon: Award, color: '#10b981' },
              { name: 'Teacher Messages', route: 'Messages', icon: MessageSquare, color: '#f59e0b' },
            ],
          },
          {
            title: 'Preferences',
            items: [
              { name: 'Guardian Profile', route: 'Profile', icon: UserCircle },
            ],
          },
        ];

      default:
        return [];
    }
  }, [role, user]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;
    const q = searchQuery.toLowerCase().trim();
    return menuSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.name.toLowerCase().includes(q)),
      }))
      .filter(section => section.items.length > 0);
  }, [menuSections, searchQuery]);

  const handleNavigate = (route) => {
    onClose();
    if (!navigation) return;
    try {
      navigation.navigate(route);
    } catch {
      // Fallback
      navigation.navigate('AdminTabs', { screen: route });
    }
  };

  const portalLabel = {
    admin: 'Admin Portal',
    teacher: 'Educator Hub',
    student: 'Student Hub',
    parent: 'Parent Portal',
  }[role] || 'iAttend';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer Panel */}
        <View style={[styles.drawer, { width: DRAWER_WIDTH, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}>
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={[styles.brandLogo, { backgroundColor: roleColor }]}>
                <Text style={styles.brandLogoText}>
                  {role.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.brandInfo}>
                <Text style={styles.brandTitle}>iAttend</Text>
                <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                    {portalLabel.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search navigation..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable Navigation Sections */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredSections.map((section, sIdx) => (
              <View key={sIdx} style={styles.section}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {section.items.map((item, iIdx) => {
                  const IconComponent = item.icon;
                  const isActive = currentRoute === item.route;
                  const isCategory = Boolean(item.color);

                  return (
                    <TouchableOpacity
                      key={iIdx}
                      style={[
                        styles.menuItem,
                        isActive && [styles.menuItemActive, { backgroundColor: roleColor + '18' }],
                      ]}
                      onPress={() => handleNavigate(item.route)}
                      activeOpacity={0.7}
                    >
                      {isCategory ? (
                        <View style={[styles.categoryIconCircle, { backgroundColor: item.color + '22' }]}>
                          <IconComponent size={15} color={item.color} />
                        </View>
                      ) : (
                        <IconComponent
                          size={18}
                          color={isActive ? roleColor : colors.textSecondary}
                          style={styles.itemIcon}
                        />
                      )}

                      <Text
                        style={[
                          styles.menuItemText,
                          isActive && [styles.menuItemTextActive, { color: roleColor }],
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      {/* Right Badge or Chevron */}
                      {item.badge ? (
                        <View style={[styles.badgePill, { backgroundColor: item.badgeColor || colors.danger }]}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : isCategory ? (
                        <ChevronRight size={14} color={colors.textMuted} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{ height: spacing.lg }} />
          </ScrollView>

          {/* Footer: Theme Toggle & User Profile Card */}
          <View style={styles.footer}>
            {/* Theme Toggle Pill */}
            <View style={styles.themeTogglePill}>
              <TouchableOpacity
                style={[styles.themeOption, !isDarkTheme && styles.themeOptionActive]}
                onPress={() => setIsDarkTheme(false)}
                activeOpacity={0.8}
              >
                <Sun size={14} color={!isDarkTheme ? '#0f172a' : colors.textMuted} />
                <Text style={[styles.themeOptionText, !isDarkTheme && styles.themeOptionTextActive]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeOption, isDarkTheme && styles.themeOptionActive]}
                onPress={() => setIsDarkTheme(true)}
                activeOpacity={0.8}
              >
                <Moon size={14} color={isDarkTheme ? '#fff' : colors.textMuted} />
                <Text style={[styles.themeOptionText, isDarkTheme && styles.themeOptionTextActive]}>Dark</Text>
              </TouchableOpacity>
            </View>

            {/* User Profile Card */}
            <View style={styles.userCard}>
              <View style={[styles.userAvatarRing, { borderColor: roleColor }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatarFallback, { backgroundColor: roleColor + '30' }]}>
                    <Text style={[styles.userAvatarInitial, { color: roleColor }]}>
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{user?.email || portalLabel}</Text>
              </View>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  onClose();
                  logout();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Sign out"
              >
                <LogOut size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: '100%',
    backgroundColor: colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  brandInfo: {
    gap: 2,
  },
  brandTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.sm,
    padding: 0,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingTop: spacing.xs,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  menuItemActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemIcon: {
    marginRight: spacing.sm,
  },
  categoryIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  menuItemText: {
    flex: 1,
    ...typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  menuItemTextActive: {
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  themeTogglePill: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  themeOptionActive: {
    backgroundColor: colors.bgCard,
    ...shadows.sm,
  },
  themeOptionText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: spacing.xs,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  userName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
});

export default AppNavigationDrawer;
