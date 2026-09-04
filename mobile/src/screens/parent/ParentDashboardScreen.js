import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  Users, DollarSign, MessageSquare, BookOpen, BarChart2,
  ChevronRight, CalendarCheck, CalendarX, Clock, Calendar, Award
} from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const MiniRing = ({ pct }) => {
  const color = pct >= 90 ? colors.success : pct >= 75 ? colors.warning : colors.danger;
  const r = 32, stroke = 7;
  const nr = r - stroke / 2;
  const circ = 2 * Math.PI * nr;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={r * 2} height={r * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={r} cy={r} r={nr} stroke={colors.bgElevated} strokeWidth={stroke} fill="none" />
        <Circle cx={r} cy={r} r={nr} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 10, fontWeight: '700', color }}>
        {Math.round(pct)}%
      </Text>
    </View>
  );
};

const ChildCard = ({ child, onPress }) => {
  const pct = parseFloat(child.attendancePercentage) || 0;
  const feeStatus = child.feeInfo?.status || 'unknown';
  const feeColor = feeStatus === 'paid' ? colors.success : feeStatus === 'partial' ? colors.warning : colors.danger;

  return (
    <TouchableOpacity style={[styles.childCard, shadows.sm]} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={colors.gradientParent} style={styles.childGradient}>
        <MiniRing pct={pct} />
      </LinearGradient>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childMeta}>
          {child.classInfo?.className || '—'} {child.section ? `• ${child.section}` : ''}
        </Text>
        <Text style={styles.childRoll}>Roll: {child.rollNumber || '—'}</Text>
      </View>
      <View style={styles.childStats}>
        <View style={[styles.feeStatusBadge, { backgroundColor: feeColor + '22' }]}>
          <Text style={[styles.feeStatusText, { color: feeColor }]}>
            {feeStatus.charAt(0).toUpperCase() + feeStatus.slice(1)}
          </Text>
        </View>
        <Text style={styles.childPending}>
          {child.pendingAssignmentsCount || 0} pending
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ParentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/parent/student-summary');
      setChildren(Array.isArray(data) ? data : [data]);
    } catch (err) {
      console.error('Parent dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  if (loading) return <FullPageLoader message="Loading your children's data..." />;

  const quickActions = [
    { label: 'Assignments', icon: BookOpen, screen: 'ParentAssignments', color: colors.student },
    { label: 'Timetable', icon: Calendar, screen: 'ParentTimetable', color: colors.primary },
    { label: 'Exam Results', icon: Award, screen: 'ParentResults', color: colors.teacher },
    { label: 'Leave Requests', icon: CalendarX, screen: 'ParentLeave', color: colors.warning },
    { label: 'Messages', icon: MessageSquare, screen: 'Messages', color: colors.parent },
    { label: 'Fee Invoices', icon: DollarSign, screen: 'Fees', color: colors.success },
  ];

  const totalPresent = children.reduce((sum, c) => sum + (c.presentClasses || 0), 0);
  const totalClasses = children.reduce((sum, c) => sum + (c.totalClasses || 0), 0);
  const pendingFees = children.filter(c => c.feeInfo?.status !== 'paid').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={`Hello, ${user?.name?.split(' ')[0] || 'Parent'} 👋`} subtitle="Children's overview" navigation={navigation} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
      >
        {/* Summary stats */}
        <View style={styles.statsGrid}>
          <StatCard icon={Users} label="Children" value={children.length} color={colors.parent} gradient={[colors.parent + 'CC', colors.parent + '22']} style={styles.statCard} />
          <StatCard icon={CalendarCheck} label="Attended" value={totalClasses > 0 ? `${Math.round((totalPresent / totalClasses) * 100)}%` : '—'} color={colors.success} gradient={[colors.success + 'CC', colors.success + '22']} style={styles.statCard} />
          <StatCard icon={DollarSign} label="Fee Pending" value={pendingFees} color={pendingFees > 0 ? colors.warning : colors.success} gradient={[(pendingFees > 0 ? colors.warning : colors.success) + 'CC', (pendingFees > 0 ? colors.warning : colors.success) + '22']} style={styles.statCard} />
          <StatCard icon={MessageSquare} label="Messages" value="—" color={colors.primary} gradient={[colors.primary + 'CC', colors.primary + '22']} style={styles.statCard} />
        </View>

        {/* Children Cards */}
        <Text style={styles.sectionTitle}>My Children</Text>
        {children.length === 0 ? (
          <View style={styles.empty}>
            <Users size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No children linked to your account</Text>
          </View>
        ) : (
          children.map((child, i) => (
            <ChildCard
              key={i}
              child={child}
              onPress={() => navigation.navigate('Attendance', { studentId: child.studentId })}
            />
          ))
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickCard, shadows.sm]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '22' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
              <ChevronRight size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { minWidth: '47%', maxWidth: '47%' },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    overflow: 'hidden', marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  childGradient: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  childInfo: { flex: 1 },
  childName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  childMeta: { ...typography.sm, color: colors.textSecondary, marginTop: 2 },
  childRoll: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  childStats: { alignItems: 'flex-end', paddingRight: spacing.md, gap: 4 },
  feeStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  feeStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  childPending: { ...typography.xs, color: colors.textMuted },
  quickGrid: { gap: spacing.xs },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  quickIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted, textAlign: 'center' },
});

export default ParentDashboardScreen;
