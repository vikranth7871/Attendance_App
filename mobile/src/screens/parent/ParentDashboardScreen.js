import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Calendar, Clock, BookOpen, CreditCard, Award,
  MessageSquare, CheckCircle2, ShieldCheck, Hash, GraduationCap,
  UserCheck, AlertTriangle, Sparkles, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [childrenSummary, setChildrenSummary] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/parent/student-summary');
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setChildrenSummary(list);
      if (list.length > 0 && !selectedChildId) {
        setSelectedChildId(String(list[0].studentId || list[0].id || ''));
      }
    } catch (err) {
      console.error('Parent dashboard summary error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, [selectedChildId]);

  if (loading) return <FullPageLoader message="Loading student profiles..." />;

  const activeChild = childrenSummary.find(
    c => String(c.studentId || c.id || '') === String(selectedChildId)
  ) || childrenSummary[0] || {};

  const activeId = activeChild.studentId || activeChild.id;

  const quickActions = [
    {
      name: 'Attendance',
      screen: 'Attendance',
      icon: Calendar,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
    },
    {
      name: 'Timetable',
      screen: 'ParentTimetable',
      icon: Clock,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
    },
    {
      name: 'Assignments',
      screen: 'ParentAssignments',
      icon: BookOpen,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      name: 'Fees & Receipts',
      screen: 'Fees',
      icon: CreditCard,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      name: 'Exam Results',
      screen: 'ParentResults',
      icon: Award,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
    },
    {
      name: 'Teacher Messages',
      screen: 'Messages',
      icon: MessageSquare,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      name: 'Leave Requests',
      screen: 'ParentLeave',
      icon: CheckCircle2,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      name: 'Profile Settings',
      screen: 'Profile',
      icon: ShieldCheck,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.12)',
    },
  ];

  const attendancePct = parseFloat(activeChild.attendancePercentage) || 0;
  const isAttendanceGood = attendancePct >= 75;

  const todayStatus = (activeChild.todayStatus || '').toLowerCase();
  const isPresentToday = todayStatus === 'present';
  const isAbsentToday = todayStatus === 'absent';

  const pendingFeeAmount = activeChild.feeInfo?.pending_amount || 0;
  const feeDueDate = activeChild.feeInfo?.due_date;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Parent Portal"
        subtitle={`Welcome, ${user?.name || 'Parent'}`}
        navigation={navigation}
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Child Switcher Component */}
        {childrenSummary.length > 0 && (
          <ChildSwitcher
            childrenList={childrenSummary}
            selectedChildId={selectedChildId}
            onSelectChild={(id) => setSelectedChildId(id)}
          />
        )}

        {childrenSummary.length === 0 ? (
          <View style={[styles.emptyCard, shadows.sm]}>
            <Users size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Children Linked</Text>
            <Text style={styles.emptyDesc}>
              Please contact the system administrator to link your student accounts.
            </Text>
          </View>
        ) : (
          <>
            {/* Student Profile Hero Card */}
            <View style={[styles.profileCard, shadows.md]}>
              <View style={styles.profileTopRow}>
                <View style={styles.profileIdentity}>
                  <LinearGradient
                    colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.largeAvatar}
                  >
                    <Text style={styles.largeAvatarText}>
                      {(activeChild.name || 'S').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {activeChild.name || 'Student Name'}
                      </Text>
                    </View>
                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>
                        {activeChild.classInfo?.className || activeChild.classInfo?.name || 'Class Student'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Overall Attendance Box */}
                <View style={styles.attendanceBox}>
                  <Text
                    style={[
                      styles.attendanceValue,
                      { color: isAttendanceGood ? colors.success : colors.danger }
                    ]}
                  >
                    {activeChild.attendancePercentage ? `${activeChild.attendancePercentage}%` : '—'}
                  </Text>
                  <Text style={styles.attendanceLabel}>OVERALL ATTENDANCE</Text>
                </View>
              </View>

              {/* Student Metadata Row */}
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Hash size={13} color={colors.textSecondary} />
                  <Text style={styles.metaChipText}>
                    Roll: {activeChild.rollNumber || 'STU001'}
                  </Text>
                </View>

                <View style={styles.metaChip}>
                  <GraduationCap size={13} color={colors.textSecondary} />
                  <Text style={styles.metaChipText}>
                    Sec {activeChild.section || 'A'}
                  </Text>
                </View>

                {activeChild.department ? (
                  <View style={styles.metaChip}>
                    <UserCheck size={13} color={colors.textSecondary} />
                    <Text style={styles.metaChipText}>
                      {activeChild.department}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Today's Status & Fee Warning Strip */}
              <View style={styles.statusStrip}>
                <View style={styles.todayStatusGroup}>
                  <Text style={styles.todayLabel}>Today's Status:</Text>
                  <View
                    style={[
                      styles.todayPill,
                      {
                        backgroundColor: isPresentToday
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isAbsentToday
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(99, 102, 241, 0.15)'
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.todayPillText,
                        {
                          color: isPresentToday
                            ? colors.success
                            : isAbsentToday
                            ? colors.danger
                            : colors.primaryLight
                        }
                      ]}
                    >
                      {isPresentToday
                        ? '✓ Present Today'
                        : isAbsentToday
                        ? '❌ Absent Today'
                        : '📋 Sessions Marked'}
                    </Text>
                  </View>
                </View>

                {pendingFeeAmount > 0 && (
                  <View style={styles.feeWarning}>
                    <AlertTriangle size={13} color={colors.danger} />
                    <Text style={styles.feeWarningText}>
                      Fee Due: ₹{pendingFeeAmount}
                      {feeDueDate ? ` (Due: ${new Date(feeDueDate).toLocaleDateString()})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.sectionHeaderRow}>
              <Sparkles size={18} color={colors.primaryLight} />
              <Text style={styles.sectionTitle}>Parent Quick Portal Actions</Text>
            </View>

            <View style={styles.actionsGrid}>
              {quickActions.map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.actionCard, shadows.sm]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate(action.screen, { studentId: activeId })}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                      <ActionIcon size={22} color={action.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionName}>{action.name}</Text>
                      <Text style={styles.actionSub}>Access details →</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Multi-Child Quick Switch Section */}
            {childrenSummary.length > 1 && (
              <View style={styles.multiChildSection}>
                <View style={styles.sectionHeaderRow}>
                  <Users size={18} color={colors.primaryLight} />
                  <Text style={styles.sectionTitle}>All Linked Children</Text>
                </View>

                {childrenSummary.map((child, i) => {
                  const isCur = String(child.studentId || child.id) === String(activeId);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.childItemCard,
                        isCur && styles.childItemCardActive,
                        shadows.sm
                      ]}
                      onPress={() => setSelectedChildId(String(child.studentId || child.id))}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isCur ? (colors.gradientPrimary || ['#6366f1', '#8b5cf6']) : ['#334155', '#475569']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.childItemAvatar}
                      >
                        <Text style={styles.childItemAvatarText}>
                          {(child.name || 'C').charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.childItemName, isCur && { color: colors.primaryLight }]}>
                          {child.name}
                        </Text>
                        <Text style={styles.childItemMeta}>
                          {child.classInfo?.className || child.classInfo?.name || 'Class Student'} • Sec {child.section || 'A'}
                        </Text>
                      </View>

                      <View style={styles.childItemRate}>
                        <Text
                          style={[
                            styles.childItemRateVal,
                            { color: parseFloat(child.attendancePercentage) >= 75 ? colors.success : colors.danger }
                          ]}
                        >
                          {child.attendancePercentage || '0'}%
                        </Text>
                        <Text style={styles.childItemRateSub}>Attendance</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.md,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptyDesc: {
    ...typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  profileCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  largeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  largeAvatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  nameRow: {
    marginBottom: 4,
  },
  studentName: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  classBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: radius.full,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  attendanceBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  attendanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusStrip: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  todayStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  feeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.sm,
  },
  feeWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  actionsGrid: {
    gap: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  actionSub: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  multiChildSection: {
    marginTop: spacing.lg,
  },
  childItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  childItemCardActive: {
    borderColor: 'rgba(99, 102, 241, 0.5)',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  childItemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childItemAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  childItemName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  childItemMeta: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childItemRate: {
    alignItems: 'flex-end',
  },
  childItemRateVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  childItemRateSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
});

export default ParentDashboardScreen;
