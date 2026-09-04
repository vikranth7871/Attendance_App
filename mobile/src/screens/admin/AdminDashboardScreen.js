import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Users, UserCheck, School, BookOpen, Activity, Shield,
  TrendingUp, Clock, Award, Key, CalendarCheck, Calendar,
  ChevronRight, Sparkles, Trophy
} from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader, CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotTab, setSnapshotTab] = useState('students'); // 'students' | 'teachers'

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/dashboard-stats');
      setStats(data);
    } catch (err) {
      console.error('Admin stats error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  if (loading) return <FullPageLoader message="Loading system overview..." />;

  const totalStudents = stats?.counts?.students ?? stats?.totalStudents ?? '—';
  const totalTeachers = stats?.counts?.teachers ?? stats?.totalTeachers ?? '—';
  const totalClasses = stats?.counts?.classes ?? stats?.totalClasses ?? '—';
  const totalSubjects = stats?.counts?.subjects ?? stats?.totalSubjects ?? '—';

  const statItems = [
    { icon: Users, label: 'Total Students', value: stats?.totalStudents ?? '—', color: colors.student, gradient: [colors.student + 'CC', colors.student + '22'] },
    { icon: UserCheck, label: 'Total Teachers', value: stats?.totalTeachers ?? '—', color: colors.teacher, gradient: [colors.teacher + 'CC', colors.teacher + '22'] },
    { icon: School, label: 'Total Classes', value: stats?.totalClasses ?? '—', color: colors.primary, gradient: [colors.primary + 'CC', colors.primary + '22'] },
    { icon: BookOpen, label: 'Total Subjects', value: stats?.totalSubjects ?? '—', color: colors.secondary, gradient: [colors.secondary + 'CC', colors.secondary + '22'] },
    { icon: Users, label: 'Total Students', value: totalStudents, color: colors.student, gradient: [colors.student + 'CC', colors.student + '22'] },
    { icon: UserCheck, label: 'Total Teachers', value: totalTeachers, color: colors.teacher, gradient: [colors.teacher + 'CC', colors.teacher + '22'] },
    { icon: School, label: 'Total Classes', value: totalClasses, color: colors.primary, gradient: [colors.primary + 'CC', colors.primary + '22'] },
    { icon: BookOpen, label: 'Total Subjects', value: totalSubjects, color: colors.secondary, gradient: [colors.secondary + 'CC', colors.secondary + '22'] },
  ];

  const quickActions = [
    { label: 'Timetable & Allocations', icon: Calendar, color: colors.primary, screen: 'Assignments' },
    { label: 'Subjects & Allocations', icon: BookOpen, color: colors.secondary, screen: 'SubjectManage' },
    { label: 'Quiz Arena Admin', icon: Award, color: colors.student, screen: 'AdminQuizManage' },
    { label: 'Faculty Attendance', icon: CalendarCheck, color: colors.teacher, screen: 'TeacherAttendance' },
    { label: 'System Audit Logs', icon: Activity, color: colors.primary, screen: 'SystemActivity' },
    { label: 'Role Permissions', icon: Shield, color: colors.warning, screen: 'Permissions' },
  ];

  // Snapshot calculations
  const activeSnapshot = snapshotTab === 'students' ? stats?.todayAttendance : stats?.teacherAttendance;
  const snapPresent = activeSnapshot?.present ?? 0;
  const snapAbsent = activeSnapshot?.absent ?? 0;
  const snapLeave = activeSnapshot?.leave ?? 0;
  const snapTotal = Math.max(activeSnapshot?.total ?? (snapPresent + snapAbsent + snapLeave), snapPresent + snapAbsent + snapLeave, 1);

  const pctPresent = (snapPresent / snapTotal) * 100;
  const pctAbsent = (snapAbsent / snapTotal) * 100;
  const pctLeave = (snapLeave / snapTotal) * 100;

  // Donut SVG parameters
  const donutR = 48;
  const donutStroke = 10;
  const donutCircumference = 2 * Math.PI * donutR;
  const presentDash = (pctPresent / 100) * donutCircumference;
  const absentDash = (pctAbsent / 100) * donutCircumference;
  const leaveDash = (pctLeave / 100) * donutCircumference;

  // Teachers Leaderboard
  const teachersList = stats?.teacherPerformance || [];
  const topTeacher = teachersList[0];
  const otherTeachers = teachersList.slice(1, 5);
  const maxTeacherMarking = Math.max(...teachersList.map(t => t.markingCount || 0), 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Admin Dashboard" subtitle="System Overview" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>System Statistics</Text>
        <View style={styles.statsGrid}>
          {statItems.map((item, i) => (
            <StatCard
              key={i}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
              gradient={item.gradient}
              style={styles.statCard}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Management</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.quickCard, shadows.sm]}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: action.color + '22' }]}>
                  <Icon size={18} color={action.color} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Today's Attendance Snapshot (Dual View) */}
        <View style={[styles.snapshotCard, shadows.sm]}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotTitleRow}>
              <TrendingUp size={18} color={colors.primary} />
              <Text style={styles.snapshotTitle}>Today's Attendance</Text>
            </View>
            <View style={styles.snapshotToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, snapshotTab === 'students' && styles.toggleBtnActive]}
                onPress={() => setSnapshotTab('students')}
              >
                <Text style={[styles.toggleBtnText, snapshotTab === 'students' && styles.toggleBtnTextActive]}>
                  Students
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, snapshotTab === 'teachers' && styles.toggleBtnActive]}
                onPress={() => setSnapshotTab('teachers')}
              >
                <Text style={[styles.toggleBtnText, snapshotTab === 'teachers' && styles.toggleBtnTextActive]}>
                  Faculty
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SVG Donut Ring */}
          <View style={styles.donutWrapper}>
            <Svg width={128} height={128} viewBox="0 0 128 128">
              {/* Background ring */}
              <Circle
                cx="64"
                cy="64"
                r={donutR}
                stroke={colors.border}
                strokeWidth={donutStroke}
                fill="none"
              />
              {/* Present segment (Green) */}
              {pctPresent > 0 && (
                <Circle
                  cx="64"
                  cy="64"
                  r={donutR}
                  stroke={colors.success}
                  strokeWidth={donutStroke}
                  fill="none"
                  strokeDasharray={`${presentDash} ${donutCircumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  rotation="-90"
                  originX="64"
                  originY="64"
                />
              )}
              {/* Absent segment (Red) */}
              {pctAbsent > 0 && (
                <Circle
                  cx="64"
                  cy="64"
                  r={donutR}
                  stroke={colors.danger}
                  strokeWidth={donutStroke}
                  fill="none"
                  strokeDasharray={`${absentDash} ${donutCircumference}`}
                  strokeDashoffset={-presentDash}
                  strokeLinecap="round"
                  rotation="-90"
                  originX="64"
                  originY="64"
                />
              )}
              {/* On Leave segment (Amber) */}
              {pctLeave > 0 && (
                <Circle
                  cx="64"
                  cy="64"
                  r={donutR}
                  stroke={colors.warning}
                  strokeWidth={donutStroke}
                  fill="none"
                  strokeDasharray={`${leaveDash} ${donutCircumference}`}
                  strokeDashoffset={-(presentDash + absentDash)}
                  strokeLinecap="round"
                  rotation="-90"
                  originX="64"
                  originY="64"
                />
              )}
            </Svg>
            <View style={styles.donutCenter}>
              <Text style={styles.donutPct}>{pctPresent.toFixed(1)}%</Text>
              <Text style={styles.donutLabel}>TURNOUT</Text>
            </View>
          </View>

          {/* Status Breakdown 3-Grid */}
          <View style={styles.snapMetricsRow}>
            <View style={[styles.snapMetricBox, { borderColor: colors.success + '44', backgroundColor: colors.success + '12' }]}>
              <Text style={[styles.snapMetricLabel, { color: colors.success }]}>Present</Text>
              <Text style={[styles.snapMetricValue, { color: colors.success }]}>{snapPresent}</Text>
              <Text style={styles.snapMetricPct}>{pctPresent.toFixed(0)}%</Text>
            </View>
            <View style={[styles.snapMetricBox, { borderColor: colors.danger + '44', backgroundColor: colors.danger + '12' }]}>
              <Text style={[styles.snapMetricLabel, { color: colors.danger }]}>Absent</Text>
              <Text style={[styles.snapMetricValue, { color: colors.danger }]}>{snapAbsent}</Text>
              <Text style={styles.snapMetricPct}>{pctAbsent.toFixed(0)}%</Text>
            </View>
            <View style={[styles.snapMetricBox, { borderColor: colors.warning + '44', backgroundColor: colors.warning + '12' }]}>
              <Text style={[styles.snapMetricLabel, { color: colors.warning }]}>On Leave</Text>
              <Text style={[styles.snapMetricValue, { color: colors.warning }]}>{snapLeave}</Text>
              <Text style={styles.snapMetricPct}>{pctLeave.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        {/* Teacher Performance Leaderboard */}
        {teachersList.length > 0 && (
          <View style={[styles.leaderboardCard, shadows.sm]}>
            <View style={styles.leaderboardHeader}>
              <View style={styles.snapshotTitleRow}>
                <Trophy size={18} color={colors.secondary} />
                <Text style={styles.snapshotTitle}>Faculty Leaderboard</Text>
              </View>
              <View style={styles.topPerformersBadge}>
                <Sparkles size={12} color={colors.primary} />
                <Text style={styles.topPerformersText}>Top Activity</Text>
              </View>
            </View>

            {/* #1 Hero Teacher Card */}
            {topTeacher && (
              <View style={styles.heroTeacherCard}>
                <View style={styles.heroTeacherTop}>
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarText}>
                      {(topTeacher.name || 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.heroTeacherInfo}>
                    <View style={styles.heroRankRow}>
                      <View style={styles.rankOneBadge}>
                        <Text style={styles.rankOneText}>#1 PERFORMER</Text>
                      </View>
                    </View>
                    <Text style={styles.heroTeacherName}>{topTeacher.name}</Text>
                    <Text style={styles.heroTeacherDept}>{topTeacher.department}</Text>
                  </View>
                  <View style={styles.heroScoreBox}>
                    <Text style={styles.heroScoreNum}>{topTeacher.markingCount}</Text>
                    <Text style={styles.heroScoreLabel}>Pts</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.round(((topTeacher.markingCount || 0) / maxTeacherMarking) * 100))}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Ranks 2-5 Mini Cards */}
            {otherTeachers.map((teacher, idx) => (
              <View key={idx} style={styles.otherTeacherRow}>
                <View style={styles.otherRankBadge}>
                  <Text style={styles.otherRankText}>#{idx + 2}</Text>
                </View>
                <View style={styles.otherTeacherInfo}>
                  <Text style={styles.otherTeacherName}>{teacher.name}</Text>
                  <Text style={styles.otherTeacherDept}>{teacher.department}</Text>
                </View>
                <Text style={styles.otherScoreText}>{teacher.markingCount} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activities */}
        {stats?.recentActivities?.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SystemActivity')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {stats.recentActivities.slice(0, 6).map((activity, i) => (
              <View key={i} style={[styles.activityItem, shadows.sm]}>
                <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.description || activity.action}</Text>
                  <Text style={styles.activityText}>
                    {activity.studentId?.name ? `${activity.studentId.name} • ${activity.subjectId?.subjectName || ''}` : (activity.description || activity.action)}
                  </Text>
                  <Text style={styles.activityTime}>
                    {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                    {activity.createdAt || activity.created_at ? new Date(activity.createdAt || activity.created_at).toLocaleString() : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Pending Leaves */}
        {stats?.pendingLeaves > 0 && (
          <TouchableOpacity
            style={[styles.alertCard, shadows.sm]}
            onPress={() => navigation.navigate('Leaves')}
          >
            <Clock size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              <Text style={styles.alertCount}>{stats.pendingLeaves}</Text> pending leave request{stats.pendingLeaves !== 1 ? 's' : ''} awaiting approval
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  sectionTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    minWidth: '47%',
    maxWidth: '47%',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  activityContent: { flex: 1 },
  activityText: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  activityTime: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '18',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '33',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  alertText: {
    ...typography.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  alertCount: {
    ...typography.bold,
    color: colors.warning,
  },
  // Quick Actions Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    ...typography.xs,
    ...typography.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  viewAllText: {
    ...typography.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  // Attendance Snapshot
  snapshotCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  snapshotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  snapshotTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  snapshotToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPct: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  snapMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  snapMetricBox: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  snapMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  snapMetricValue: {
    ...typography.base,
    ...typography.bold,
    marginTop: 2,
  },
  snapMetricPct: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  // Teacher Leaderboard
  leaderboardCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  topPerformersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  topPerformersText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },
  heroTeacherCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginBottom: spacing.sm,
  },
  heroTeacherTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    ...typography.base,
    ...typography.bold,
    color: '#fff',
  },
  heroTeacherInfo: {
    flex: 1,
  },
  heroRankRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  rankOneBadge: {
    backgroundColor: colors.secondary + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  rankOneText: {
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTeacherName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  heroTeacherDept: {
    ...typography.xs,
    color: colors.textMuted,
  },
  heroScoreBox: {
    alignItems: 'center',
    paddingLeft: spacing.sm,
  },
  heroScoreNum: {
    ...typography.base,
    ...typography.bold,
    color: colors.primary,
  },
  heroScoreLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  otherTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
    gap: spacing.sm,
  },
  otherRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherRankText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  otherTeacherInfo: {
    flex: 1,
  },
  otherTeacherName: {
    ...typography.xs,
    ...typography.bold,
    color: colors.textPrimary,
  },
  otherTeacherDept: {
    fontSize: 10,
    color: colors.textMuted,
  },
  otherScoreText: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});

export default AdminDashboardScreen;
