import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, UserCheck, School, BookOpen, Activity, Shield, TrendingUp, Clock, Award, Key, CalendarCheck } from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader, CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const statItems = [
    { icon: Users, label: 'Total Students', value: stats?.totalStudents ?? '—', color: colors.student, gradient: [colors.student + 'CC', colors.student + '22'] },
    { icon: UserCheck, label: 'Total Teachers', value: stats?.totalTeachers ?? '—', color: colors.teacher, gradient: [colors.teacher + 'CC', colors.teacher + '22'] },
    { icon: School, label: 'Total Classes', value: stats?.totalClasses ?? '—', color: colors.primary, gradient: [colors.primary + 'CC', colors.primary + '22'] },
    { icon: BookOpen, label: 'Total Subjects', value: stats?.totalSubjects ?? '—', color: colors.secondary, gradient: [colors.secondary + 'CC', colors.secondary + '22'] },
  ];

  const quickActions = [
    { label: 'Subjects & Allocations', icon: BookOpen, color: colors.secondary, screen: 'SubjectManage' },
    { label: 'Quiz Arena Admin', icon: Award, color: colors.student, screen: 'AdminQuizManage' },
    { label: 'Faculty Attendance', icon: CalendarCheck, color: colors.teacher, screen: 'TeacherAttendance' },
    { label: 'System Audit Logs', icon: Activity, color: colors.primary, screen: 'SystemActivity' },
    { label: 'Role Permissions', icon: Shield, color: colors.warning, screen: 'Permissions' },
  ];

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
                  <Text style={styles.activityTime}>
                    {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
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
});

export default AdminDashboardScreen;
